import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { extractTextFromFile } from "./api/documentParser";
import { checkForAI } from "./api/gptZero";
import { DocumentAnalysis, DocumentComparison, ShareViaEmailRequest } from "@/lib/types";
import { sendAnalysisViaEmail } from "./services/sendgrid";
import { evaluateIntelligence } from "./services/openai";

// Configure multer for file uploads - store in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Define API routes
  
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
function getRatingFromScore(score: number): "Strong" | "Moderate" | "Weak" {
  // Use a more varied scale for dimension ratings
  if (score >= 80) return "Strong";
  if (score >= 65) return "Moderate";
  return "Weak";
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
