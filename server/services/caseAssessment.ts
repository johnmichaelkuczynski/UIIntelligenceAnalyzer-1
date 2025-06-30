import { directOpenAIRequest } from './directLLM';
import { directAnthropicRequest } from './directLLM';
import { directPerplexityRequest } from './directLLM';
import { directDeepSeekRequest } from './directLLM';

export interface CaseAssessmentResult {
  proofEffectiveness: number;
  claimCredibility: number;
  nonTriviality: number;
  proofQuality: number;
  functionalWriting: number;
  overallCaseScore: number;
  detailedAssessment: string;
}

const CASE_ASSESSMENT_PROMPT = `You are an expert academic evaluator tasked with assessing how well a document makes its case. Evaluate the following text across these specific dimensions:

1. PROOF EFFECTIVENESS (0-100): Does the paper prove what it sets out to prove? How effectively does it establish its main claims?

2. CLAIM CREDIBILITY (0-100): Are the claims being made true, credible, and sufficiently worth proving to warrant an attempted proof?

3. NON-TRIVIALITY (0-100): To what degree is what the paper establishes non-trivial? How significant or important are the conclusions?

4. PROOF QUALITY (0-100): How good is the actual proof/argumentation? Consider logical rigor, evidence quality, reasoning structure.

5. FUNCTIONAL WRITING QUALITY (0-100): How well written is the paper from a functional viewpoint? Consider clarity, organization, accessibility.

6. OVERALL CASE SCORE (0-100): Taking everything into account, how well does this document make its case overall?

For each dimension, provide:
- A numerical score (0-100)
- 2-3 specific quotes from the text that justify your assessment
- A detailed explanation of your reasoning

Structure your response as follows:

**PROOF EFFECTIVENESS: [Score]/100**
Quotes: "[quote 1]" ... "[quote 2]"
Analysis: [detailed reasoning]

**CLAIM CREDIBILITY: [Score]/100**
Quotes: "[quote 1]" ... "[quote 2]"
Analysis: [detailed reasoning]

**NON-TRIVIALITY: [Score]/100**
Quotes: "[quote 1]" ... "[quote 2]"
Analysis: [detailed reasoning]

**PROOF QUALITY: [Score]/100**
Quotes: "[quote 1]" ... "[quote 2]"
Analysis: [detailed reasoning]

**FUNCTIONAL WRITING QUALITY: [Score]/100**
Quotes: "[quote 1]" ... "[quote 2]"
Analysis: [detailed reasoning]

**OVERALL CASE SCORE: [Score]/100**
Executive Summary: [comprehensive assessment of how well the document makes its case]

Text to evaluate:`;

function parseCaseAssessmentResponse(response: string): CaseAssessmentResult {
  const extractScore = (section: string): number => {
    const patterns = [
      new RegExp(`${section}:\\s*(\\d+)/100`, 'i'),
      new RegExp(`${section}:\\s*(\\d+)`, 'i'),
      new RegExp(`\\*\\*${section}:\\s*(\\d+)/100\\*\\*`, 'i'),
      new RegExp(`\\*\\*${section}:\\s*(\\d+)\\*\\*`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        const score = parseInt(match[1]);
        return Math.min(Math.max(score, 0), 100);
      }
    }
    return 70; // Default fallback
  };

  const proofEffectiveness = extractScore('PROOF EFFECTIVENESS');
  const claimCredibility = extractScore('CLAIM CREDIBILITY');
  const nonTriviality = extractScore('NON-TRIVIALITY');
  const proofQuality = extractScore('PROOF QUALITY');
  const functionalWriting = extractScore('FUNCTIONAL WRITING QUALITY');
  const overallCaseScore = extractScore('OVERALL CASE SCORE');

  return {
    proofEffectiveness,
    claimCredibility,
    nonTriviality,
    proofQuality,
    functionalWriting,
    overallCaseScore,
    detailedAssessment: response.trim()
  };
}

export async function performCaseAssessment(
  text: string,
  provider: 'openai' | 'anthropic' | 'perplexity' | 'deepseek'
): Promise<CaseAssessmentResult> {
  const prompt = `${CASE_ASSESSMENT_PROMPT}\n\n${text}`;
  
  let response: string;
  
  try {
    switch (provider) {
      case 'openai':
        response = await directOpenAIRequest(prompt);
        break;
      case 'anthropic':
        response = await directAnthropicRequest(prompt);
        break;
      case 'perplexity':
        response = await directPerplexityRequest(prompt);
        break;
      case 'deepseek':
        response = await directDeepSeekRequest(prompt);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    return parseCaseAssessmentResponse(response);
  } catch (error) {
    console.error(`Case assessment failed with ${provider}:`, error);
    throw new Error(`Case assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}