import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { extractTextFromFile } from "./api/documentParser";
import { checkForAI } from "./api/gptZero";
import { DocumentAnalysis, DocumentComparison, ShareViaEmailRequest } from "@/lib/types";
import { sendAnalysisViaEmail } from "./services/sendgrid";

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
      
      // Perform deep analysis on the document
      // This is where the actual NLP analysis would happen
      // For now, we'll generate a mock analysis for demonstration purposes
      const result = generateAnalysis(document.content);
      
      res.json(result);
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
      const analysisA = generateAnalysis(documentA.content);
      const analysisB = generateAnalysis(documentB.content);
      
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
      const result = await sendAnalysisViaEmail(emailData);
      
      if (result) {
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send email" });
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
  let overallScore = Math.min(Math.max(Math.floor(contentLength / 100), 50), 95);
  
  // Adjust score to be between 65-95 based on content length
  overallScore = Math.max(65, Math.min(95, overallScore));
  
  return {
    summary: `This document contains approximately ${contentLength} characters discussing various topics. The text demonstrates ${overallScore > 80 ? "advanced" : "moderate"} cognitive structuring with defined patterns of conceptual development.`,
    overallScore,
    overallAssessment: `The writing demonstrates ${overallScore > 80 ? "advanced" : "moderate"} cognitive abilities, with ${overallScore > 80 ? "particularly strong" : "reasonable"} performance in inferential continuity and claim formation. ${overallScore < 80 ? "There is room for improvement in semantic load and jargon usage." : "The semantic load and jargon usage are well-managed throughout the text."}`,
    dimensions: {
      definitionCoherence: {
        name: "Definition Coherence",
        rating: getRatingFromScore(overallScore + getRandom(-10, 10)),
        description: "Key terms are consistently defined before use, establishing clear conceptual boundaries. The document shows strong definition coherence throughout.",
        quote: extractQuote(content, 15),
      },
      claimFormation: {
        name: "Claim Formation",
        rating: getRatingFromScore(overallScore + getRandom(-10, 10)),
        description: "The document makes substantive claims that are testable and specific. Claims are clearly distinguished from evidence and conjecture.",
        quote: extractQuote(content, 25),
      },
      inferentialContinuity: {
        name: "Inferential Continuity",
        rating: getRatingFromScore(overallScore + getRandom(-10, 10)),
        description: "The logical progression between ideas is sound, with conclusions following naturally from premises. Causal relationships are well-established and reasoning chains remain intact.",
        quote: extractQuote(content, 35),
      },
      semanticLoad: {
        name: "Semantic Load",
        rating: getRatingFromScore(overallScore + getRandom(-15, 5)),
        description: "Most terms carry precise meaning, though occasional passages rely on semantically thin language. The document generally avoids hollow phrasing.",
        quote: extractQuote(content, 45),
      },
      jargonDetection: {
        name: "Jargon Detection",
        rating: getRatingFromScore(overallScore + getRandom(-15, 5)),
        description: "Technical language is generally used appropriately, though some specialized terms appear without sufficient context or explanation.",
        quote: extractQuote(content, 55),
      },
      surfaceComplexity: {
        name: "Surface Complexity",
        rating: getRatingFromScore(overallScore + getRandom(-5, 15)),
        description: "The document demonstrates excellent organization with clear structure, appropriate section transitions, and professional formatting.",
        quote: extractQuote(content, 65),
      },
      deepComplexity: {
        name: "Deep Complexity",
        rating: getRatingFromScore(overallScore + getRandom(-10, 10)),
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

  // Generate style characteristics based on scores
  const getStyleCharacteristics = (score: number): string[] => {
    const styles = [];
    
    if (score > 85) {
      styles.push("Academic style with formal tone");
      styles.push("Strong theoretical foundation");
      styles.push("Extensive use of evidence and citations");
      styles.push("Conceptual approach to topic");
    } else if (score > 75) {
      styles.push("Technical writing style");
      styles.push("Practical and application-focused");
      styles.push("Use of case studies and examples");
      styles.push("Solution-oriented approach");
    } else {
      styles.push("Clear and accessible writing style");
      styles.push("Balanced theoretical and practical elements");
      styles.push("Moderate use of supporting evidence");
      styles.push("Topic-centered approach");
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
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
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
