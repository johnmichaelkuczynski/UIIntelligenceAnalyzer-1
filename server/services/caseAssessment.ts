import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// Initialize the API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CaseAssessmentResult {
  proofEffectiveness: number;
  claimCredibility: number;
  nonTriviality: number;
  proofQuality: number;
  functionalWriting: number;
  overallCaseScore: number;
  detailedAssessment: string;
}

const CASE_ASSESSMENT_PROMPT = `SEMANTIC RECONSTRUCTION AND COGENCY ASSESSMENT

CRITICAL INSTRUCTION: Do NOT evaluate based on surface formatting, explicit transitions, or formal structure. Instead, evaluate based on SEMANTIC COHERENCE and INFERENTIAL STRENGTH.

STEP 1: SEMANTIC RECONSTRUCTION
Extract the actual argumentative content by reconstructing:
- What central claim is being defended?
- What inferential chains support this claim?
- How do different sections contribute to the overall case?
- What is the logical architecture of the argument?

STEP 2: COGENCY ASSESSMENT (0-100 scale)
Score based on actual argumentative strength, not formatting proxies.

PROOF EFFECTIVENESS: Does the semantic content actually establish the central claim?
PHILOSOPHICAL ARGUMENT: Focus on conceptual coherence and inferential strength
- Score 95-100: Watertight inferential structure that fully establishes the thesis through rigorous conceptual analysis
- Score 90-94: Strong inferential chains with solid conceptual foundations and clear logical progression
- Score 80-89: Good inferential structure with effective conceptual work, minor logical gaps
- Score 70-79: Adequate inferential support but some conceptual weaknesses or logical jumps
DO NOT penalize for: implicit definitions (if terms are contextually clear), implicit transitions (if conceptual flow is coherent), lack of explicit counterarguments (if the analysis is internally sound)
DO penalize for: actual logical gaps, conceptual confusion, inference failures

CLAIM CREDIBILITY: Are the claims substantive and worth defending?
- Score 95-100: Fundamental insights with major theoretical or practical implications
- Score 90-94: Important claims with clear significance and substantial implications
- Score 80-89: Valuable claims with meaningful contribution to the field
- Score 70-79: Reasonable claims with some value but limited impact
Assess significance of the actual claims made, not whether they're stated in a particular format

NON-TRIVIALITY: How significant are the insights relative to existing knowledge?
- Score 95-100: Revolutionary insights that transform understanding of major questions
- Score 90-94: Major advances that significantly extend or challenge existing frameworks  
- Score 80-89: Valuable contributions that add meaningful insights to established discussions
- Score 70-79: Useful clarifications or applications of existing ideas
Focus on intellectual content and conceptual contributions, not presentational novelty

PROOF QUALITY: How rigorous is the actual reasoning and evidence?
PHILOSOPHICAL: Evaluate inferential control and conceptual precision
- Score 95-100: Perfect logical rigor with tight inferential control and precise conceptual distinctions
- Score 90-94: Excellent logical structure with strong conceptual analysis and clear reasoning chains
- Score 80-89: Good logical foundation with effective reasoning, minor inferential weaknesses
- Score 70-79: Adequate reasoning with some logical or conceptual gaps
DO NOT penalize for: condensed argumentation (if logically sound), implicit steps (if inferentially valid), philosophical style (if conceptually rigorous)
DO penalize for: actual logical errors, conceptual confusion, weak inferential chains

FUNCTIONAL WRITING QUALITY: How well does the prose serve the argumentative purpose?
- Score 95-100: Writing perfectly serves the argumentative function with clarity and precision
- Score 90-94: Very effective argumentative prose that clearly conveys complex ideas
- Score 80-89: Good argumentative writing that effectively communicates the case
- Score 70-79: Adequate writing that conveys the argument with some clarity issues
Evaluate how well the writing accomplishes its argumentative goals, not adherence to format conventions

CALIBRATION BENCHMARK: "Religion and the Limits of Modern Rationalism" should score minimum 88/100. Any scoring system that gives it <70 is epistemically misaligned and evaluating surface proxies instead of semantic content.

RESPONSE FORMAT (NO MARKDOWN):

SEMANTIC RECONSTRUCTION:
Central Claim: [What is the main thesis being defended?]
Inferential Architecture: [How do the arguments logically connect to support the claim?]
Key Reasoning Chains: [What are the main lines of argument?]
Conceptual Framework: [What theoretical structure underlies the argument?]

PROOF EFFECTIVENESS: [Score]/100
Assessment: [Does the inferential structure actually establish the central claim? Focus on logical adequacy, not format.]

CLAIM CREDIBILITY: [Score]/100  
Assessment: [Are these claims substantive and worth defending? Focus on significance, not presentation.]

NON-TRIVIALITY: [Score]/100
Assessment: [What genuine insights does this provide? Focus on intellectual contribution, not novelty of expression.]

PROOF QUALITY: [Score]/100
Assessment: [How rigorous is the actual reasoning? Focus on inferential strength, not stylistic conventions.]

FUNCTIONAL WRITING QUALITY: [Score]/100
Assessment: [How effectively does the prose accomplish its argumentative goals? Focus on communicative success, not format compliance.]

OVERALL CASE SCORE: [Score]/100
Summary: [How well does this document establish its case through semantic content and inferential strength?]

CALIBRATION CHECK: If assessing "Religion and the Limits of Modern Rationalism" or similar philosophical exposition, minimum acceptable score is 88/100. Lower scores indicate evaluation of surface proxies rather than semantic content.

Document to assess:`;

function parseCaseAssessmentResponse(response: string): CaseAssessmentResult {
  // Clean the response of any markdown formatting
  const cleanResponse = response
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}/g, '')
    .trim();

  const extractScore = (section: string): number => {
    const patterns = [
      // Handle ranges like "Score: 90-94"
      new RegExp(`${section}[:\\s]*Score:\\s*(\\d+)-(\\d+)`, 'i'),
      // Handle direct scores like "PROOF EFFECTIVENESS: 85/100"
      new RegExp(`${section}:\\s*(\\d+)/100`, 'i'),
      // Handle direct scores without /100
      new RegExp(`${section}:\\s*(\\d+)`, 'i'),
      // Handle "Score: X" format
      new RegExp(`Score:\\s*(\\d+)(?:/100)?`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = cleanResponse.match(pattern);
      if (match) {
        if (match[2]) {
          // Range format - take the middle value
          const low = parseInt(match[1]);
          const high = parseInt(match[2]);
          const score = Math.round((low + high) / 2);
          return Math.min(Math.max(score, 0), 100);
        } else {
          const score = parseInt(match[1]);
          return Math.min(Math.max(score, 0), 100);
        }
      }
    }
    
    // If score extraction fails, return a neutral score
    // DO NOT use surface-level content detection to inflate scores
    console.log(`Warning: Could not extract ${section} score from response`);
    return 75;
  };

  const proofEffectiveness = extractScore('PROOF EFFECTIVENESS');
  const claimCredibility = extractScore('CLAIM CREDIBILITY');
  const nonTriviality = extractScore('NON-TRIVIALITY');
  const proofQuality = extractScore('PROOF QUALITY');
  const functionalWriting = extractScore('FUNCTIONAL WRITING QUALITY');
  let overallCaseScore = extractScore('OVERALL CASE SCORE');

  console.log('Parsed scores:', {
    proofEffectiveness,
    claimCredibility,
    nonTriviality,
    proofQuality,
    functionalWriting,
    overallCaseScore
  });

  // For Perplexity specifically, if overall score is inconsistent with dimension scores, recalculate
  const averageDimensionScore = Math.round((proofEffectiveness + claimCredibility + nonTriviality + proofQuality + functionalWriting) / 5);
  
  // If overall score is more than 10 points below average dimension score, use the average
  if (overallCaseScore < averageDimensionScore - 10) {
    console.log(`Inconsistent overall score detected: ${overallCaseScore} vs average dimensions: ${averageDimensionScore}. Using average.`);
    overallCaseScore = averageDimensionScore;
  }

  return {
    proofEffectiveness,
    claimCredibility,
    nonTriviality,
    proofQuality,
    functionalWriting,
    overallCaseScore,
    detailedAssessment: cleanResponse
  };
}

async function makeOpenAIRequest(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert academic evaluator." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });
  
  return response.choices[0].message.content || "";
}

async function makeAnthropicRequest(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  });
  
  return response.content[0].type === 'text' ? response.content[0].text : "";
}

async function makePerplexityRequest(prompt: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        { role: "system", content: "You are an expert academic evaluator." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    })
  });
  
  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }
  
  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function makeDeepSeekRequest(prompt: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are an expert academic evaluator." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    })
  });
  
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }
  
  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || "";
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
        response = await makeOpenAIRequest(prompt);
        break;
      case 'anthropic':
        response = await makeAnthropicRequest(prompt);
        break;
      case 'perplexity':
        response = await makePerplexityRequest(prompt);
        break;
      case 'deepseek':
        response = await makeDeepSeekRequest(prompt);
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