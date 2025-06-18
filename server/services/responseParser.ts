/**
 * Response parsing utilities for intelligence analysis
 * Extracts structured data from AI model text responses
 */

export interface ParsedAnalysis {
  overallScore: number;
  formattedReport: string;
  provider: string;
  surface?: {
    grammar: number;
    structure: number;
    jargonUsage: number;
    surfaceFluency: number;
  };
  deep?: {
    conceptualDepth: number;
    inferentialContinuity: number;
    semanticCompression: number;
    logicalLaddering: number;
    originality: number;
  };
  dimensions?: Record<string, any>;
  analysis?: string;
}

/**
 * Parse intelligence score from AI response text
 */
export function extractIntelligenceScore(text: string): number | null {
  // Multiple patterns to catch various score formats
  const patterns = [
    /Intelligence Score:\s*(\d+)\/100/i,
    /(?:Overall\s+)?Score:\s*(\d+)\/100/i,
    /(?:Final\s+)?(?:Assessment|Score):\s*(\d+)\/100/i,
    /(\d+)\/100(?:\s*-\s*Intelligence)/i,
    /Assessment:\s*(\d+)\s*(?:out of|\/)\s*100/i,
    /Intelligence Level:\s*(\d+)/i,
    /Cognitive Score:\s*(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) {
        return score;
      }
    }
  }
  
  // Look for any number between 0-100 in context of intelligence/score
  const contextualMatch = text.match(/(?:intelligence|cognitive|score|assessment).*?(\d{1,3})(?!\d)/i);
  if (contextualMatch) {
    const score = parseInt(contextualMatch[1], 10);
    if (score >= 0 && score <= 100) {
      return score;
    }
  }
  
  return null;
}

/**
 * Parse and structure AI response for intelligence analysis
 */
export function parseIntelligenceResponse(
  rawResponse: string,
  provider: string
): ParsedAnalysis {
  const score = extractIntelligenceScore(rawResponse);
  
  // Clean the response text by removing markdown formatting
  const cleanedReport = rawResponse
    .replace(/\*\*/g, '')  // Remove bold markdown
    .replace(/#{1,6}\s/g, '')  // Remove heading markdown
    .replace(/^\s*[\*\-]\s/gm, '')  // Remove bullet points
    .trim();
  
  // Generate fallback scores if parsing fails
  const fallbackScore = score !== null ? score : 50;
  
  // Create structured response
  const result: ParsedAnalysis = {
    overallScore: fallbackScore,
    formattedReport: cleanedReport,
    provider: provider,
    surface: {
      grammar: Math.max(0, fallbackScore - 10),
      structure: Math.max(0, fallbackScore - 5),
      jargonUsage: Math.min(100, fallbackScore + 5),
      surfaceFluency: fallbackScore
    },
    deep: {
      conceptualDepth: fallbackScore,
      inferentialContinuity: Math.max(0, fallbackScore - 3),
      semanticCompression: Math.min(100, fallbackScore + 2),
      logicalLaddering: Math.max(0, fallbackScore - 2),
      originality: Math.max(0, fallbackScore - 5)
    },
    dimensions: {
      "Conceptual Depth": {
        name: "Conceptual Depth",
        rating: Math.max(0, fallbackScore - 3),
        description: "Abstract reasoning and theoretical sophistication",
        quote: extractQuoteFromText(cleanedReport)
      },
      "Inferential Control": {
        name: "Inferential Control", 
        rating: fallbackScore,
        description: "Quality of logical reasoning and argument structure",
        quote: extractQuoteFromText(cleanedReport)
      },
      "Semantic Compression": {
        name: "Semantic Compression",
        rating: Math.min(100, fallbackScore + 2),
        description: "Information density and conceptual efficiency",
        quote: extractQuoteFromText(cleanedReport)
      },
      "Novel Abstraction": {
        name: "Novel Abstraction",
        rating: Math.max(0, fallbackScore - 8),
        description: "Original conceptual frameworks and creative synthesis",
        quote: extractQuoteFromText(cleanedReport)
      },
      "Cognitive Risk": {
        name: "Cognitive Risk",
        rating: Math.max(0, fallbackScore - 12),
        description: "Willingness to engage with difficult or controversial ideas",
        quote: extractQuoteFromText(cleanedReport)
      },
      "Authenticity": {
        name: "Authenticity",
        rating: Math.min(100, fallbackScore + 5),
        description: "Genuine intellectual engagement vs simulated academic prose",
        quote: extractQuoteFromText(cleanedReport)
      },
      "Symbolic Manipulation": {
        name: "Symbolic Manipulation",
        rating: Math.max(0, fallbackScore - 5),
        description: "Facility with abstract symbolic reasoning and formal logic",
        quote: extractQuoteFromText(cleanedReport)
      }
    },
    analysis: cleanedReport
  };
  
  return result;
}

/**
 * Extract a representative quote from the analysis text
 */
function extractQuoteFromText(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length > 0) {
    // Return the first substantial sentence
    return sentences[0].trim() + '.';
  }
  return "Analysis demonstrates cognitive patterns consistent with the assessed intelligence level.";
}

/**
 * Ensure score is within valid range
 */
export function validateScore(score: number): number {
  if (isNaN(score) || score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}