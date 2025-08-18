import { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage } from "./storage";
import path from "path";
import { extractTextFromFile } from "./api/documentParser";
import { sendSimpleEmail } from "./api/simpleEmailService";
import { upload as speechUpload, processSpeechToText } from "./api/simpleSpeechToText";
import { StructuralEvaluator } from "./services/structuralEvaluator";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

interface DocumentInput {
  content: string;
  filename?: string;
  mimeType?: string;
  metadata?: {
    pageCount?: number;
    info?: Record<string, any>;
    version?: string;
    [key: string]: any;
  };
}

interface AIDetectionResult {
  isAI: boolean;
  probability: number;
}

export async function registerRoutes(app: Express): Promise<Express> {
  
  // API health check endpoint
  app.get("/api/check-api", async (_req: Request, res: Response) => {
    const openai_key = process.env.OPENAI_API_KEY;
    const anthropic_key = process.env.ANTHROPIC_API_KEY;
    const perplexity_key = process.env.PERPLEXITY_API_KEY;
    const deepseek_key = process.env.DEEPSEEK_API_KEY;
    const mathpix_app_id = process.env.MATHPIX_APP_ID;
    const mathpix_app_key = process.env.MATHPIX_APP_KEY;
    
    // Check API keys
    res.json({
      status: "operational",
      api_keys: {
        openai: openai_key ? "configured" : "missing",
        anthropic: anthropic_key ? "configured" : "missing",
        perplexity: perplexity_key ? "configured" : "missing",
        deepseek: deepseek_key ? "configured" : "missing",
        mathpix: (mathpix_app_id && mathpix_app_key) ? "configured" : "missing"
      }
    });
    
    // Log API status for monitoring
    console.log("API Status Check:", { 
      openai: openai_key ? "✓" : "✗", 
      anthropic: anthropic_key ? "✓" : "✗", 
      perplexity: perplexity_key ? "✓" : "✗",
      deepseek: deepseek_key ? "✓" : "✗",
      mathpix: (mathpix_app_id && mathpix_app_key) ? "✓" : "✗"
    });
  });

  // Cognitive evaluation endpoint with tiered analysis
  app.post("/api/cognitive-evaluate", async (req: Request, res: Response) => {
    try {
      const { content, tier = 'standard', overrides = {} } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ 
          error: "Content is required and must be a string" 
        });
      }

      // Use structural evaluator instead of broken statistical proxies
      const evaluator = new StructuralEvaluator();

      console.log(`STRUCTURAL EVALUATION: Analyzing ${content.length} characters with structural logic (not statistical proxies)`);
      
      const evaluation = await evaluator.evaluate(content);

      res.json({
        success: true,
        evaluation: {
          ...evaluation,
          metadata: {
            contentLength: content.length,
            evaluationType: 'structural',
            timestamp: new Date().toISOString()
          }
        }
      });

    } catch (error: any) {
      console.error("Error in cognitive evaluation:", error);
      res.status(500).json({
        success: false,
        error: "Cognitive evaluation failed",
        details: error.message
      });
    }
  });
  
  // Extract text from uploaded document
  app.post("/api/extract-text", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file && !req.body.content) {
        return res.status(400).json({ error: "No file or content provided" });
      }
      
      // Direct content input
      if (req.body.content) {
        return res.json({
          content: req.body.content,
          filename: req.body.filename || "direct-input.txt",
          mimeType: "text/plain",
          metadata: {}
        });
      }
      
      // Process uploaded file
      const result = await extractTextFromFile(req.file!);
      return res.json(result);
    } catch (error: any) {
      console.error("Error extracting text:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to extract text from document"
      });
    }
  });
  
  // Check if text is AI-generated
  app.post("/api/check-ai", async (req: Request, res: Response) => {
    try {
      const document: DocumentInput = req.body;
      
      if (!document || !document.content) {
        return res.status(400).json({ error: "Document content is required" });
      }

      // Import the AI detection method
      const { checkForAI } = await import('./api/gptZero');
      
      // Check for AI using the selected service
      console.log("DETECTING AI CONTENT");
      const result = await checkForAI(document);
      return res.json(result);
    } catch (error: any) {
      console.error("Error checking for AI:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to check for AI"
      });
    }
  });
  
  // Analyze document
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { content, provider = "all", requireProgress = false } = req.body;
      
      if (!content) {
        return res.status(400).json({ 
          error: true, 
          message: "Document content is required",
          formattedReport: "Error: Document content is required",
          provider: provider
        });
      }
      
      // If the user requests a specific single provider
      if (provider.toLowerCase() !== 'all') {
        // Use the strict 3-phase intelligence protocol
        const { performStrictIntelligenceEvaluation } = await import('./services/strictIntelligenceProtocol');
        
        console.log(`STRICT 3-PHASE INTELLIGENCE EVALUATION WITH ${provider.toUpperCase()}`);
        
        try {
          const strictResult = await performStrictIntelligenceEvaluation(content, provider);
          
          // Convert to expected format
          const analysisResult = {
            id: 0,
            documentId: 0,
            provider: strictResult.provider,
            formattedReport: `**STRICT 3-PHASE INTELLIGENCE EVALUATION**\n\n**PHASE 1 ASSESSMENT:**\n${strictResult.phase1Response}\n\n**PHASE 2 ASSESSMENT:**\n${strictResult.phase2Response}\n\n**FINAL EVALUATION:**\n${strictResult.phase3Response || strictResult.phase2Response}\n\n**FINAL SCORE: ${strictResult.finalScore}/100**`,
            overallScore: strictResult.finalScore,
            surface: {
              grammar: Math.max(0, strictResult.finalScore - 10),
              structure: Math.max(0, strictResult.finalScore - 5),
              jargonUsage: Math.min(100, strictResult.finalScore + 5),
              surfaceFluency: strictResult.finalScore
            },
            deep: {
              conceptualDepth: strictResult.finalScore,
              inferentialContinuity: strictResult.finalScore,
              semanticCompression: strictResult.finalScore,
              logicalLaddering: strictResult.finalScore,
              originality: strictResult.finalScore
            }
          };
          
          return res.json(analysisResult);
        } catch (error: any) {
          console.error(`Error in strict intelligence evaluation with ${provider}:`, error);
          return res.status(200).json({
            id: 0,
            documentId: 0, 
            provider: `${provider} (Error)`,
            formattedReport: `Error analyzing document with strict 3-phase protocol using ${provider}: ${error.message || "Unknown error"}`,
            overallScore: 0,
            surface: { grammar: 0, structure: 0, jargonUsage: 0, surfaceFluency: 0 },
            deep: { conceptualDepth: 0, inferentialContinuity: 0, semanticCompression: 0, logicalLaddering: 0, originality: 0 },
            error: true
          });
        }
      } else {
        // For 'all' provider option, analyze with all providers and verify results
        try {
          // Import the analysis verifier
          const { analyzeWithAllProviders } = await import('./services/analysisVerifier');
          
          console.log("ANALYZING WITH ALL PROVIDERS AND VERIFICATION");
          const allResults = await analyzeWithAllProviders(content);
          
          // Format the response with results from all providers
          const result = {
            id: 0,
            documentId: 0,
            provider: "All Providers",
            formattedReport: "Analysis complete with all providers. See detailed results below.",
            analysisResults: allResults
          };
          
          return res.json(result);
        } catch (error: any) {
          console.error("Error analyzing with all providers:", error);
          return res.status(200).json({
            id: 0,
            documentId: 0,
            provider: "All Providers (Error)",
            formattedReport: `Error analyzing document with all providers: ${error.message || "Unknown error"}`
          });
        }
      }
    } catch (error: any) {
      console.error("Error analyzing document:", error);
      return res.status(500).json({ 
        error: true, 
        message: `Error analyzing document: ${error.message}`
      });
    }
  });
  
  // Compare two documents (case assessment style)
  app.post("/api/compare", async (req: Request, res: Response) => {
    try {
      const { documentA, documentB, provider = "openai" } = req.body;
      
      if (!documentA || !documentB) {
        return res.status(400).json({ error: "Both documents are required for comparison" });
      }
      
      // Import the document comparison service
      const { compareDocuments } = await import('./services/documentComparison');
      
      // Compare documents using the selected provider
      console.log(`COMPARING DOCUMENTS WITH ${provider.toUpperCase()}`);
      const result = await compareDocuments(documentA, documentB, provider);
      return res.json(result);
    } catch (error: any) {
      console.error("Error comparing documents:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to compare documents" 
      });
    }
  });

  // Intelligence comparison for two documents using strict 3-phase protocol
  app.post("/api/intelligence-compare", async (req: Request, res: Response) => {
    try {
      const { documentA, documentB, provider = "openai" } = req.body;
      
      if (!documentA || !documentB) {
        return res.status(400).json({ error: "Both documents are required for intelligence comparison" });
      }
      
      // Import the strict intelligence comparison service
      const { performStrictIntelligenceComparison } = await import('./services/strictIntelligenceProtocol');
      
      // Compare intelligence levels using the strict 3-phase protocol
      console.log(`STRICT 3-PHASE INTELLIGENCE COMPARISON WITH ${provider.toUpperCase()}`);
      const strictResult = await performStrictIntelligenceComparison(
        documentA.content || documentA, 
        documentB.content || documentB, 
        provider
      );
      
      // Convert to expected format for the frontend
      const result = {
        analysisA: {
          id: 0,
          documentId: 0,
          provider: strictResult.analysisA.provider,
          formattedReport: `**STRICT 3-PHASE INTELLIGENCE EVALUATION**\n\n**PHASE 1:**\n${strictResult.analysisA.phase1Response}\n\n**PHASE 2:**\n${strictResult.analysisA.phase2Response}\n\n**FINAL EVALUATION:**\n${strictResult.analysisA.phase3Response || strictResult.analysisA.phase2Response}\n\n**FINAL SCORE: ${strictResult.analysisA.finalScore}/100**`,
          overallScore: strictResult.analysisA.finalScore,
          surface: {
            grammar: Math.max(0, strictResult.analysisA.finalScore - 10),
            structure: Math.max(0, strictResult.analysisA.finalScore - 5),
            jargonUsage: Math.min(100, strictResult.analysisA.finalScore + 5),
            surfaceFluency: strictResult.analysisA.finalScore
          },
          deep: {
            conceptualDepth: strictResult.analysisA.finalScore,
            inferentialContinuity: strictResult.analysisA.finalScore,
            semanticCompression: strictResult.analysisA.finalScore,
            logicalLaddering: strictResult.analysisA.finalScore,
            originality: strictResult.analysisA.finalScore
          }
        },
        analysisB: {
          id: 1,
          documentId: 1,
          provider: strictResult.analysisB.provider,
          formattedReport: `**STRICT 3-PHASE INTELLIGENCE EVALUATION**\n\n**PHASE 1:**\n${strictResult.analysisB.phase1Response}\n\n**PHASE 2:**\n${strictResult.analysisB.phase2Response}\n\n**FINAL EVALUATION:**\n${strictResult.analysisB.phase3Response || strictResult.analysisB.phase2Response}\n\n**FINAL SCORE: ${strictResult.analysisB.finalScore}/100**`,
          overallScore: strictResult.analysisB.finalScore,
          surface: {
            grammar: Math.max(0, strictResult.analysisB.finalScore - 10),
            structure: Math.max(0, strictResult.analysisB.finalScore - 5),
            jargonUsage: Math.min(100, strictResult.analysisB.finalScore + 5),
            surfaceFluency: strictResult.analysisB.finalScore
          },
          deep: {
            conceptualDepth: strictResult.analysisB.finalScore,
            inferentialContinuity: strictResult.analysisB.finalScore,
            semanticCompression: strictResult.analysisB.finalScore,
            logicalLaddering: strictResult.analysisB.finalScore,
            originality: strictResult.analysisB.finalScore
          }
        },
        comparison: strictResult.comparison
      };
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error in strict intelligence comparison:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to perform strict intelligence comparison" 
      });
    }
  });
  
  // Share analysis via email
  app.post("/api/share-via-email", async (req: Request, res: Response) => {
    try {
      const { 
        recipientEmail, 
        senderEmail, 
        senderName,
        subject, 
        documentType, 
        analysisA,
        analysisB, 
        comparison,
        rewrittenAnalysis
      } = req.body;
      
      if (!recipientEmail || !subject || !analysisA) {
        return res.status(400).json({ error: "Recipient email, subject, and analysis are required" });
      }
      
      // Import the email service
      const { sendAnalysisEmail } = await import('./services/emailService');
      
      // Send email with the analysis
      console.log(`SENDING EMAIL TO ${recipientEmail}`);
      const result = await sendAnalysisEmail({
        recipientEmail,
        senderEmail,
        senderName,
        subject,
        documentType,
        analysisA,
        analysisB,
        comparison,
        rewrittenAnalysis
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error sending email:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to send email" 
      });
    }
  });
  
  // Get enhancement suggestions
  app.post("/api/get-enhancement-suggestions", async (req: Request, res: Response) => {
    try {
      const { text, provider = "openai" } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      // Import the enhancement suggestions service
      const { getEnhancementSuggestions } = await import('./api/enhancementSuggestions');
      
      // Get suggestions using the selected provider
      console.log(`GETTING ENHANCEMENT SUGGESTIONS FROM ${provider.toUpperCase()}`);
      const suggestions = await getEnhancementSuggestions(text, provider);
      return res.json(suggestions);
    } catch (error: any) {
      console.error("Error getting enhancement suggestions:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to get enhancement suggestions" 
      });
    }
  });
  
  // Google search
  app.post("/api/search-google", async (req: Request, res: Response) => {
    try {
      const { query, numResults = 5 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      // Import the Google search service
      const { searchGoogle } = await import('./api/googleSearch');
      
      // Search using Google Custom Search API
      console.log(`SEARCHING GOOGLE FOR: ${query}`);
      const results = await searchGoogle(query, numResults);
      return res.json(results);
    } catch (error: any) {
      console.error("Error searching Google:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to search Google" 
      });
    }
  });
  
  // Fetch content from URL
  app.post("/api/fetch-url-content", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      // Import the URL content fetcher
      const { fetchUrlContent } = await import('./api/googleSearch');
      
      // Fetch content from the URL
      console.log(`FETCHING CONTENT FROM: ${url}`);
      const content = await fetchUrlContent(url);
      
      if (!content) {
        return res.json({ 
          url, 
          success: false, 
          content: "Could not extract content from this URL" 
        });
      }
      
      return res.json({ url, success: true, content });
    } catch (error: any) {
      console.error("Error fetching URL content:", error);
      return res.status(500).json({ 
        url: req.body.url,
        success: false, 
        message: error.message || "Failed to fetch URL content" 
      });
    }
  });
  
  // Streaming rewrite endpoint
  app.post("/api/rewrite-stream", async (req: Request, res: Response) => {
    try {
      const { originalText, instructions, provider = "openai", mode = "hybrid" } = req.body;
      
      if (!originalText) {
        return res.status(400).json({ error: "Original text is required" });
      }
      
      if (!instructions) {
        return res.status(400).json({ error: "Instructions are required" });
      }
      
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Import the streaming rewrite service
      const { streamRewriteDocument } = await import('./services/documentRewrite');
      
      const enhancedOptions = {
        instruction: instructions,
        targetLevel: "advanced",
        mode: mode
      };
      
      console.log(`Starting STREAMING rewrite with ${provider}`);
      
      // Stream the rewrite with chunk callbacks
      await streamRewriteDocument(originalText, enhancedOptions, provider, (chunk: string, index: number, total: number) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk, index, total })}\n\n`);
      });
      
      res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      res.end();
      
    } catch (error: any) {
      console.error("Error streaming rewrite:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  });

  // Rewrite document
  app.post("/api/rewrite", async (req: Request, res: Response) => {
    try {
      const { originalText, instructions, options, provider = "openai", mode = "rewrite_existing" } = req.body;
      
      if (!originalText) {
        return res.status(400).json({ error: "Original text is required" });
      }
      
      // Support both old 'options.instruction' and new 'instructions' format
      const instruction = instructions || (options && options.instruction);
      if (!instruction) {
        return res.status(400).json({ error: "Rewrite instruction is required" });
      }
      
      // Import the document rewrite service
      const { rewriteDocument } = await import('./services/documentRewrite');
      
      // Create enhanced options object
      const enhancedOptions = {
        ...options,
        instruction,
        mode,
        preserveLength: options?.preserveLength !== false,
        preserveDepth: options?.preserveDepth !== false
      };
      
      // Log rewrite request
      console.log(`Starting enhanced rewrite with ${provider} in ${mode} mode`);
      console.log(`Text size: ${originalText.length} characters`);
      console.log(`Instruction: ${instruction}`);
      
      // Rewrite the document using the specified provider
      console.log(`ENHANCED ${provider.toUpperCase()} REWRITE - MODE: ${mode.toUpperCase()}`);
      const result = await rewriteDocument(originalText, enhancedOptions, provider);
      
      // Log completion
      console.log(`DIRECT PASSTHROUGH REWRITE COMPLETE - Using ${provider}`);
      return res.json(result);
    } catch (error: any) {
      console.error("Error rewriting document:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to rewrite document" 
      });
    }
  });
  
  // Translate document
  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { text, options, provider = "openai" } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      if (!options || !options.targetLanguage) {
        return res.status(400).json({ error: "Target language is required" });
      }
      
      // Import the translation service
      const { translateDocument } = await import('./services/translationService');
      
      // Translate the document
      console.log(`TRANSLATING TO ${options.targetLanguage.toUpperCase()} WITH ${provider.toUpperCase()}`);
      const result = await translateDocument(text, options, provider);
      return res.json(result);
    } catch (error: any) {
      console.error("Error translating document:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to translate document" 
      });
    }
  });
  
  // Send simple email
  app.post("/api/share-simple-email", async (req: Request, res: Response) => {
    try {
      const { recipientEmail, senderEmail, senderName, subject, content } = req.body;
      
      if (!recipientEmail || !subject || !content) {
        return res.status(400).json({ error: "Recipient email, subject, and content are required" });
      }
      
      // Send the email
      console.log(`SENDING SIMPLE EMAIL TO ${recipientEmail}`);
      const result = await sendSimpleEmail({
        recipientEmail,
        senderEmail,
        senderName,
        subject,
        content
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error sending simple email:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to send email" 
      });
    }
  });
  
  // Direct model request
  // Speech-to-text conversion endpoint
  app.post("/api/speech-to-text", speechUpload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }
      
      console.log("PROCESSING SPEECH TO TEXT");
      const text = await processSpeechToText(req);
      
      return res.json({
        success: true,
        text: text
      });
    } catch (error: any) {
      console.error("Error processing speech to text:", error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to process speech to text" 
      });
    }
  });

  app.post("/api/direct-model-request", async (req: Request, res: Response) => {
    try {
      const { instruction, provider = "openai" } = req.body;
      
      if (!instruction) {
        return res.status(400).json({ error: "Instruction is required" });
      }
      
      // Import the direct model request service
      const { 
        directOpenAIRequest, 
        directClaudeRequest, 
        directPerplexityRequest,
        directDeepSeekRequest,
        directMultiModelRequest
      } = await import('./api/directModelRequest');
      
      let result;
      
      // Make the request to the specified provider
      if (provider === "all") {
        console.log(`DIRECT MULTI-MODEL REQUEST`);
        result = await directMultiModelRequest(instruction);
      } else {
        console.log(`DIRECT ${provider.toUpperCase()} MODEL REQUEST`);
        
        switch (provider.toLowerCase()) {
          case 'anthropic':
            result = await directClaudeRequest(instruction);
            break;
          case 'perplexity':
            result = await directPerplexityRequest(instruction);
            break;
          case 'deepseek':
            result = await directDeepSeekRequest(instruction);
            break;
          case 'openai':
          default:
            result = await directOpenAIRequest(instruction);
            break;
        }
      }
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error making direct model request:", error);
      return res.status(500).json({ 
        error: true, 
        message: error.message || "Failed to make direct model request" 
      });
    }
  });
  
  app.post("/api/semantic-analysis", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text content is required" });
      }
      
      console.log(`Starting semantic analysis for text of length: ${text.length}`);
      
      const { analyzeSemanticDensity } = await import('./services/semanticAnalysis');
      const result = await analyzeSemanticDensity(text);
      
      console.log(`Semantic analysis complete: ${result.sentences.length} sentences, ${result.paragraphs.length} paragraphs`);
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error in semantic analysis:", error);
      return res.status(500).json({ 
        error: "Failed to analyze semantic density",
        message: error.message 
      });
    }
  });

  // Case assessment endpoint
  app.post("/api/case-assessment", async (req: Request, res: Response) => {
    try {
      const { text, provider = "openai", documentId } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text content is required for case assessment" });
      }
      
      const validProviders = ['openai', 'anthropic', 'perplexity', 'deepseek'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ error: `Provider must be one of: ${validProviders.join(', ')}` });
      }
      
      console.log(`Starting case assessment with ${provider} for text of length: ${text.length}`);
      
      const { performCaseAssessment } = await import('./services/caseAssessment');
      const result = await performCaseAssessment(text, provider);
      
      // Store the case assessment in the database if documentId is provided
      if (documentId) {
        try {
          const { db } = await import('./db');
          const { caseAssessments } = await import('@shared/schema');
          
          await db.insert(caseAssessments).values({
            documentId: parseInt(documentId),
            proofEffectiveness: result.proofEffectiveness,
            claimCredibility: result.claimCredibility,
            nonTriviality: result.nonTriviality,
            proofQuality: result.proofQuality,
            functionalWriting: result.functionalWriting,
            overallCaseScore: result.overallCaseScore,
            detailedAssessment: result.detailedAssessment,
          });
          
          console.log(`Case assessment saved to database for document ${documentId}`);
        } catch (dbError) {
          console.error("Failed to save case assessment to database:", dbError);
          // Continue with response even if DB save fails
        }
      }
      
      console.log(`Case assessment complete - Overall score: ${result.overallCaseScore}/100`);
      
      return res.json({
        success: true,
        provider,
        result
      });
    } catch (error: any) {
      console.error("Error in case assessment:", error);
      return res.status(500).json({ 
        error: "Failed to perform case assessment",
        message: error.message 
      });
    }
  });

  // Fiction Assessment API endpoint
  app.post('/api/fiction-assessment', async (req, res) => {
    try {
      const { text, provider, documentId } = req.body;
      
      if (!text || !provider) {
        return res.status(400).json({ error: "Text and provider are required" });
      }
      
      const { performFictionAssessment } = await import('./services/fictionAssessment');
      const result = await performFictionAssessment(text, provider);
      
      console.log(`Fiction assessment complete - Overall score: ${result.overallFictionScore}/100`);
      
      return res.json({
        success: true,
        provider,
        result
      });
    } catch (error: any) {
      console.error("Error in fiction assessment:", error);
      return res.status(500).json({ 
        error: "Failed to perform fiction assessment",
        message: error.message 
      });
    }
  });

  // Fiction Comparison API endpoint  
  app.post('/api/fiction-compare', async (req, res) => {
    try {
      const { documentA, documentB, provider } = req.body;
      
      if (!documentA || !documentB || !provider) {
        return res.status(400).json({ error: "Both documents and provider are required" });
      }
      
      const { performFictionComparison } = await import('./services/fictionComparison');
      const result = await performFictionComparison(documentA, documentB, provider);
      
      console.log(`Fiction comparison complete - Winner: Document ${result.winnerDocument}`);
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error in fiction comparison:", error);
      return res.status(500).json({ 
        error: "Failed to perform fiction comparison",
        message: error.message 
      });
    }
  });

  return app;
}