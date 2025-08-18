/**
 * Clean response parser - ONLY extracts from LLM narrative, NO statistical proxies
 */

export interface CleanAnalysis {
  overallScore: number;
  formattedReport: string;
  provider: string;
  summary?: string;
  dimensions?: Record<string, number>;
  highlights?: string[];
  verdict?: string;
}

/**
 * Detect pseudo-intellectual impostor prose patterns
 */
function detectPseudoIntellectualProse(originalText: string): boolean {
  const redFlags = [
    "conceptual scaffolding of intersubjective normativity",
    "recursive landscape",
    "fluid interface",
    "polycentric episteme", 
    "emergent horizon of discontinuous legitimacy",
    "semiotic event",
    "embodied discursivity",
    "cross-analyzed with non-hierarchical phenomenological structures"
  ];
  
  const buzzwordCount = redFlags.filter(flag => 
    originalText.toLowerCase().includes(flag.toLowerCase())
  ).length;
  
  // If 3+ red flags detected, it's pseudo-intellectual prose
  return buzzwordCount >= 3;
}

/**
 * Extract intelligence score from structured LLM output with pseudo-intellectual override
 */
export function extractIntelligenceScore(text: string, originalText?: string): number | null {
  const patterns = [
    /🧠\s*Final Intelligence Score:\s*(\d+)\/100/i,
    /Final Intelligence Score:\s*(\d+)\/100/i,
    /Intelligence Score:\s*(\d+)\/100/i,
  ];
  
  let extractedScore: number | null = null;
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extractedScore = parseInt(match[1], 10);
      break;
    }
  }
  
  // Apply pseudo-intellectual detection override
  if (originalText && detectPseudoIntellectualProse(originalText)) {
    console.log("⚠️ PSEUDO-INTELLECTUAL PROSE DETECTED - OVERRIDING SCORE TO 35");
    return 35; // Override any high score for pseudo-intellectual prose
  }
  
  return extractedScore;
}

/**
 * Extract summary from LLM structured output
 */
export function extractSummary(text: string): string {
  const summaryMatch = text.match(/Summary:\s*([^✓\n]+)/i);
  return summaryMatch ? summaryMatch[1].trim() : '';
}

/**
 * Extract dimension scores from LLM structured output
 */
export function extractDimensions(text: string): Record<string, number> {
  // Removed fake cognitive dimensions - only real intelligence scoring matters
  const dimensions: Record<string, number> = {};
  return dimensions;
}

/**
 * Extract highlights from LLM structured output
 */
export function extractHighlights(text: string): string[] {
  const highlights = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('✓')) {
      highlights.push(line.trim().substring(1).trim());
    }
  }
  return highlights;
}

/**
 * Extract verdict from LLM structured output
 */
export function extractVerdict(text: string): string {
  const verdictMatch = text.match(/Verdict:\s*([^\n]+)/i);
  return verdictMatch ? verdictMatch[1].trim() : '';
}

/**
 * Clean markup from AI response
 */
export function cleanAIResponse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/^\s*[-*+]\s*/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Main parsing function - ONLY extracts from LLM narrative with pseudo-intellectual override
 */
export function parseCleanIntelligenceResponse(rawResponse: string, provider: string, originalText?: string): CleanAnalysis {
  const cleanedResponse = cleanAIResponse(rawResponse);
  
  const overallScore = extractIntelligenceScore(cleanedResponse, originalText) || 0;
  const summary = extractSummary(cleanedResponse);
  const dimensions = extractDimensions(cleanedResponse);
  const highlights = extractHighlights(cleanedResponse);
  const verdict = extractVerdict(cleanedResponse);
  
  // Apply pseudo-intellectual detection to formatted report
  let finalReport = cleanedResponse;
  if (originalText && detectPseudoIntellectualProse(originalText)) {
    finalReport = `⚠️ PSEUDO-INTELLECTUAL IMPOSTOR PROSE DETECTED ⚠️\n\nThis text contains academic jargon without logical structure. Score overridden to 35/100.\n\nOriginal Analysis:\n${cleanedResponse}`;
  }
  
  return {
    overallScore,
    formattedReport: finalReport,
    provider,
    summary,
    dimensions,
    highlights,
    verdict
  };
}