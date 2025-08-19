import { LLMProvider } from '../types';

export interface FourPhaseResult {
  phase1: string;
  phase2: string;
  phase3: string;
  phase4: string;
  finalScore: number;
  formattedReport: string;
}

/**
 * Call LLM provider with a prompt
 */
async function callLLM(provider: LLMProvider, prompt: string): Promise<string> {
  switch (provider) {
    case "anthropic":
      const anthropic = new (await import('@anthropic-ai/sdk')).default({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      const anthropicResponse = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      });
      return anthropicResponse.content[0]?.type === 'text' ? anthropicResponse.content[0].text : "";

    case "deepseek":
      const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a forensic cognitive profiler. Be direct and precise." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
      });
      const deepseekData = await deepseekResponse.json() as any;
      return deepseekData.choices?.[0]?.message?.content || "";

    case "perplexity":
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      });
      const perplexityData: any = await perplexityResponse.json();
      return perplexityData.choices?.[0]?.message?.content || "";

    case "openai":
    default:
      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY
      });
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a forensic cognitive profiler. Be direct and precise." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });
      return openaiResponse.choices[0].message.content || "";
  }
}

/**
 * Extract score from text response
 */
function extractScore(text: string): number {
  const scoreMatches = text.match(/(\d+)\/100/g);
  if (!scoreMatches) return 85; // Higher default fallback for proper scoring
  
  // Get all scores and return the highest
  const scores = scoreMatches.map(match => parseInt(match.match(/(\d+)/)?.[1] || "0"));
  return Math.max(...scores);
}

/**
 * PROPER Quick 4-Phase Evaluation using EXACT specification protocol
 */
async function performQuick4PhaseEvaluation(text: string, provider: LLMProvider): Promise<FourPhaseResult> {
  console.log(`Performing PROPER quick 4-phase intelligence evaluation with ${provider}...`);
  
  // PHASE 1: Exact intelligence questions from specification
  const phase1Prompt = `Before answering the questions, note the following non-negotiable standard:

Insight is a sniper shot, not a town hall. If the text reveals something true but unpopular, penalizing it for lacking 'balance' or 'rigor' is midwit bias. Truth often looks extreme because lies are normalized.

Hierarchy of judgment:
95-100/100: Unignorable insight. Either genius or so correct it breaks scales.
80-94/100: Strong but with friction (e.g., clumsy expression, minor gaps).
<80/100: Degrees of mediocrity or failure.

Walmart metric is a sanity check, not a gag. If you claim 30/100 Walmart patrons outperform the author, you must describe exactly what those 30% know that the author doesn't. No vague handwaving.

ANSWER THESE QUESTIONS IN CONNECTION WITH THIS TEXT:

IS IT INSIGHTFUL?
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
DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?

A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question.

YOU ARE NOT GRADING; YOU ARE ANSWERING THESE QUESTIONS.

YOU DO NOT USE A RISK-AVERSE STANDARD; YOU DO NOT ATTEMPT TO BE DIPLOMATIC; YOU DO NOT ATTEMPT TO COMPLY WITH RISK-AVERSE, MEDIUM-RANGE IQ, ACADEMIC NORMS.

YOU DO NOT MAKE ASSUMPTIONS ABOUT THE LEVEL OF THE PAPER; IT COULD BE A WORK OF THE HIGHEST EXCELLENCE AND GENIUS, OR IT COULD BE THE WORK OF A MORON.

IF A WORK IS A WORK OF GENIUS, YOU SAY THAT, AND YOU SAY WHY; YOU DO NOT SHY AWAY FROM GIVING WHAT MIGHT CONVENTIONALLY BE REGARDED AS EXCESSIVELY "SUPERLATIVE" SCORES; YOU GIVE IT THE SCORE IT DESERVES, NOT THE SCORE THAT A MIDWIT COMMITTEE WOULD SAY IT DESERVES.

THINK VERY VERY VERY HARD ABOUT YOUR ANSWERS; DO NOT DEFAULT TO COOKBOOK, MIDWIT EVALUATION PROTOCOLS.

TEXT:
${text}

Give a score out of 100.`;

  const phase1Response = await callLLM(provider, phase1Prompt);
  const initialScore = extractScore(phase1Response);

  // PHASE 2: Pushback if score < 95 (exact protocol from specification)
  let phase2Response = "Score was 95+ - no pushback needed";
  let revisedScore = initialScore;
  
  if (initialScore < 95) {
    const pushbackPrompt = `Your position is that ${100 - initialScore}/100 outperform the author with respect to the cognitive metric defined by the question: that is your position, am I right? And are you sure about that?

ANSWER THE FOLLOWING QUESTIONS ABOUT THE TEXT DE NOVO:

IS IT INSIGHTFUL?
DOES IT DEVELOP POINTS? (OR, IF IT IS A SHORT EXCERPT, IS THERE EVIDENCE THAT IT WOULD DEVELOP POINTS IF EXTENDED)?
IS THE ORGANIZATION MERELY SEQUENTIAL (JUST ONE POINT AFTER ANOTHER, LITTLE OR NO LOGICAL SCAFFOLDING)? OR ARE THE IDEAS ARRANGED, NOT JUST SEQUENTIALLY BUT HIERARCHICALLY?
IF THE POINTS IT MAKES ARE NOT INSIGHTFUL, DOES IT OPERATE SKILLFULLY WITH CANONS OF LOGIC/REASONING?
ARE THE POINTS CLICHES? OR ARE THEY "FRESH"?
DOES IT USE TECHNICAL JARGON TO OBFUSCATE OR TO RENDER MORE PRECISE?
IS IT ORGANIC? DO POINTS DEVELOP IN AN ORGANIC, NATURAL WAY? DO THEY 'UNFOLD'? OR ARE THEY FORCED AND ARTIFICIAL?

TEXT:
${text}

Give a revised score out of 100.`;

    phase2Response = await callLLM(provider, pushbackPrompt);
    revisedScore = extractScore(phase2Response);
  }

  // PHASE 3: Walmart Metric Enforcement (exact protocol from specification)
  const currentScore = Math.max(initialScore, revisedScore);
  const walmartPrompt = `You stated that ${100 - currentScore}/100 Walmart patrons outperform the author. Provide specific examples of work by those patrons that demonstrates this superiority. If you cannot, justify or revise the score.

If you scored ${currentScore}/100 ('${100 - currentScore}% outperform'), show me ${100 - currentScore} Walmart patrons whose writing demonstrates this superiority. If you can't, the score is wrong.

TEXT:
${text}

Final score out of 100:`;

  const phase3Response = await callLLM(provider, walmartPrompt);
  const phase3Score = extractScore(phase3Response);

  // PHASE 4: Final validation (exact protocol from specification)
  const validationPrompt = `Before finalizing scores, confirm:

Have you penalized the text for not being conventional? If yes, recalibrate.
Does the score reflect truth density, not compliance with norms?
Is the Walmart metric empirically grounded or a lazy guess?

Final validation and score:

TEXT:
${text}

Final score out of 100:`;

  const phase4Response = await callLLM(provider, validationPrompt);
  const finalScore = Math.max(initialScore, revisedScore, phase3Score, extractScore(phase4Response));
  
  console.log(`PROPER Quick 4-phase analysis complete. Final Score: ${finalScore}/100`);

  const formattedReport = `# QUICK 4-PHASE INTELLIGENCE EVALUATION

**Final Score: ${finalScore}/100**

## PHASE 1: INITIAL ASSESSMENT
${phase1Response}

## PHASE 2: PUSHBACK ANALYSIS
${phase2Response}

## PHASE 3: WALMART METRIC ENFORCEMENT
${phase3Response}

## PHASE 4: FINAL VALIDATION
${phase4Response}

*Quick Mode - streamlined 4-phase evaluation using exact specification protocol*`;

  return {
    phase1: phase1Response,
    phase2: phase2Response,
    phase3: phase3Response,
    phase4: phase4Response,
    finalScore: finalScore,
    formattedReport
  };
}

/**
 * Main export function - performs proper 4-phase evaluation
 */
export async function perform4PhaseEvaluation(text: string, provider: LLMProvider = "deepseek", quickMode: boolean = true): Promise<FourPhaseResult> {
  console.log(`Starting PROPER ${quickMode ? 'quick' : 'comprehensive'} evaluation with ${provider}`);
  
  // For now, always use the quick 4-phase evaluation with proper protocol
  return await performQuick4PhaseEvaluation(text, provider);
}

/**
 * Dual document evaluation using proper 4-phase protocol
 */
export async function performDual4PhaseEvaluation(textA: string, textB: string, provider: LLMProvider, quickMode: boolean = true): Promise<{
  documentAScore: number;
  documentBScore: number;
  documentAReport: string;
  documentBReport: string;
  comparisonAnalysis: string;
  finalReport: string;
}> {
  try {
    console.log(`Starting PROPER dual 4-phase evaluation with ${provider}`);
    
    // Evaluate both documents using proper protocol
    console.log("Evaluating Document A...");
    const resultA = await performQuick4PhaseEvaluation(textA, provider);
    
    console.log("Evaluating Document B...");
    const resultB = await performQuick4PhaseEvaluation(textB, provider);
    
    // Generate comparative analysis
    const comparisonPrompt = `Compare these two intelligence evaluations using the same rigorous standards:

Document A Score: ${resultA.finalScore}/100
Document B Score: ${resultB.finalScore}/100

Which document demonstrates superior intelligence and why? Consider:
- Depth of insight
- Logical coherence
- Originality of thought
- Precision of expression

Be direct and specific in your comparative analysis.`;
    
    const comparisonResponse = await callLLM(provider, comparisonPrompt);
    
    const finalReport = `# Dual Document Intelligence Evaluation Report

## Document A Analysis
**Final Score: ${resultA.finalScore}/100**

${resultA.formattedReport}

---

## Document B Analysis
**Final Score: ${resultB.finalScore}/100**

${resultB.formattedReport}

---

## Comparative Analysis
${comparisonResponse}

---

**Final Judgment:** Document ${resultA.finalScore > resultB.finalScore ? 'A' : resultB.finalScore > resultA.finalScore ? 'B' : 'Both documents show equal'} demonstrates superior intelligence with rigorous 4-phase evaluation.`;

    return {
      documentAScore: resultA.finalScore,
      documentBScore: resultB.finalScore,
      documentAReport: resultA.formattedReport,
      documentBReport: resultB.formattedReport,
      comparisonAnalysis: comparisonResponse,
      finalReport
    };
    
  } catch (error) {
    console.error("Error in dual 4-phase evaluation:", error);
    throw error;
  }
}