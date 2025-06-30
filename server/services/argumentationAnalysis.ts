import { directOpenAIAnalyze, directAnthropicAnalyze, directPerplexityAnalyze, directDeepSeekAnalyze } from './directLLM';

export interface ArgumentationDimension {
  score: number;
  rating: string;
  description: string;
  evidence: string[];
}

export interface ArgumentationAnalysis {
  proofAdequacy: ArgumentationDimension;
  claimCredibility: ArgumentationDimension;
  nonTriviality: ArgumentationDimension;
  proofQuality: ArgumentationDimension;
  functionalWriting: ArgumentationDimension;
  additionalParameters: ArgumentationDimension;
  
  overallCogency: number;
  summary: string;
  verdict: string;
  
  comparisonWinner?: 'A' | 'B' | 'Tie';
  comparativeAnalysis?: string;
}

function createArgumentationPrompt(text: string, isComparative: boolean = false, textB?: string): string {
  const basePrompt = `You are an expert in argumentation analysis and logical reasoning. Your task is to evaluate ${isComparative ? 'two papers' : 'a paper'} on how well ${isComparative ? 'each' : 'it'} makes its case.

${isComparative ? 'PAPER A:' : 'PAPER TO ANALYZE:'}
${text}

${isComparative && textB ? `PAPER B:
${textB}` : ''}

EVALUATION CRITERIA:

1. PROOF ADEQUACY (0-100): Does the paper prove what it sets out to prove? Are the arguments sufficient to establish the conclusions?

2. CLAIM CREDIBILITY (0-100): Is what the paper sets out to prove true, credible, and worth proving? Are the central claims substantive and defensible?

3. NON-TRIVIALITY (0-100): To what degree is what the paper establishes non-trivial? Does it offer genuine insights or merely restate the obvious?

4. PROOF QUALITY (0-100): How good is the actual proof/argument structure? Is the reasoning sound, valid, and well-constructed?

5. FUNCTIONAL WRITING (0-100): How well written is the paper from a functional viewpoint? Does the prose serve the argument effectively?

6. ADDITIONAL PARAMETERS (0-100): Any other relevant factors like originality, scope, methodological rigor, engagement with counterarguments, etc.

${isComparative ? `
COMPARATIVE ANALYSIS: Which paper makes its case better overall? Consider all six dimensions and provide a clear winner (A, B, or Tie if genuinely equal).

Your response must follow this EXACT format:

**PAPER A ANALYSIS**

**Proof Adequacy: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Claim Credibility: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Non-Triviality: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Proof Quality: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Functional Writing: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Additional Parameters: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**PAPER B ANALYSIS**

[Repeat the same format for Paper B]

**COMPARATIVE VERDICT**
Winner: [A/B/Tie]
Overall Cogency A: [Score]/100
Overall Cogency B: [Score]/100

**Summary:** [200-300 word summary explaining which paper makes its case better and why]

**Final Verdict:** [Definitive statement about which paper is more cogent]
` : `
Your response must follow this EXACT format:

**ARGUMENTATION ANALYSIS**

**Proof Adequacy: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Claim Credibility: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Non-Triviality: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Proof Quality: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Functional Writing: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**Additional Parameters: [Score]/100 - [Rating]**
[Detailed description with 2-3 specific quotes from the text]
Evidence: "[Quote 1]" | "[Quote 2]" | "[Quote 3]"

**OVERALL COGENCY: [Score]/100**

**Summary:** [200-300 word summary of how cogent the paper is in establishing what it sets out to establish]

**Final Verdict:** [Definitive statement about the paper's argumentative success]
`}

RATING SCALE: Exceptional (95-100), Very Strong (85-94), Strong (75-84), Moderate (65-74), Basic (55-64), Weak (45-54), Very Weak (35-44), Critically Deficient (0-34)

Provide extensive quotations to support your analysis. Be rigorous and precise in your evaluation.`;

  return basePrompt;
}

function parseArgumentationResponse(response: string, isComparative: boolean = false): ArgumentationAnalysis {
  const parseDimension = (dimensionName: string, text: string): ArgumentationDimension => {
    const pattern = new RegExp(`\\*\\*${dimensionName}:\\s*(\\d+)/100\\s*-\\s*([^*]+)\\*\\*([^*]+?)(?=Evidence:|\\*\\*|$)`, 'i');
    const match = text.match(pattern);
    
    if (!match) {
      return {
        score: 0,
        rating: 'Not Found',
        description: 'Analysis not found',
        evidence: []
      };
    }

    const score = parseInt(match[1]) || 0;
    const rating = match[2].trim();
    const description = match[3].trim();
    
    // Extract evidence quotes
    const evidencePattern = /Evidence:\s*"([^"]+)"\s*\|\s*"([^"]+)"\s*\|\s*"([^"]+)"/i;
    const evidenceMatch = text.match(evidencePattern);
    const evidence = evidenceMatch ? [evidenceMatch[1], evidenceMatch[2], evidenceMatch[3]] : [];
    
    return { score, rating, description, evidence };
  };

  const result: ArgumentationAnalysis = {
    proofAdequacy: parseDimension('Proof Adequacy', response),
    claimCredibility: parseDimension('Claim Credibility', response),
    nonTriviality: parseDimension('Non-Triviality', response),
    proofQuality: parseDimension('Proof Quality', response),
    functionalWriting: parseDimension('Functional Writing', response),
    additionalParameters: parseDimension('Additional Parameters', response),
    
    overallCogency: 0,
    summary: '',
    verdict: ''
  };

  // Extract overall cogency
  const cogencyMatch = response.match(/\*\*OVERALL COGENCY:\s*(\d+)\/100\*\*/i);
  result.overallCogency = cogencyMatch ? parseInt(cogencyMatch[1]) : 0;

  // Extract summary
  const summaryMatch = response.match(/\*\*Summary:\*\*\s*([^*]+?)(?=\*\*|$)/i);
  result.summary = summaryMatch ? summaryMatch[1].trim() : '';

  // Extract verdict
  const verdictMatch = response.match(/\*\*Final Verdict:\*\*\s*([^*]+?)(?=\*\*|$)/i);
  result.verdict = verdictMatch ? verdictMatch[1].trim() : '';

  // For comparative analysis
  if (isComparative) {
    const winnerMatch = response.match(/Winner:\s*([ABTie]+)/i);
    result.comparisonWinner = winnerMatch ? winnerMatch[1] as 'A' | 'B' | 'Tie' : undefined;
    
    const comparativeMatch = response.match(/\*\*COMPARATIVE VERDICT\*\*([^*]+?)(?=\*\*Summary:|$)/i);
    result.comparativeAnalysis = comparativeMatch ? comparativeMatch[1].trim() : '';
  }

  return result;
}

async function callLLMProvider(prompt: string, provider: string): Promise<string> {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      const anthropicResult = await directAnthropicAnalyze(prompt);
      return anthropicResult.formattedReport || anthropicResult.response || '';
    case 'perplexity':
      const perplexityResult = await directPerplexityAnalyze(prompt);
      return perplexityResult.formattedReport || perplexityResult.response || '';
    case 'deepseek':
      const deepseekResult = await directDeepSeekAnalyze(prompt);
      return deepseekResult.formattedReport || deepseekResult.response || '';
    case 'openai':
    default:
      const openaiResult = await directOpenAIAnalyze(prompt);
      return openaiResult.formattedReport || openaiResult.response || '';
  }
}

export async function analyzeArgumentation(
  text: string, 
  provider: string = 'openai',
  textB?: string
): Promise<{ analysis: ArgumentationAnalysis; formattedReport: string }> {
  const isComparative = !!textB;
  const prompt = createArgumentationPrompt(text, isComparative, textB);
  
  console.log(`ARGUMENTATION ANALYSIS WITH ${provider.toUpperCase()}`);
  
  const response = await callLLMProvider(prompt, provider);
  const analysis = parseArgumentationResponse(response, isComparative);
  
  return {
    analysis,
    formattedReport: response
  };
}