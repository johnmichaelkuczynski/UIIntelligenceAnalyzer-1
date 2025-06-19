/**
 * Response parsing utilities for intelligence analysis
 * Extracts structured data from AI model text responses
 */

export interface ParsedAnalysis {
  overallScore: number;
  formattedReport: string;
  provider: string;
  percentileExplanation?: string;
  summaryDiagnosis?: string;
  cognitiveBreakdown?: {
    semanticCompression: { score: number; analysis: string };
    inferentialControl: { score: number; analysis: string };
    conceptualInnovation: { score: number; analysis: string };
    cognitiveRisk: { score: number; analysis: string };
    theoreticalIntegration: { score: number; analysis: string };
    metaCognition: { score: number; analysis: string };
  };
  comparativePlacement?: string;
  finalAssessment?: string;
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
    /Estimated Intelligence Score:\s*(\d+)\/100/i,
    /Intelligence Score:\s*(\d+)\/100/i,
    /(?:Overall\s+)?Score:\s*(\d+)\/100/i,
    /(?:Final\s+)?(?:Assessment|Score):\s*(\d+)\/100/i,
    /(\d+)\/100(?:\s*-\s*Intelligence)/i,
    /Assessment:\s*(\d+)\s*(?:out of|\/)\s*100/i,
    /Intelligence Level:\s*(\d+)/i,
    /Cognitive Score:\s*(\d+)/i,
    /Percentile:\s*Author outperforms\s*(\d+)%/i
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
 * Extract structured cognitive breakdown from intelligence report
 */
function extractCognitiveBreakdown(text: string): ParsedAnalysis['cognitiveBreakdown'] {
  const breakdown: any = {};
  
  // Extract dimension scores and analyses
  const dimensionPattern = /([a-zA-Z\s&]+)\s*\((\d+)\/10\)\s*([^a-zA-Z]*(?:[^(](?!\d+\/10))*)/g;
  let match;
  
  while ((match = dimensionPattern.exec(text)) !== null) {
    const [, name, score, analysis] = match;
    const cleanName = name.trim().toLowerCase().replace(/[^a-z]/g, '');
    
    if (cleanName.includes('semantic') || cleanName.includes('compression')) {
      breakdown.semanticCompression = { score: parseInt(score), analysis: analysis.trim() };
    } else if (cleanName.includes('inferential') || cleanName.includes('control')) {
      breakdown.inferentialControl = { score: parseInt(score), analysis: analysis.trim() };
    } else if (cleanName.includes('conceptual') || cleanName.includes('innovation')) {
      breakdown.conceptualInnovation = { score: parseInt(score), analysis: analysis.trim() };
    } else if (cleanName.includes('cognitive') || cleanName.includes('risk')) {
      breakdown.cognitiveRisk = { score: parseInt(score), analysis: analysis.trim() };
    } else if (cleanName.includes('theoretical') || cleanName.includes('integration')) {
      breakdown.theoreticalIntegration = { score: parseInt(score), analysis: analysis.trim() };
    } else if (cleanName.includes('meta') || cleanName.includes('cognition')) {
      breakdown.metaCognition = { score: parseInt(score), analysis: analysis.trim() };
    }
  }
  
  return Object.keys(breakdown).length > 0 ? breakdown : undefined;
}

/**
 * Extract percentile explanation from intelligence report
 */
function extractPercentileExplanation(text: string): string | undefined {
  const percentileMatch = text.match(/Percentile:\s*Author outperforms\s*(\d+)%[^.]*\./i);
  return percentileMatch ? percentileMatch[0] : undefined;
}

/**
 * Extract summary diagnosis from intelligence report
 */
function extractSummaryDiagnosis(text: string): string | undefined {
  const summaryMatch = text.match(/1\.\s*Summary Diagnosis[\s\S]*?(?=2\.)/);
  if (summaryMatch) {
    return summaryMatch[0].replace(/1\.\s*Summary Diagnosis[^a-zA-Z]*/, '').trim();
  }
  return undefined;
}

/**
 * Extract comparative placement from intelligence report
 */
function extractComparativePlacement(text: string): string | undefined {
  // Use indexOf approach for broader compatibility
  const startMarker = "3. Comparative Placement";
  const endMarker = "4.";
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return undefined;
  
  const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1) return undefined;
  
  return text.substring(startIndex + startMarker.length, endIndex).trim();
}

/**
 * Extract final assessment from intelligence report
 */
function extractFinalAssessment(text: string): string | undefined {
  const startMarker = "4. Final Assessment";
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return undefined;
  
  return text.substring(startIndex + startMarker.length).trim();
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
  
  // Extract comprehensive report components
  const percentileExplanation = extractPercentileExplanation(cleanedReport);
  const summaryDiagnosis = extractSummaryDiagnosis(cleanedReport);
  const cognitiveBreakdown = extractCognitiveBreakdown(cleanedReport);
  const comparativePlacement = extractComparativePlacement(cleanedReport);
  const finalAssessment = extractFinalAssessment(cleanedReport);
  
  // Create structured response
  const result: ParsedAnalysis = {
    overallScore: fallbackScore,
    formattedReport: cleanedReport,
    provider: provider,
    percentileExplanation,
    summaryDiagnosis,
    cognitiveBreakdown,
    comparativePlacement,
    finalAssessment,
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
        rating: fallbackScore >= 95 ? Math.min(100, fallbackScore + 2) : Math.max(0, fallbackScore - 3),
        description: "Abstract reasoning and theoretical sophistication",
        quote: extractQuoteFromText(cleanedReport)
      },
      "Inferential Control": {
        name: "Inferential Control", 
        rating: fallbackScore >= 95 ? Math.min(100, fallbackScore + 1) : fallbackScore,
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
        rating: fallbackScore >= 95 ? Math.max(90, fallbackScore - 3) : Math.max(0, fallbackScore - 8),
        description: "Original conceptual frameworks and creative synthesis",
        quote: extractQuoteFromText(cleanedReport)
      },
      "Cognitive Risk": {
        name: "Cognitive Risk",
        rating: fallbackScore >= 95 ? Math.max(85, fallbackScore - 8) : Math.max(0, fallbackScore - 12),
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
        rating: fallbackScore >= 95 ? Math.max(90, fallbackScore - 2) : Math.max(0, fallbackScore - 5),
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