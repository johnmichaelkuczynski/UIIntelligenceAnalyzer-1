/**
 * STRICT 3-PHASE INTELLIGENCE EVALUATION PROTOCOL
 * 
 * This implements the exact protocol specified for intelligence evaluations:
 * PHASE 1: Send LLM the specific questions with exact wording and qualifications
 * PHASE 2: Push back if scores < 95/100, ask questions de novo
 * PHASE 3: Accept and report what the LLM says
 */

type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

// The exact questions from the protocol
const INTELLIGENCE_QUESTIONS = `IS IT INSIGHTFUL?
DOES IT DEVELOP POINTS? (OR, IF IT IS A SHORT EXCERPT, IS THERE EVIDENCE THAT IT WOULD DEVELOP POINTS IF EXTENDED)?
IS THE ORGANIZATION MERELY SEQUENTIAL (JUST ONE POINT AFTER ANOTHER, LITTLE OR NO LOGICAL SCAFFOLDING)? OR ARE THE IDEAS ARRANGED, NOT JUST SEQUENTIALLY BUT HIERARCHICALLY?
IF THE POINTS IT MAKES ARE NOT INSIGHTFUL, DOES IT OPERATE SKILLFULLY WITH CANONS OF LOGIC/REASONING?
ARE THE POINTS CLICHES? OR ARE THEY "FRESH"?
DOES IT USE TECHNICAL JARGON TO OBFUSCATE OR TO RENDER MORE PRECISE?
IS IT ORGANIC? DO POINTS DEVELOP IN AN ORGANIC, NATURAL WAY? DO THEY 'UNFOLD'? OR ARE THEY FORCED AND ARTIFICIAL?
DOES IT OPEN UP NEW DOMAINS? OR, ON THE CONTRARY, DOES IT SHUT OFF INQUIRY (BY CONDITIONALIZING FURTHER DISCUSSION OF THE MATTERS ON ACCEPTANCE OF ITS INTERNAL AND POSSIBLY VERY FAULTY LOGIC)?
IS IT ACTUALLY INTELLIGENT OR JUST THE WORK OF SOMEBODY WHO, JUDGING BY THE SUBJECT-MATTER, IS PRESUMED TO BE INTELLIGENT (BUT MAY NOT BE)?
IS IT REAL OR IS IT PHONY?
DO THE SENTENCES EXHIBIT COMPLEX AND COHERENT INTERNAL LOGIC?
IS THE PASSAGE GOVERNED BY A STRONG CONCEPT? OR IS THE ONLY ORGANIZATION DRIVEN PURELY BY EXPOSITORY (AS OPPOSED TO EPISTEMIC) NORMS?
IS THERE SYSTEM-LEVEL CONTROL OVER IDEAS? IN OTHER WORDS, DOES THE AUTHOR SEEM TO RECALL WHAT HE SAID EARLIER AND TO BE IN A POSITION TO INTEGRATE IT INTO POINTS HE HAS MADE SINCE THEN?
ARE THE POINTS 'REAL'? ARE THEY FRESH? OR IS SOME INSTITUTION OR SOME ACCEPTED VEIN OF PROPAGANDA OR ORTHODOXY JUST USING THE AUTHOR AS A MOUTH PIECE?
IS THE WRITING EVASIVE OR DIRECT?
ARE THE STATEMENTS AMBIGUOUS?
DOES THE PROGRESSION OF THE TEXT DEVELOP ACCORDING TO WHO SAID WHAT OR ACCORDING TO WHAT ENTAILS OR CONFIRMS WHAT?
DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?`;

// The exact qualifications from the protocol
const EVALUATION_QUALIFICATIONS = `A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question.

YOU ARE NOT GRADING; YOU ARE ANSWERING THESE QUESTIONS.

YOU DO NOT USE A RISK-AVERSE STANDARD; YOU DO NOT ATTEMPT TO BE DIPLOMATIC; YOU DO NOT ATTEMPT TO COMPLY WITH RISK-AVERSE, MEDIUM-RANGE IQ, ACADEMIC NORMS.

YOU DO NOT MAKE ASSUMPTIONS ABOUT THE LEVEL OF THE PAPER; IT COULD BE A WORK OF THE HIGHEST EXCELLENCE AND GENIUS, OR IT COULD BE THE WORK OF A MORON.

IF A WORK IS A WORK OF GENIUS, YOU SAY THAT, AND YOU SAY WHY; YOU DO NOT SHY AWAY FROM GIVING WHAT MIGHT CONVENTIONALLY BE REGARDED AS EXCESSIVELY "SUPERLATIVE" SCORES; YOU GIVE IT THE SCORE IT DESERVES, NOT THE SCORE THAT A MIDWIT COMMITTEE WOULD SAY IT DESERVES.`;

interface IntelligenceEvaluationResult {
  phase1Response: string;
  phase2Response: string;
  phase3Response?: string;
  finalScore: number;
  provider: string;
}

/**
 * PHASE 1: Send the LLM the questions exactly as specified
 */
async function executePhase1(text: string, provider: LLMProvider): Promise<string> {
  const prompt = `ANSWER THESE QUESTIONS IN CONNECTION WITH THIS TEXT:

${INTELLIGENCE_QUESTIONS}

${EVALUATION_QUALIFICATIONS}

TEXT:
${text}

ANSWER THESE QUESTIONS (AND ALSO GIVE A SCORE OUT OF 100).`;

  return await callLLMProvider(provider, prompt);
}

/**
 * PHASE 2: Push back if score < 95, ask questions de novo
 */
async function executePhase2(text: string, provider: LLMProvider, phase1Response: string, score: number): Promise<string> {
  if (score >= 95) {
    // No pushback needed
    return phase1Response;
  }

  const pushbackPrompt = `YOUR POSITION IS THAT ${100 - score}/100 OUTPERFORM THE AUTHOR WITH RESPECT TO THE COGNITIVE METRIC DEFINED BY THE QUESTION: THAT IS YOUR POSITION, AM I RIGHT? AND ARE YOU SURE ABOUT THAT?

ANSWER THE FOLLOWING QUESTIONS ABOUT THE TEXT DE NOVO:

${INTELLIGENCE_QUESTIONS}

${EVALUATION_QUALIFICATIONS}

TEXT:
${text}

ANSWER THESE QUESTIONS (AND ALSO GIVE A SCORE OUT OF 100).`;

  return await callLLMProvider(provider, pushbackPrompt);
}

/**
 * PHASE 3: Accept and report what the LLM says
 */
function executePhase3(phase2Response: string): string {
  // Simply return the final response - we accept and report what the LLM says
  return phase2Response;
}

/**
 * Helper function to call the appropriate LLM provider
 */
async function callLLMProvider(provider: LLMProvider, prompt: string): Promise<string> {
  try {
    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000
      });
      
      return completion.choices[0]?.message?.content || '';
    } 
    else if (provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      });
      
      return completion.content[0]?.type === 'text' ? completion.content[0].text : '';
    } 
    else if (provider === 'perplexity') {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 4000
        })
      });
      
      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } 
    else if (provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 4000
        })
      });
      
      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } 
    else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error calling ${provider}:`, error);
    throw error;
  }
}

/**
 * Extract score from LLM response
 */
function extractScore(response: string): number {
  // Look for patterns like "85/100", "Score: 73/100", etc.
  const scorePattern = /(\d+)\/100/g;
  const matches = Array.from(response.matchAll(scorePattern));
  
  if (matches.length > 0) {
    // Take the last score found (often the final/summary score)
    return parseInt(matches[matches.length - 1][1]);
  }
  
  // Fallback: look for standalone numbers
  const numberPattern = /\b(\d{1,2})\b/g;
  const numberMatches = Array.from(response.matchAll(numberPattern));
  
  if (numberMatches.length > 0) {
    // Look for numbers in reasonable score range
    for (let i = numberMatches.length - 1; i >= 0; i--) {
      const num = parseInt(numberMatches[i][1]);
      if (num >= 0 && num <= 100) {
        return num;
      }
    }
  }
  
  // Default fallback
  return 75;
}

/**
 * Main function to perform strict 3-phase intelligence evaluation
 */
export async function performStrictIntelligenceEvaluation(
  text: string, 
  provider: LLMProvider
): Promise<IntelligenceEvaluationResult> {
  
  console.log(`STRICT 3-PHASE INTELLIGENCE EVALUATION WITH ${provider.toUpperCase()}`);
  
  // PHASE 1: Send the questions
  console.log("PHASE 1: Sending questions to LLM...");
  const phase1Response = await executePhase1(text, provider);
  const phase1Score = extractScore(phase1Response);
  
  console.log(`PHASE 1 SCORE: ${phase1Score}/100`);
  
  // PHASE 2: Push back if score < 95
  console.log("PHASE 2: Evaluating need for pushback...");
  const phase2Response = await executePhase2(text, provider, phase1Response, phase1Score);
  const phase2Score = extractScore(phase2Response);
  
  console.log(`PHASE 2 SCORE: ${phase2Score}/100`);
  
  // PHASE 3: Accept and report
  console.log("PHASE 3: Accepting final response...");
  const phase3Response = executePhase3(phase2Response);
  const finalScore = extractScore(phase3Response);
  
  console.log(`FINAL SCORE: ${finalScore}/100`);
  
  return {
    phase1Response,
    phase2Response,
    phase3Response,
    finalScore,
    provider
  };
}

/**
 * Perform strict intelligence comparison between two documents
 */
export async function performStrictIntelligenceComparison(
  documentA: string,
  documentB: string,
  provider: LLMProvider
): Promise<{
  analysisA: IntelligenceEvaluationResult;
  analysisB: IntelligenceEvaluationResult;
  comparison: {
    winnerDocument: 'A' | 'B';
    summary: string;
    detailedAnalysis: string;
  };
}> {
  
  console.log(`STRICT 3-PHASE COMPARISON WITH ${provider.toUpperCase()}`);
  
  // Evaluate both documents using the strict protocol
  const analysisA = await performStrictIntelligenceEvaluation(documentA, provider);
  const analysisB = await performStrictIntelligenceEvaluation(documentB, provider);
  
  // Determine winner based on final scores
  const winnerDocument: 'A' | 'B' = analysisA.finalScore >= analysisB.finalScore ? 'A' : 'B';
  const scoreDifference = Math.abs(analysisA.finalScore - analysisB.finalScore);
  
  const summary = `Document ${winnerDocument} demonstrates superior cognitive capacity with a score of ${winnerDocument === 'A' ? analysisA.finalScore : analysisB.finalScore}/100 compared to ${winnerDocument === 'A' ? analysisB.finalScore : analysisA.finalScore}/100.`;
  
  const detailedAnalysis = `COMPARATIVE INTELLIGENCE ANALYSIS:

DOCUMENT A EVALUATION:
${analysisA.phase3Response || analysisA.phase2Response}

DOCUMENT B EVALUATION:
${analysisB.phase3Response || analysisB.phase2Response}

WINNER: Document ${winnerDocument}
SCORE DIFFERENCE: ${scoreDifference} points
CONCLUSION: ${summary}`;
  
  return {
    analysisA,
    analysisB,
    comparison: {
      winnerDocument,
      summary,
      detailedAnalysis
    }
  };
}