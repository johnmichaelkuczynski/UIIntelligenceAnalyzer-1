import { Express, Request, Response, NextFunction } from "express";
import multer from 'multer';
import path from 'path';
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
    
    console.log("API Status Check:", status.api_keys);
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
      
      console.log(`Extracted ${result.content.length} characters from ${file.originalname}`);
      return res.json(result);
    } catch (error: any) {
      console.error("Error extracting text:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to extract text from file" 
      });
    }
  });

  // PURE PASSTHROUGH - Analyze document intelligence
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      // Extract request data
      const { document, provider = "openai" } = req.body;
      
      // Validate input
      if (!document || !document.content) {
        return res.status(400).json({ error: "Document content is required" });
      }

      // Import the pure passthrough module
      const { 
        openaiPassthrough, 
        anthropicPassthrough, 
        perplexityPassthrough 
      } = await import('./api/purePassthrough');
      
      // Execute the appropriate pure passthrough
      let profileResult: string;
      
      console.log(`PURE PASSTHROUGH ANALYSIS WITH ${provider.toUpperCase()}`);
      
      switch (provider.toLowerCase()) {
        case 'anthropic':
          profileResult = await anthropicPassthrough(document.content);
          break;
        case 'perplexity':
          profileResult = await perplexityPassthrough(document.content);
          break;
        default:
          profileResult = await openaiPassthrough(document.content);
          break;
      }
      
      // Return the pure, unmodified response
      return res.json({
        provider: provider,
        formattedReport: profileResult
      });
    } catch (error: any) {
      console.error("Error in analysis route:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Analysis failed",
        formattedReport: `Error: ${error.message || "Analysis failed"}`
      });
    }
  });

  // PURE PASSTHROUGH - Compare two documents
  app.post("/api/compare", async (req: Request, res: Response) => {
    try {
      // Extract request data
      const { documentA, documentB, provider = "openai" } = req.body;
      
      // Validate input
      if (!documentA || !documentB) {
        return res.status(400).json({ error: "Both documents are required for comparison" });
      }
      
      // Import the pure passthrough comparison function
      const { comparePassthrough } = await import('./api/purePassthrough');
      
      // Execute the pure passthrough comparison
      console.log(`PURE PASSTHROUGH COMPARISON WITH ${provider.toUpperCase()}`);
      
      const comparisonResult = await comparePassthrough(documentA, documentB, provider);
      
      // Return the pure, unmodified comparison
      return res.json({
        provider: provider,
        comparisonResult: comparisonResult
      });
    } catch (error: any) {
      console.error("Error in comparison route:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Comparison failed" 
      });
    }
  });

  // Share analysis via email
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
      
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || "Unknown error";
      
      return res.status(500).json({ 
        success: false, 
        message: `Failed to send email: ${errorMessage}` 
      });
    }
  });

  return app;
}