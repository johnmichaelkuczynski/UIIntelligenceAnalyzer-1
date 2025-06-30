type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

export interface DocumentComparisonResult {
  winnerDocument: 'A' | 'B';
  documentAScore: number;
  documentBScore: number;
  comparisonAnalysis: string;
  detailedBreakdown: string;
}

const COMPARISON_PROMPT = `DOCUMENT COMPARISON: WHICH MAKES ITS CASE BETTER?

You are comparing two documents to determine which one makes its case more effectively.

COMPARISON CRITERIA:
1. Argument Strength: Which document has stronger logical arguments?
2. Evidence Quality: Which provides better evidence for its claims?
3. Persuasiveness: Which is more convincing overall?
4. Clarity of Case: Which presents its argument more clearly?
5. Completeness: Which covers its topic more thoroughly?

SCORING SYSTEM:
- Document A Score: 0-100 (how well Document A makes its case)
- Document B Score: 0-100 (how well Document B makes its case)
- Winner: The document with the higher score

RESPONSE FORMAT (NO MARKDOWN):

WINNER: Document [A or B]

DOCUMENT A SCORE: [Score]/100
DOCUMENT B SCORE: [Score]/100

COMPARISON ANALYSIS:
[Brief explanation of which document makes its case better and why]

DETAILED BREAKDOWN:
Argument Strength: [Compare the logical strength of arguments]
Evidence Quality: [Compare the quality and relevance of evidence]
Persuasiveness: [Compare overall persuasive power]
Clarity of Case: [Compare how clearly each presents its argument]
Completeness: [Compare thoroughness of coverage]

FINAL VERDICT:
[Conclusive statement about which document makes its case better with key reasons]

DOCUMENT A:
`;

export async function compareDocuments(
  documentA: string,
  documentB: string,
  provider: LLMProvider = 'openai'
): Promise<DocumentComparisonResult> {
  const prompt = COMPARISON_PROMPT + documentA + "\n\nDOCUMENT B:\n" + documentB;
  
  // Call the appropriate LLM service
  let response: string;
  if (provider === 'openai') {
    const { directOpenAIAnalyze } = await import('./directLLM');
    const result = await directOpenAIAnalyze(prompt);
    response = result.formattedReport || "No response available";
  } else if (provider === 'anthropic') {
    const { directAnthropicAnalyze } = await import('./directLLM');
    const result = await directAnthropicAnalyze(prompt);
    response = result.formattedReport || "No response available";
  } else if (provider === 'perplexity') {
    const { directPerplexityAnalyze } = await import('./directLLM');
    const result = await directPerplexityAnalyze(prompt);
    response = result.formattedReport || "No response available";
  } else if (provider === 'deepseek') {
    const { directDeepSeekAnalyze } = await import('./directLLM');
    const result = await directDeepSeekAnalyze(prompt);
    response = result.formattedReport || "No response available";
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  
  return parseComparisonResponse(response);
}

function parseComparisonResponse(response: string): DocumentComparisonResult {
  const cleanResponse = response.replace(/\*\*/g, '').replace(/\*/g, '').replace(/```/g, '');
  
  // Extract winner
  let winnerDocument: 'A' | 'B' = 'A';
  const winnerMatch = cleanResponse.match(/WINNER:\s*Document\s*([AB])/i);
  if (winnerMatch) {
    winnerDocument = winnerMatch[1].toUpperCase() as 'A' | 'B';
  }
  
  // Extract scores
  let documentAScore = 85;
  let documentBScore = 85;
  
  const scoreAMatch = cleanResponse.match(/DOCUMENT A SCORE:\s*(\d+)/i);
  if (scoreAMatch) {
    documentAScore = Math.min(Math.max(parseInt(scoreAMatch[1]), 0), 100);
  }
  
  const scoreBMatch = cleanResponse.match(/DOCUMENT B SCORE:\s*(\d+)/i);
  if (scoreBMatch) {
    documentBScore = Math.min(Math.max(parseInt(scoreBMatch[1]), 0), 100);
  }
  
  // Extract analysis sections using simpler regex
  let comparisonAnalysis = '';
  const analysisStart = cleanResponse.indexOf('COMPARISON ANALYSIS:');
  const breakdownStart = cleanResponse.indexOf('DETAILED BREAKDOWN:');
  
  if (analysisStart !== -1 && breakdownStart !== -1) {
    comparisonAnalysis = cleanResponse.substring(analysisStart + 20, breakdownStart).trim();
  } else if (analysisStart !== -1) {
    comparisonAnalysis = cleanResponse.substring(analysisStart + 20).trim();
  }
  
  let detailedBreakdown = '';
  const verdictStart = cleanResponse.indexOf('FINAL VERDICT:');
  
  if (breakdownStart !== -1 && verdictStart !== -1) {
    detailedBreakdown = cleanResponse.substring(breakdownStart + 19, verdictStart).trim();
  } else if (breakdownStart !== -1) {
    detailedBreakdown = cleanResponse.substring(breakdownStart + 19).trim();
  }
  
  if (verdictStart !== -1) {
    const verdict = cleanResponse.substring(verdictStart + 14).trim();
    detailedBreakdown += '\n\nFinal Verdict: ' + verdict;
  }
  
  return {
    winnerDocument,
    documentAScore,
    documentBScore,
    comparisonAnalysis,
    detailedBreakdown
  };
}