import { Express, Request, Response, NextFunction } from "express";
import multer from 'multer';
import { extractTextFromFile } from './api/documentParser';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Register all routes
export async function registerRoutes(app: Express): Promise<Express> {
  // Catch-all error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Express error:", err);
    res.status(500).json({ error: err.message || "An unknown error occurred" });
  });

  // API status check
  app.get("/api/check-api", async (_req: Request, res: Response) => {
    const status = {
      status: "operational",
      api_keys: {
        openai: process.env.OPENAI_API_KEY ? "configured" : "missing",
        anthropic: process.env.ANTHROPIC_API_KEY ? "configured" : "missing",
        perplexity: process.env.PERPLEXITY_API_KEY ? "configured" : "missing",
      }
    };
    
    console.log("API Status Check:", { 
      openai: process.env.OPENAI_API_KEY ? "✓" : "✗",
      anthropic: process.env.ANTHROPIC_API_KEY ? "✓" : "✗",
      perplexity: process.env.PERPLEXITY_API_KEY ? "✓" : "✗"
    });
    
    res.json(status);
  });

  // Extract text from uploaded file
  app.post("/api/extract-text", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Get text based on file type
      const result = await extractTextFromFile(file);
      
      // Make sure we're using UTF-8 encoding to handle special characters properly
      if (typeof result.content !== 'string') {
        return res.status(500).json({ error: "Invalid content type" });
      }
      
      console.log(`Extracted ${result.content.length} characters from ${file.originalname}`);
      
      // Return the proper UTF-8 encoded text
      return res.json({
        content: result.content,
        filename: file.originalname,
        mimeType: file.mimetype
      });
    } catch (error: any) {
      console.error("Error extracting text:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to extract text from file" 
      });
    }
  });

  // PURE COGNITIVE PROFILER - Analyze a document
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { content, provider = "openai" } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Text content is required" });
      }
      
      // Import the pure cognitive profiler functions
      const { 
        profileWithOpenAI, 
        profileWithClaude, 
        profileWithPerplexity 
      } = await import('./api/pureCognitiveProfiler');
      
      // Pure passthrough to AI model with no intermediate logic
      let profileResult: string;
      
      console.log(`PURE COGNITIVE PROFILER USING ${provider.toUpperCase()}`);
      
      // Call the appropriate profiling function
      switch (provider.toLowerCase()) {
        case 'anthropic':
          profileResult = await profileWithClaude(content);
          break;
        case 'perplexity':
          profileResult = await profileWithPerplexity(content);
          break;
        default:
          profileResult = await profileWithOpenAI(content);
          break;
      }
      
      // Return the raw result with no modifications
      return res.json({
        formattedReport: profileResult,
        provider: provider
      });
    } catch (error: any) {
      console.error("Error in cognitive profiler:", error);
      return res.status(500).json({ 
        error: true,
        formattedReport: `Error in cognitive profiler: ${error.message || "Unknown error"}`,
        provider: "error"
      });
    }
  });

  // PURE COGNITIVE PROFILER - Compare two documents
  app.post("/api/compare", async (req: Request, res: Response) => {
    try {
      const { documentA, documentB, provider = "openai" } = req.body;
      
      if (!documentA || !documentB) {
        return res.status(400).json({ error: "Both documents are required for comparison" });
      }
      
      // Import the pure cognitive comparison function
      const { compareProfiles } = await import('./api/pureCognitiveProfiler');
      
      console.log(`PURE COGNITIVE PROFILE COMPARISON USING ${provider.toUpperCase()}`);
      
      // Call profile comparison with no intermediate logic
      const comparisonResult = await compareProfiles(documentA, documentB, provider);
      
      // Return the raw result with no modifications
      return res.json({
        comparisonResult: comparisonResult,
        provider: provider
      });
    } catch (error: any) {
      console.error("Error in cognitive comparison:", error);
      return res.status(500).json({ 
        error: true,
        comparisonResult: `Error in cognitive comparison: ${error.message || "Unknown error"}`,
        provider: "error"
      });
    }
  });

  // Simple email sharing
  app.post("/api/share-simple-email", async (req: Request, res: Response) => {
    try {
      const { 
        recipientEmail, 
        senderEmail, 
        senderName,
        subject, 
        content 
      } = req.body;
      
      if (!recipientEmail || !content) {
        return res.status(400).json({ 
          success: false, 
          message: "Recipient email and content are required" 
        });
      }
      
      // Import SendGrid API
      const sgMail = require('@sendgrid/mail');
      
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          message: "SendGrid API key not configured" 
        });
      }
      
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      // Format the email
      const sender = senderEmail || process.env.SENDGRID_VERIFIED_SENDER;
      
      if (!sender) {
        return res.status(500).json({ 
          success: false, 
          message: "No sender email provided or configured" 
        });
      }
      
      const formattedSender = senderName ? `${senderName} <${sender}>` : sender;
      
      // Create simple HTML email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #2563eb; margin-bottom: 20px; }
            .content { white-space: pre-wrap; padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; margin-top: 20px; font-family: Georgia, serif; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 0.8em; color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>Cognitive Intelligence Profile</h1>
          <p>Below is the cognitive profile analysis you requested:</p>
          <div class="content">${content.replace(/\n/g, '<br>')}</div>
          <div class="footer">
            <p>This report was generated on ${new Date().toLocaleString()}.</p>
            <p>Cognitive Profiler - Understanding the mind behind the text</p>
          </div>
        </body>
        </html>
      `;
      
      // Send the email
      const msg = {
        to: recipientEmail,
        from: formattedSender,
        subject: subject || "Cognitive Profile Analysis",
        text: content,
        html: emailHtml
      };
      
      await sgMail.send(msg);
      
      return res.json({ 
        success: true, 
        message: "Email sent successfully" 
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      
      // Extract error details
      let errorMessage = "Unknown error";
      if (error.response && error.response.body && error.response.body.errors) {
        errorMessage = error.response.body.errors[0].message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return res.status(500).json({ 
        success: false, 
        message: `Failed to send email: ${errorMessage}` 
      });
    }
  });

  return app;
}