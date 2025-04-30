import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { extractTextFromFile } from "./api/documentParser";
import { checkForAI } from "./api/gptZero";
import { DocumentAnalysis, DocumentComparison, ShareViaEmailRequest, DimensionRating } from "../client/src/lib/types";
import { sendAnalysisViaEmail } from "./services/sendgrid";
import { evaluateIntelligence } from "./services/openai";
import { translateLargeDocument } from "./services/translation";

// Configure multer for file uploads - store in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Define API routes
  
  // Test route for calibration (test environment only)
  app.get("/api/test-calibration", async (_req: Request, res: Response) => {
    try {
      // Only import calibration in test environments to avoid loading in production
      const { testCalibrationSamples } = await import('./services/calibration');
      const results = await testCalibrationSamples();
      res.json(results);
    } catch (error: any) {
      console.error("Error running calibration:", error);
      res.status(500).json({ 
        message: error.message || "Error running calibration tests",
        error: error.toString()
      });
    }
  });
  
  // Test OpenAI connection
  app.get("/api/check-api", async (_req: Request, res: Response) => {
    try {
      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Test with a simple completion request
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello, this is a test message. Please respond with 'API is working.'" }],
        max_tokens: 10
      });
      
      res.json({
        status: "success",
        message: "OpenAI API connection successful",
        response: response.choices[0].message.content
      });
    } catch (error: any) {
      console.error("Error testing API connection:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Error connecting to OpenAI API",
        error: error.toString()
      });
    }
  });
  
  // Extract text from uploaded files
  app.post("/api/extract-text", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const result = await extractTextFromFile(req.file);
      res.json(result);
    } catch (error: any) {
      console.error("Error extracting text:", error);
      res.status(500).json({ message: error.message || "Error extracting text from file" });
    }
  });

  // Check if text is AI-generated using GPTZero
  app.post("/api/check-ai", async (req: Request, res: Response) => {
    try {
      const document = req.body;
      
      if (!document || !document.content) {
        return res.status(400).json({ message: "No content provided" });
      }
      
      const result = await checkForAI(document);
      res.json(result);
    } catch (error: any) {
      console.error("Error checking for AI:", error);
      res.status(500).json({ message: error.message || "Error checking for AI" });
    }
  });

  // Analyze a single document
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const document = req.body;
      
      if (!document || !document.content) {
        return res.status(400).json({ message: "No content provided" });
      }
      
      // Use OpenAI GPT-4 to perform deep semantic analysis of the document
      try {
        // First try to use the OpenAI-based analysis
        const aiEvaluation = await evaluateIntelligence(document.content);
        const result = formatAIEvaluationAsDocumentAnalysis(document.content, aiEvaluation);
        res.json(result);
      } catch (aiError) {
        console.error("OpenAI analysis failed, falling back to algorithmic analysis:", aiError);
        // Fallback to the algorithmic analysis if OpenAI fails
        const result = generateAnalysis(document.content);
        res.json(result);
      }
    } catch (error: any) {
      console.error("Error analyzing document:", error);
      res.status(500).json({ message: error.message || "Error analyzing document" });
    }
  });

  // Compare two documents
  app.post("/api/compare", async (req: Request, res: Response) => {
    try {
      const { documentA, documentB } = req.body;
      
      if (!documentA?.content || !documentB?.content) {
        return res.status(400).json({ message: "Two documents with content are required" });
      }
      
      // Analyze both documents
      let analysisA: DocumentAnalysis;
      let analysisB: DocumentAnalysis;
      
      try {
        // Try using OpenAI for deep semantic analysis
        const aiEvaluationA = await evaluateIntelligence(documentA.content);
        const aiEvaluationB = await evaluateIntelligence(documentB.content);
        
        analysisA = formatAIEvaluationAsDocumentAnalysis(documentA.content, aiEvaluationA);
        analysisB = formatAIEvaluationAsDocumentAnalysis(documentB.content, aiEvaluationB);
      } catch (aiError) {
        console.error("OpenAI analysis failed, falling back to algorithmic analysis:", aiError);
        // Fallback to algorithmic analysis if OpenAI fails
        analysisA = generateAnalysis(documentA.content);
        analysisB = generateAnalysis(documentB.content);
      }
      
      // Generate a comparison between the two documents
      const comparison = generateComparison(analysisA, analysisB);
      
      res.json({
        analysisA,
        analysisB,
        comparison
      });
    } catch (error: any) {
      console.error("Error comparing documents:", error);
      res.status(500).json({ message: error.message || "Error comparing documents" });
    }
  });

  // Share analysis results via email
  app.post("/api/share-via-email", async (req: Request, res: Response) => {
    try {
      const emailData: ShareViaEmailRequest = req.body;
      
      if (!emailData.recipientEmail || !emailData.subject || !emailData.analysisA) {
        return res.status(400).json({ message: "Missing required email fields" });
      }
      
      // Send email using SendGrid
      try {
        await sendAnalysisViaEmail(emailData);
        res.json({ success: true, message: "Email sent successfully" });
      } catch (sendError: any) {
        const errorMessage = sendError.response?.body?.errors?.[0]?.message || 
                           sendError.message || 
                           "Failed to send email";
        res.status(500).json({ success: false, message: errorMessage });
      }
    } catch (error: any) {
      console.error("Error sharing via email:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Error sharing results via email" 
      });
    }
  });

  // Translate large documents
  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { content, options, filename } = req.body;
      
      if (!content || !options?.sourceLanguage || !options?.targetLanguage) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required translation fields" 
        });
      }
      
      console.log(`Starting translation from ${options.sourceLanguage} to ${options.targetLanguage}`);
      console.log(`Document size: ${content.length} characters`);
      
      // Set up Server-Sent Events for progress updates
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Send progress updates to the client
      const sendProgress = (progress: any) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
        
        // If translation is completed or failed, end the response
        if (progress.status === 'completed' || progress.status === 'failed') {
          res.end();
        }
      };
      
      // Start the translation process
      translateLargeDocument(content, options, sendProgress)
        .then((result) => {
          if (result.success) {
            console.log('Translation completed successfully');
          } else {
            console.error('Translation failed:', result.error);
          }
        })
        .catch((error) => {
          console.error('Translation error:', error);
          sendProgress({
            currentChunk: 0,
            totalChunks: 0,
            status: 'failed',
            error: error.message || 'Unknown translation error'
          });
        });
    } catch (error: any) {
      console.error("Error starting translation:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Error starting translation process" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate a document analysis
// In a production environment, this would be replaced with actual NLP algorithms
function generateAnalysis(content: string): DocumentAnalysis {
  // Content length affects the overall score for this demo
  const contentLength = content.length;
  
  // Simpler scoring method with wide range and randomness for demo purposes
  // In a real app, we'd use actual NLP algorithms
  
  // Base score that will scale based on content length
  const baseScore = 50 + Math.min(contentLength / 100, 30);
  
  // Add significant randomness to demonstrate varied scores
  const randomFactor = Math.floor(Math.random() * 30) - 5; // -5 to +25 range
  
  // Combine for final score
  let overallScore = baseScore + randomFactor;
  
  // Ensure score is within 45-95 range
  overallScore = Math.floor(Math.min(Math.max(overallScore, 45), 95));
  
  // Generate more varied summary and assessment based on score ranges
  let cognitiveLevel = "";
  let performanceAssessment = "";
  let improvementAreas = "";
  
  // Determine cognitive level
  if (overallScore >= 85) {
    cognitiveLevel = "exceptional";
  } else if (overallScore >= 75) {
    cognitiveLevel = "advanced";
  } else if (overallScore >= 65) {
    cognitiveLevel = "moderate";
  } else if (overallScore >= 55) {
    cognitiveLevel = "developing";
  } else {
    cognitiveLevel = "basic";
  }
  
  // Determine performance description
  if (overallScore >= 85) {
    performanceAssessment = "outstanding performance across most dimensions, particularly in inferential continuity and claim formation";
  } else if (overallScore >= 75) {
    performanceAssessment = "strong performance in several key areas, with notable strengths in inferential continuity and claim formation";
  } else if (overallScore >= 65) {
    performanceAssessment = "solid performance in some dimensions, with reasonable handling of inferential continuity and claim formation";
  } else if (overallScore >= 55) {
    performanceAssessment = "adequate performance in basic dimensions, with some evidence of structured thinking";
  } else {
    performanceAssessment = "foundational cognitive abilities that require further development";
  }
  
  // Determine improvement suggestions
  if (overallScore >= 85) {
    improvementAreas = "The semantic load and jargon usage are well-managed throughout the text, with only minor areas for potential enhancement.";
  } else if (overallScore >= 75) {
    improvementAreas = "The semantic load and jargon usage are generally well-handled, though some refinement could strengthen the overall presentation.";
  } else if (overallScore >= 65) {
    improvementAreas = "There is room for improvement in semantic load and precision of language usage throughout the document.";
  } else if (overallScore >= 55) {
    improvementAreas = "Significant improvement could be made in semantic clarity, jargon usage, and overall conceptual precision.";
  } else {
    improvementAreas = "Substantial development is needed in all major dimensions, particularly in semantic coherence and technical precision.";
  }
  
  return {
    summary: `This document contains approximately ${contentLength} characters discussing various topics. The text demonstrates ${cognitiveLevel} cognitive structuring with ${overallScore >= 75 ? "well-defined" : "developing"} patterns of conceptual development.`,
    overallScore,
    overallAssessment: `The writing demonstrates ${cognitiveLevel} cognitive abilities, with ${performanceAssessment}. ${improvementAreas}`,
    dimensions: {
      definitionCoherence: {
        name: "Definition Coherence",
        rating: getRatingFromScore(overallScore + getRandom(-25, 25)),
        description: "Key terms are consistently defined before use, establishing clear conceptual boundaries. The document shows strong definition coherence throughout.",
        quote: extractQuote(content, 15),
      },
      claimFormation: {
        name: "Claim Formation",
        rating: getRatingFromScore(overallScore + getRandom(-25, 25)),
        description: "The document makes substantive claims that are testable and specific. Claims are clearly distinguished from evidence and conjecture.",
        quote: extractQuote(content, 25),
      },
      inferentialContinuity: {
        name: "Inferential Continuity",
        rating: getRatingFromScore(overallScore + getRandom(-25, 25)),
        description: "The logical progression between ideas is sound, with conclusions following naturally from premises. Causal relationships are well-established and reasoning chains remain intact.",
        quote: extractQuote(content, 35),
      },
      semanticLoad: {
        name: "Semantic Load",
        rating: getRatingFromScore(overallScore + getRandom(-30, 20)),
        description: "Most terms carry precise meaning, though occasional passages rely on semantically thin language. The document generally avoids hollow phrasing.",
        quote: extractQuote(content, 45),
      },
      jargonDetection: {
        name: "Jargon Detection",
        rating: getRatingFromScore(overallScore + getRandom(-30, 20)),
        description: "Technical language is generally used appropriately, though some specialized terms appear without sufficient context or explanation.",
        quote: extractQuote(content, 55),
      },
      surfaceComplexity: {
        name: "Surface Complexity",
        rating: getRatingFromScore(overallScore + getRandom(-20, 30)),
        description: "The document demonstrates excellent organization with clear structure, appropriate section transitions, and professional formatting.",
        quote: extractQuote(content, 65),
      },
      deepComplexity: {
        name: "Deep Complexity",
        rating: getRatingFromScore(overallScore + getRandom(-25, 25)),
        description: "The document engages with sophisticated concepts and creates novel connections between ideas. It shows conceptual depth beyond surface-level organization.",
        quote: extractQuote(content, 75),
      },
    },
  };
}

// Helper function to generate a comparison between two documents
function generateComparison(analysisA: DocumentAnalysis, analysisB: DocumentAnalysis): DocumentComparison {
  const comparisonTable = [
    {
      dimension: "Definition Coherence",
      documentA: analysisA.dimensions.definitionCoherence.rating,
      documentB: analysisB.dimensions.definitionCoherence.rating,
    },
    {
      dimension: "Claim Formation",
      documentA: analysisA.dimensions.claimFormation.rating,
      documentB: analysisB.dimensions.claimFormation.rating,
    },
    {
      dimension: "Inferential Continuity",
      documentA: analysisA.dimensions.inferentialContinuity.rating,
      documentB: analysisB.dimensions.inferentialContinuity.rating,
    },
    {
      dimension: "Semantic Load",
      documentA: analysisA.dimensions.semanticLoad.rating,
      documentB: analysisB.dimensions.semanticLoad.rating,
    },
    {
      dimension: "Jargon Detection",
      documentA: analysisA.dimensions.jargonDetection.rating,
      documentB: analysisB.dimensions.jargonDetection.rating,
    },
    {
      dimension: "Surface Complexity",
      documentA: analysisA.dimensions.surfaceComplexity.rating,
      documentB: analysisB.dimensions.surfaceComplexity.rating,
    },
    {
      dimension: "Deep Complexity",
      documentA: analysisA.dimensions.deepComplexity.rating,
      documentB: analysisB.dimensions.deepComplexity.rating,
    },
  ];

  // Generate style characteristics based on scores with more granularity
  const getStyleCharacteristics = (score: number): string[] => {
    const styles = [];
    
    if (score >= 85) {
      styles.push("Academic style with formal tone");
      styles.push("Strong theoretical foundation");
      styles.push("Extensive use of evidence and citations");
      styles.push("Conceptual approach to topic");
    } else if (score >= 75) {
      styles.push("Technical writing style");
      styles.push("Practical and application-focused");
      styles.push("Use of case studies and examples");
      styles.push("Solution-oriented approach");
    } else if (score >= 65) {
      styles.push("Clear and accessible writing style");
      styles.push("Balanced theoretical and practical elements");
      styles.push("Moderate use of supporting evidence");
      styles.push("Topic-centered approach");
    } else if (score >= 55) {
      styles.push("Straightforward communication style");
      styles.push("Basic organizational structure");
      styles.push("Limited supporting evidence");
      styles.push("Descriptive rather than analytical");
    } else {
      styles.push("Simple communication style");
      styles.push("Minimal organizational structure");
      styles.push("Sparse supporting elements");
      styles.push("Direct informational approach");
    }
    
    return styles;
  };

  // Determine which document scores higher
  const higherScoreDoc = analysisA.overallScore > analysisB.overallScore ? "A" : "B";
  const scoreDifference = Math.abs(analysisA.overallScore - analysisB.overallScore);

  return {
    documentA: {
      score: analysisA.overallScore,
      strengths: getStrengthsFromAnalysis(analysisA),
      style: getStyleCharacteristics(analysisA.overallScore),
    },
    documentB: {
      score: analysisB.overallScore,
      strengths: getStrengthsFromAnalysis(analysisB),
      style: getStyleCharacteristics(analysisB.overallScore),
    },
    comparisonTable,
    finalJudgment: `Document ${higherScoreDoc} demonstrates ${
      scoreDifference > 10 ? "a significantly" : "a slightly"
    } higher level of cognitive sophistication with ${
      higherScoreDoc === "A" ? "stronger" : "better"
    } ${getTopDimension(higherScoreDoc === "A" ? analysisA : analysisB)}. Both documents reflect intelligence in different domains, with their own unique strengths and areas for potential improvement.`,
  };
}

// Helper function to extract strengths from an analysis
function getStrengthsFromAnalysis(analysis: DocumentAnalysis): string[] {
  const strengths = [];
  const dimensions = Object.values(analysis.dimensions);
  
  for (const dimension of dimensions) {
    if (dimension.rating === "Strong") {
      strengths.push(`Strong ${dimension.name.toLowerCase()}`);
    }
  }
  
  return strengths.length > 0 ? strengths : ["No notable strengths detected"];
}

// Helper function to get the top dimension from an analysis
function getTopDimension(analysis: DocumentAnalysis): string {
  const dimensions = Object.values(analysis.dimensions);
  const strongDimensions = dimensions.filter(d => d.rating === "Strong");
  
  if (strongDimensions.length === 0) {
    return "overall cognitive processing";
  }
  
  return strongDimensions[0].name.toLowerCase();
}

// Helper function to get a rating from a score
function getRatingFromScore(score: number): DimensionRating {
  // Updated rating scale to match the calibration-based intelligence scoring law
  
  // Blueprint-grade thinking (90-98 range)
  if (score >= 95) return "Exceptional";      // 95-98: Top-tier blueprint (Pragmatism Paper calibration)
  if (score >= 92) return "Very Strong";      // 92-94: Strong blueprint (CTM/Will to Project calibration)
  if (score >= 90) return "Very Strong";      // 90-91: Minimal blueprint (Paradoxes calibration)
  
  // Advanced critique without blueprinting (80-89 range)
  if (score >= 85) return "Strong";           // 85-89: High advanced critique 
  if (score >= 80) return "Moderate";         // 80-84: Standard advanced critique
  
  // Surface polish without compression (60-79 range)
  if (score >= 75) return "Basic";            // 75-79: High surface polish (Market critique calibration)
  if (score >= 60) return "Weak";             // 60-74: Standard surface polish
  
  // Fluent but shallow (40-59 range)
  if (score >= 50) return "Very Weak";        // 50-59: Higher fluent-shallow range
  if (score >= 40) return "Very Weak";        // 40-49: Lower fluent-shallow range (Free will calibration)
  
  // Random noise (<40 range)
  return "Critically Deficient";              // 0-39: Random noise (AI paragraph calibration)
}

// Helper function to format the AI evaluation result as DocumentAnalysis
function formatAIEvaluationAsDocumentAnalysis(content: string, aiEvaluation: any): DocumentAnalysis {
  // Use the pre-calculated scores if they exist (from the new API)
  const surfaceScore = aiEvaluation.surfaceScore || (
    (aiEvaluation.surface.grammar +
    aiEvaluation.surface.structure + 
    aiEvaluation.surface.jargonUsage +
    aiEvaluation.surface.surfaceFluency) / 4
  );
  
  const deepScore = aiEvaluation.deepScore || (
    (aiEvaluation.deep.conceptualDepth +
    aiEvaluation.deep.inferentialContinuity +
    aiEvaluation.deep.claimNecessity +
    aiEvaluation.deep.semanticCompression +
    aiEvaluation.deep.logicalLaddering +
    aiEvaluation.deep.depthFluency +
    aiEvaluation.deep.originality) / 7
  );
  
  // Use the pre-calculated overall score if it exists
  // otherwise calculate it using the exact weights from our configuration (5% surface, 95% deep)
  const overallScore = aiEvaluation.overallScore || 
    Math.round(surfaceScore * 0.05 + deepScore * 0.95);
  
  // Determine cognitive level based on the updated calibration scoring law
  let cognitiveLevel = "";
  if (overallScore >= 90) {
    // Blueprint-grade thinking pattern categories (90-98)
    if (overallScore >= 95) {
      cognitiveLevel = "top-tier blueprint-grade"; // 95-98: Pragmatism Paper level
    } else if (overallScore >= 92) {
      cognitiveLevel = "strong blueprint-grade"; // 92-94: CTM/Will to Project level
    } else {
      cognitiveLevel = "minimal blueprint-grade"; // 90-91: Paradoxes level
    }
  } else if (overallScore >= 80) {
    // Advanced critique without blueprinting (80-89)
    if (overallScore >= 85) {
      cognitiveLevel = "high advanced-critique"; // 85-89: High advanced critique
    } else {
      cognitiveLevel = "standard advanced-critique"; // 80-84: Standard advanced critique
    }
  } else if (overallScore >= 60) {
    // Surface polish without compression (60-79)
    if (overallScore >= 75) {
      cognitiveLevel = "high surface-polish"; // 75-79: Market critique level
    } else {
      cognitiveLevel = "standard surface-polish"; // 60-74: Standard surface polish
    }
  } else if (overallScore >= 40) {
    // Fluent but shallow (40-59)
    cognitiveLevel = "fluent-shallow"; // 40-59: Free will paragraph level
  } else {
    // Random noise (0-39)
    cognitiveLevel = "random-noise"; // 0-39: AI paragraph level
  }
  
  // Generate descriptions based on dimension scores
  function getDimensionDescription(dimensionName: string, score: number): string {
    if (dimensionName === "definitionCoherence") {
      if (score >= 90) return "Exceptional definition coherence with precise, consistent terminology. Terms are expertly defined before use, establishing clear conceptual boundaries.";
      if (score >= 75) return "Strong definition coherence throughout the text. Key terms are consistently defined before use, creating clear conceptual boundaries.";
      if (score >= 60) return "Moderate definition coherence. Most terms are adequately defined, though some conceptual boundaries could be clearer.";
      if (score >= 40) return "Basic definition coherence. Some terms are defined, but many conceptual boundaries remain unclear.";
      return "Limited definition coherence. Terms are rarely defined, creating ambiguity and confusion.";
    }
    
    if (dimensionName === "claimFormation") {
      if (score >= 90) return "Exceptional claim formation with precise, nuanced assertions that are clearly testable and specific. Claims are expertly distinguished from evidence.";
      if (score >= 75) return "Strong claim formation. The document makes substantive claims that are testable and specific. Claims are clearly distinguished from evidence.";
      if (score >= 60) return "Moderate claim formation. Most claims are identifiable and reasonably specific, though some lack precision.";
      if (score >= 40) return "Basic claim formation. Claims are present but often lack specificity or testability.";
      return "Limited claim formation. Few clear claims are made, and those present are vague or untestable.";
    }
    
    if (dimensionName === "inferentialContinuity") {
      if (score >= 90) return "Exceptional inferential continuity with flawless logical progression. Conclusions follow necessarily from premises with robust causal relationships.";
      if (score >= 75) return "Strong inferential continuity. The logical progression between ideas is sound, with conclusions following naturally from premises.";
      if (score >= 60) return "Moderate inferential continuity. Most ideas connect logically, though some inferential jumps exist.";
      if (score >= 40) return "Basic inferential continuity. Some logical connections exist, but many inferences are missing or flawed.";
      return "Limited inferential continuity. Ideas appear disconnected with few logical relationships between them.";
    }
    
    if (dimensionName === "semanticLoad") {
      if (score >= 90) return "Exceptionally high semantic load with maximally efficient expression. Every term carries precise meaning with no wasted language.";
      if (score >= 75) return "High semantic load. Terms carry precise meaning with efficient semantic compression throughout the document.";
      if (score >= 60) return "Moderate semantic load. Most terms carry meaningful content, though some passages could be more semantically dense.";
      if (score >= 40) return "Basic semantic load. Some terms carry meaning, but much of the text uses semantically thin language.";
      return "Low semantic load. The text relies heavily on semantically empty phrases and repetition.";
    }
    
    if (dimensionName === "jargonDetection") {
      if (score >= 90) return "Exceptional use of technical language. Specialized terms are introduced with perfect context and explanation when needed.";
      if (score >= 75) return "Strong use of technical language. Specialized terms are introduced with proper context and explanation.";
      if (score >= 60) return "Moderate use of technical language. Most specialized terms are adequately explained, though some could be clearer.";
      if (score >= 40) return "Basic use of technical language. Some specialized terms are explained, but many lack sufficient context.";
      return "Problematic use of technical language. Specialized terms appear without explanation or are used incorrectly.";
    }
    
    if (dimensionName === "surfaceComplexity") {
      if (score >= 90) return "Exceptional organization with flawless structure, seamless transitions, and professional formatting throughout.";
      if (score >= 75) return "Strong organization with clear structure, appropriate section transitions, and professional formatting.";
      if (score >= 60) return "Moderate organization. The structure is generally clear, though some transitions could be improved.";
      if (score >= 40) return "Basic organization. A structure is present but often unclear, with abrupt transitions.";
      return "Limited organization. The text lacks clear structure or consistent formatting.";
    }
    
    if (dimensionName === "deepComplexity") {
      if (score >= 90) return "Exceptional conceptual depth with highly sophisticated ideas and novel theoretical frameworks. Creates meaningful connections between complex concepts.";
      if (score >= 75) return "Strong conceptual depth. The document engages with sophisticated concepts and creates novel connections between ideas.";
      if (score >= 60) return "Moderate conceptual depth. Some complex ideas are present, though theoretical frameworks could be more developed.";
      if (score >= 40) return "Basic conceptual depth. Ideas remain mostly at the surface level with limited theoretical engagement.";
      return "Limited conceptual depth. The text deals only with surface-level concepts without deeper analysis.";
    }
    
    return "Assessment unavailable.";
  }
  
  // Post-process the analysis to remove any numeric references that don't match our final score
  let processedAnalysis = aiEvaluation.analysis || "";
  
  // Scan for score range mentions and remove or replace them
  const scoreRangeRegexes = [
    /in the (low|mid|high) \d0s/gi,        // "in the high 80s"
    /around \d{1,2}-\d{1,2}/gi,            // "around 88-89"
    /score of \d{1,2}(-\d{1,2})?/gi,       // "score of 88" or "score of 88-89"
    /scores? (in|of|around) \d{1,2}/gi,    // "score in/of/around 88" 
    /\d{1,2}(-\d{1,2})? points?/gi,        // "88 points" or "88-89 points"
    /score range of \d{1,2}-\d{1,2}/gi,    // "score range of 80-89"
    /appropriate score is (in|of|around|about) .{1,15}\d{1,2}/gi,  // "appropriate score is in the high 80s"
    /therefore.*score.*\d{1,2}/gi          // "Therefore, the appropriate score is..."
  ];
  
  // Process analysis to remove numeric scores that don't match our calculated score
  scoreRangeRegexes.forEach(regex => {
    processedAnalysis = processedAnalysis.replace(regex, (match: string) => {
      // Extract any numbers from the match
      const numbers = match.match(/\d{1,2}/g);
      if (!numbers) return match;
      
      // Check if any of the numbers are significantly different from our score
      const isDifferent = numbers.some((num: string) => Math.abs(parseInt(num) - overallScore) > 5);
      
      if (isDifferent) {
        // Replace the score mention with appropriate cognitive level description
        if (overallScore >= 90) {
          return "blueprint-grade characteristics";
        } else if (overallScore >= 85) {
          return "high advanced-critique characteristics";
        } else if (overallScore >= 80) {
          return "advanced-critique characteristics";
        } else if (overallScore >= 60) {
          return "surface-polish characteristics";
        } else {
          return "basic cognitive characteristics";
        }
      }
      return match;
    });
  });
  
  // Map dimension scores to dimension ratings
  return {
    summary: `This document demonstrates ${cognitiveLevel} cognitive fingerprints with an intelligence score of ${overallScore}/100. Our analysis reveals ${overallScore >= 90 ? "exceptional semantic compression and original inferential architecture" : overallScore >= 80 ? "strong conceptual development and coherent reasoning" : overallScore >= 65 ? "structured thinking with moderate inferential continuity" : "basic fluency without significant cognitive density"}.`,
    overallScore,
    overallAssessment: processedAnalysis || `Cognitive fingerprint analysis indicates ${cognitiveLevel} thinking patterns with an intelligence score of ${overallScore}/100. This sample shows particular strengths in ${aiEvaluation.deep.semanticCompression > 85 ? "semantic compression" : aiEvaluation.deep.inferentialContinuity > 85 ? "inferential continuity" : aiEvaluation.deep.conceptualDepth > 85 ? "conceptual architecture" : aiEvaluation.deep.originality > 85 ? "cognitive innovation" : overallScore >= 80 ? "advanced cognitive organization" : "basic conceptual structuring"}.`,
    dimensions: {
      definitionCoherence: {
        name: "Definition Coherence",
        rating: getRatingFromScore(aiEvaluation.deep.logicalLaddering),
        description: getDimensionDescription("definitionCoherence", aiEvaluation.deep.logicalLaddering),
        quote: extractQuote(content, 15),
      },
      claimFormation: {
        name: "Claim Formation",
        rating: getRatingFromScore(aiEvaluation.deep.claimNecessity),
        description: getDimensionDescription("claimFormation", aiEvaluation.deep.claimNecessity),
        quote: extractQuote(content, 25),
      },
      inferentialContinuity: {
        name: "Inferential Continuity",
        rating: getRatingFromScore(aiEvaluation.deep.inferentialContinuity),
        description: getDimensionDescription("inferentialContinuity", aiEvaluation.deep.inferentialContinuity),
        quote: extractQuote(content, 35),
      },
      semanticLoad: {
        name: "Semantic Load",
        rating: getRatingFromScore(aiEvaluation.deep.semanticCompression),
        description: getDimensionDescription("semanticLoad", aiEvaluation.deep.semanticCompression),
        quote: extractQuote(content, 45),
      },
      jargonDetection: {
        name: "Jargon Detection",
        rating: getRatingFromScore(aiEvaluation.surface.jargonUsage),
        description: getDimensionDescription("jargonDetection", aiEvaluation.surface.jargonUsage),
        quote: extractQuote(content, 55),
      },
      surfaceComplexity: {
        name: "Surface Complexity",
        rating: getRatingFromScore(aiEvaluation.surface.surfaceFluency),
        description: getDimensionDescription("surfaceComplexity", aiEvaluation.surface.surfaceFluency),
        quote: extractQuote(content, 65),
      },
      deepComplexity: {
        name: "Deep Complexity",
        rating: getRatingFromScore(aiEvaluation.deep.conceptualDepth),
        description: getDimensionDescription("deepComplexity", aiEvaluation.deep.conceptualDepth),
        quote: extractQuote(content, 75),
      },
    },
  };
}

// Helper function to extract a quote from content
function extractQuote(content: string, startPercentage: number): string {
  if (!content || content.length < 50) {
    return "Insufficient text for meaningful quotation";
  }
  
  // Split content into sentences (basic implementation)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) {
    return "Insufficient text for meaningful quotation";
  }
  
  // Calculate starting position based on percentage
  const startIndex = Math.min(Math.floor((sentences.length * startPercentage) / 100), sentences.length - 1);
  
  // Get a sentence from that position or nearby
  const selectedIndex = Math.min(startIndex, sentences.length - 1);
  let quote = sentences[selectedIndex].trim();
  
  // Ensure quote is of reasonable length
  if (quote.length < 30 && selectedIndex + 1 < sentences.length) {
    quote += ". " + sentences[selectedIndex + 1].trim();
  }
  
  // Truncate if too long
  if (quote.length > 200) {
    quote = quote.substring(0, 197) + "...";
  }
  
  return quote;
}

// Helper function to generate random number in range
function getRandom(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
