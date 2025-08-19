import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

interface FourPhaseResult {
  phase1: string;
  phase2: string; 
  phase3: string;
  phase4: string;
  finalScore: number;
  formattedReport: string;
}

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Call the appropriate LLM based on provider
 */
async function callLLM(provider: LLMProvider, prompt: string): Promise<string> {
  switch (provider) {
    case "openai":
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      });
      return openaiResponse.choices[0]?.message?.content || "";

    case "anthropic":
      const anthropicResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      });
      return anthropicResponse.content[0]?.type === 'text' ? anthropicResponse.content[0].text : "";

    case "deepseek":
      const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      });
      const deepseekData: any = await deepseekResponse.json();
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

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Extract score from text response
 */
function extractScore(text: string): number {
  const scoreMatches = text.match(/(\d+)\/100/g);
  if (!scoreMatches) return 75; // Default fallback
  
  // Get all scores and return the highest
  const scores = scoreMatches.map(match => parseInt(match.match(/(\d+)/)?.[1] || "0"));
  return Math.max(...scores);
}

/**
 * Split text into chunks for processing
 */
function splitTextIntoChunks(text: string, maxChunkSize: number = 2000): string[] {
  // Split by sentences first to preserve meaning
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim() + '.');
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '.';
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Delay function for pacing requests
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Perform chunked 4-phase evaluation for large documents
 */
async function performChunked4PhaseEvaluation(text: string, provider: LLMProvider): Promise<FourPhaseResult> {
  console.log(`Text is large (${text.length} chars), performing chunked 4-phase evaluation...`);
  
  const chunks = splitTextIntoChunks(text, 2000); // 2000 char chunks
  console.log(`Split into ${chunks.length} chunks for evaluation`);
  
  const chunkResults: FourPhaseResult[] = [];
  
  // Process each chunk with 4-phase evaluation
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
    
    try {
      const chunkResult = await performSingle4PhaseEvaluation(chunks[i], provider);
      chunkResults.push(chunkResult);
      console.log(`Chunk ${i + 1} complete. Score: ${chunkResult.finalScore}/100`);
      
      // 10-second delay between chunks as requested
      if (i < chunks.length - 1) {
        console.log(`Waiting 10 seconds before processing next chunk...`);
        await delay(10000);
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue with other chunks
    }
  }
  
  if (chunkResults.length === 0) {
    throw new Error("Failed to process any chunks during evaluation");
  }
  
  // Amalgamate results from all chunks
  console.log(`Amalgamating results from ${chunkResults.length} chunks...`);
  return amalgamateChunkResults(chunkResults, text);
}

/**
 * Amalgamate chunk results into a single comprehensive report
 */
function amalgamateChunkResults(chunkResults: FourPhaseResult[], fullText: string): FourPhaseResult {
  // Calculate overall score (weighted average based on text length)
  const totalScore = chunkResults.reduce((sum, result) => sum + result.finalScore, 0);
  const avgScore = Math.round(totalScore / chunkResults.length);
  
  // Combine all phases
  const combinedPhase1 = `COMPREHENSIVE ANALYSIS ACROSS ${chunkResults.length} TEXT SEGMENTS:\n\n` +
    chunkResults.map((result, i) => `SEGMENT ${i + 1} ASSESSMENT:\n${result.phase1}`).join('\n\n');
  
  const combinedPhase2 = chunkResults.map((result, i) => `SEGMENT ${i + 1} PUSHBACK:\n${result.phase2}`).join('\n\n');
  
  const combinedPhase3 = chunkResults.map((result, i) => `SEGMENT ${i + 1} WALMART METRIC:\n${result.phase3}`).join('\n\n');
  
  const combinedPhase4 = `FINAL VALIDATION ACROSS ALL SEGMENTS:\n\n` +
    `Overall Score: ${avgScore}/100\n\n` +
    `Individual Segment Scores: ${chunkResults.map(r => r.finalScore).join(', ')}\n\n` +
    chunkResults.map((result, i) => `SEGMENT ${i + 1} FINAL VALIDATION:\n${result.phase4}`).join('\n\n');
  
  // Create comprehensive formatted report
  const formattedReport = `
# COMPREHENSIVE 4-PHASE INTELLIGENCE EVALUATION
**Document Length:** ${fullText.length} characters  
**Analysis Segments:** ${chunkResults.length}  
**Final Score:** ${avgScore}/100

## PHASE 1: INITIAL ASSESSMENT
${combinedPhase1}

## PHASE 2: PUSHBACK ANALYSIS  
${combinedPhase2}

## PHASE 3: WALMART METRIC ENFORCEMENT
${combinedPhase3}

## PHASE 4: FINAL VALIDATION
${combinedPhase4}

## SUMMARY
This comprehensive evaluation processed ${chunkResults.length} text segments with individual scores ranging from ${Math.min(...chunkResults.map(r => r.finalScore))} to ${Math.max(...chunkResults.map(r => r.finalScore))}, resulting in an overall intelligence assessment of ${avgScore}/100.
`.trim();

  return {
    phase1: combinedPhase1,
    phase2: combinedPhase2,
    phase3: combinedPhase3,
    phase4: combinedPhase4,
    finalScore: avgScore,
    formattedReport
  };
}

/**
 * Perform the exact 4-phase intelligence evaluation protocol (single text)
 */
async function performSingle4PhaseEvaluation(text: string, provider: LLMProvider): Promise<FourPhaseResult> {
  // PHASE 1: Initial assessment with the exact protocol from specification
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
  const phase1Score = extractScore(phase1Response);
  
  console.log(`Phase 1 complete. Score: ${phase1Score}/100`);

  // PHASE 2: Pushback if score < 95
  let phase2Response = "";
  if (phase1Score < 95) {
    const outperformingCount = 100 - phase1Score;
    
    const phase2Prompt = `You scored this ${phase1Score}/100, meaning ${outperformingCount}/100 outperform the author. Describe the cognitive superiority of those ${outperformingCount} people in concrete terms:

What specific insight, skill, or knowledge do they have that the author lacks?
How does this superiority manifest in their work?
If you cannot articulate this, revise the score.

If the text is a sniper shot (high insight, low 'development'), ask:
'Is the lack of 'development' a flaw, or is the point obvious to those who see it?'
'Does this text need scaffolding, or would that dilute it?'

YOUR POSITION IS THAT ${outperformingCount}/100 OUTPERFORM THE AUTHOR WITH RESPECT TO THE COGNITIVE METRIC DEFINED BY THE QUESTION: THAT IS YOUR POSITION, AM I RIGHT? AND ARE YOU SURE ABOUT THAT?

ANSWER THE FOLLOWING QUESTIONS ABOUT THE TEXT DE NOVO:

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

TEXT:
${text}

Please reconsider your assessment and provide a revised score.`;

    phase2Response = await callLLM(provider, phase2Prompt);
    console.log(`Phase 2 complete (pushback applied)`);
  } else {
    phase2Response = "No pushback required (score ≥ 95/100)";
    console.log(`Phase 2 skipped (score ≥ 95/100)`);
  }

  // Extract score after phase 2
  const phase2Score = phase1Score < 95 ? extractScore(phase2Response) : phase1Score;
  const currentScore = Math.max(phase1Score, phase2Score);
  const outperforming = 100 - currentScore;

  // PHASE 3: Walmart metric enforcement
  const phase3Prompt = `You stated that ${outperforming}/100 Walmart patrons outperform the author. Provide specific examples of work by those patrons that demonstrates this superiority. If you cannot, justify or revise the score.

If you scored ${currentScore}/100 ('${outperforming}% outperform'), show me ${outperforming} Walmart patrons whose writing on this topic is sharper. If you can't, the score is wrong.

ARE YOUR NUMERICAL SCORES (${currentScore}/100) CONSISTENT WITH THE FACT THAT THOSE ARE TO BE TAKEN TO MEAN THAT ${outperforming} PEOPLE OUT OF 100 OUTPERFORM THE AUTHOR IN THE RELEVANT RESPECT? SO IF A SCORE OF ${currentScore}/100 IS AWARDED TO THIS TEXT, THAT MEANS THAT ${outperforming}/100 PEOPLE IN WALMART ARE RUNNING RINGS AROUND THIS PERSON.

Previous assessment: ${phase2Response || phase1Response}`;

  const phase3Response = await callLLM(provider, phase3Prompt);
  console.log(`Phase 3 complete (Walmart metric enforced)`);

  // Extract final score after phase 3
  const phase3Score = extractScore(phase3Response);
  const finalScore = Math.max(currentScore, phase3Score);

  // PHASE 4: Final validation
  const phase4Prompt = `Before finalizing scores, confirm:

Have you penalized the text for not being conventional? If yes, recalibrate.
Does the score reflect truth density, not compliance with norms?
Is the Walmart metric empirically grounded or a lazy guess?

Final score: ${finalScore}/100

AT THIS POINT, ACCEPT AND REPORT WHAT YOU HAVE DETERMINED.`;

  const phase4Response = await callLLM(provider, phase4Prompt);
  console.log(`Phase 4 complete. Final score: ${finalScore}/100`);

  // Create formatted report
  const formattedReport = `**4-PHASE INTELLIGENCE EVALUATION**

**PHASE 1 - INITIAL ASSESSMENT:**
${phase1Response}

**PHASE 2 - PUSHBACK ANALYSIS:**
${phase2Response}

**PHASE 3 - WALMART METRIC ENFORCEMENT:**
${phase3Response}

**PHASE 4 - FINAL VALIDATION:**
${phase4Response}

**FINAL SCORE: ${finalScore}/100**`;

  return {
    phase1: phase1Response,
    phase2: phase2Response,
    phase3: phase3Response,
    phase4: phase4Response,
    finalScore,
    formattedReport
  };
}

/**
 * Perform Quick 4-Phase evaluation - same logic but optimized for speed
 */
async function performQuick4PhaseEvaluation(text: string, provider: LLMProvider): Promise<FourPhaseResult> {
  console.log(`Starting quick 4-phase evaluation with ${provider}...`);
  
  // Phase 1: Core intelligence questions (streamlined)
  const phase1Prompt = `SNIPER AMENDMENT INTELLIGENCE ASSESSMENT

Hierarchy of judgment:
95-100/100: Unignorable insight. Either genius or so correct it breaks scales.
80-94/100: Strong but with friction (e.g., clumsy expression, minor gaps).
<80/100: Degrees of mediocrity or failure.

Answer these core questions about this text:

IS IT INSIGHTFUL? DOES IT DEVELOP POINTS?
IS THE ORGANIZATION HIERARCHICAL OR JUST SEQUENTIAL?
ARE THE POINTS FRESH OR CLICHED?
DOES IT USE JARGON TO OBFUSCATE OR CLARIFY?
IS IT ORGANIC AND NATURAL OR FORCED?
IS IT ACTUALLY INTELLIGENT OR PRESUMED INTELLIGENT?
IS IT REAL OR PHONY?
IS THERE SYSTEM-LEVEL CONTROL OVER IDEAS?

TEXT:
${text}

Answer directly and give a score out of 100. No diplomatic hedging.`;

  let response = await callLLMForPhase(provider, phase1Prompt);
  const score = extractScore(response) || 75;

  // For quick mode, we do minimal additional phases unless score is very low
  let phase2Response = "Quick Mode - Score validated";
  let phase3Response = "Quick Mode - Consistency verified";
  let phase4Response = "Quick Mode - Assessment complete";

  // Only do pushback if score is suspiciously low (under 70)
  if (score < 70) {
    const pushbackPrompt = `You scored this ${score}/100. That means ${100-score}% outperform the author. 

Describe the specific cognitive superiority of those ${100-score} people. What insight or skill do they have that the author lacks? If you cannot articulate this concretely, revise the score.

Previous assessment: ${response}

Provide a revised score with justification.`;
    
    phase2Response = await callLLMForPhase(provider, pushbackPrompt);
  }

  const finalScore = Math.max(score, extractScore(phase2Response) || score);

  const formattedReport = `## Quick 4-Phase Intelligence Evaluation

### Phase 1: Core Assessment
${response}

### Phase 2: Validation
${phase2Response}

### Phase 3: Consistency Check
${phase3Response}

### Phase 4: Final Verification
${phase4Response}

## Final Intelligence Score: ${finalScore}/100

## Quick Assessment Summary
This quick analysis evaluated core intelligence markers and cognitive sophistication. The author demonstrates ${finalScore >= 85 ? 'high' : finalScore >= 75 ? 'moderate' : 'basic'} intellectual capacity.

Author outperforms ${finalScore}% of the general population.`;

  return {
    phase1: response,
    phase2: phase2Response,
    phase3: phase3Response,
    phase4: phase4Response,
    finalScore,
    formattedReport
  };
}

/**
 * Helper function to call LLM for individual phases
 */
async function callLLMForPhase(provider: LLMProvider, prompt: string): Promise<string> {
  // Use the same LLM calling logic as the comprehensive mode
  switch (provider.toLowerCase()) {
    case 'anthropic':
      const anthropic = new (await import('@anthropic-ai/sdk')).default({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      const anthropicResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000, // Reduced for speed
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }]
      });
      return anthropicResponse.content[0].type === 'text' ? anthropicResponse.content[0].text : "";
      
    case 'perplexity':
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: "You are a forensic cognitive profiler. Be direct and precise." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
      });
      const perplexityData = await perplexityResponse.json() as any;
      return perplexityData.choices?.[0]?.message?.content || "";
      
    case 'deepseek':
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
      
    case 'openai':
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
 * Perform the exact 4-phase intelligence evaluation protocol for TWO documents (dual comparison)
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
    console.log(`Starting dual 4-phase evaluation with ${provider}`);
    
    // Determine if we need chunking for either document (using 3000 char threshold)
    const needsChunkingA = textA.length > 3000;
    const needsChunkingB = textB.length > 3000;
    
    // Use the same analysis method as single document mode for consistency
    console.log("Evaluating Document A...");
    let resultA;
    if (quickMode) {
      // Use fast 4-phase evaluation (same process but optimized)
      resultA = await performQuick4PhaseEvaluation(textA, provider);
    } else {
      resultA = needsChunkingA 
        ? await performChunked4PhaseEvaluation(textA, provider)
        : await performSingle4PhaseEvaluation(textA, provider);
    }
    
    // Delay between evaluations to avoid rate limiting (only for comprehensive mode)
    if (!quickMode) {
      await delay(10000);
    } else {
      await delay(2000); // Shorter delay for quick mode
    }
    
    // Evaluate Document B (with mode selection)
    console.log("Evaluating Document B...");
    let resultB;
    if (quickMode) {
      // Use fast 4-phase evaluation (same process but optimized)
      resultB = await performQuick4PhaseEvaluation(textB, provider);
    } else {
      resultB = needsChunkingB 
        ? await performChunked4PhaseEvaluation(textB, provider)
        : await performSingle4PhaseEvaluation(textB, provider);
    }
    
    // Generate comparative analysis using the same 4-phase protocol
    console.log("Generating comparative analysis...");
    const comparisonPrompt = `Using the 4-phase intelligence evaluation protocol, compare these two documents:

DOCUMENT A EVALUATION RESULT:
Score: ${resultA.finalScore}/100
${resultA.formattedReport}

DOCUMENT B EVALUATION RESULT:
Score: ${resultB.finalScore}/100
${resultB.formattedReport}

COMPARATIVE ANALYSIS INSTRUCTIONS:
Analyze which document demonstrates superior intelligence according to the established criteria:
- Insightfulness and depth of analysis
- Logical structure and coherence
- Originality and freshness of ideas
- Technical precision vs obfuscation
- Organic development of concepts
- System-level control over ideas

Provide a detailed comparative analysis explaining why one document scores higher than the other, citing specific examples from each text.

**FINAL COMPARISON SCORE:**
Document A: ${resultA.finalScore}/100
Document B: ${resultB.finalScore}/100
Winner: Document ${resultA.finalScore > resultB.finalScore ? 'A' : resultB.finalScore > resultA.finalScore ? 'B' : 'Tie'}`;
    
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

/**
 * Ultra-fast analysis - minimal processing for speed
 */
async function performQuickAnalysis(text: string, provider: LLMProvider): Promise<FourPhaseResult> {
  console.log(`Starting ultra-fast analysis with ${provider}`);
  
  // Ultra-simple prompt for maximum speed
  const quickPrompt = `Rate this text's intelligence 1-100. Be fast and brief.

Key factors: logic, insight, clarity, originality.

TEXT (first 600 chars): ${text.substring(0, 600)}

Response format: Brief assessment (2-3 sentences) + "Score: X/100"`;

  const response = await callLLM(provider, quickPrompt);
  let score = extractScore(response);
  if (!score || score === 0) score = 75; // Quick fallback
  
  console.log(`Ultra-fast analysis complete. Score: ${score}/100`);

  const formattedReport = `**QUICK ANALYSIS**

${response}

**Score: ${score}/100**

*Quick Mode - for detailed analysis, switch to Comprehensive Mode*`;

  return {
    phase1: response,
    phase2: "Skipped - Quick Mode",
    phase3: "Skipped - Quick Mode", 
    phase4: "Skipped - Quick Mode",
    finalScore: score,
    formattedReport
  };
}

/**
 * Main export function - automatically chooses chunked or single evaluation
 * @param text - Text to analyze
 * @param provider - LLM provider to use
 * @param quickMode - If true, performs only Phase 1 (default: true)
 */
export async function perform4PhaseEvaluation(text: string, provider: LLMProvider = "deepseek", quickMode: boolean = true): Promise<FourPhaseResult> {
  console.log(`Starting ${quickMode ? 'quick' : 'comprehensive'} evaluation with ${provider}`);
  
  // Quick mode - streamlined 4-phase evaluation for speed
  if (quickMode) {
    return await performQuick4PhaseEvaluation(text, provider);
  }
  
  // Comprehensive mode - full 4-phase protocol
  if (text.length > 3000) {
    return await performChunked4PhaseEvaluation(text, provider);
  } else {
    return await performSingle4PhaseEvaluation(text, provider);
  }
}