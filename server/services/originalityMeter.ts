export type LLMProvider = 'anthropic' | 'deepseek' | 'openai' | 'perplexity';

export interface OriginalityResult {
  phase1?: string;
  phase2?: string;
  phase3?: string;
  phase4?: string;
  finalScore: number;
  formattedReport: string;
  mode: 'originality' | 'intelligence' | 'cogency' | 'overall_quality';
}

export interface DualOriginalityResult {
  documentAScore: number;
  documentBScore: number;
  documentAReport: string;
  documentBReport: string;
  comparisonAnalysis: string;
  finalReport: string;
}

/**
 * Call LLM provider with a prompt - pure passthrough
 */
async function callLLM(provider: LLMProvider, prompt: string): Promise<string> {
  switch (provider) {
    case "anthropic":
      const anthropic = new (await import('@anthropic-ai/sdk')).default({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      const anthropicResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
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
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 4000
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
          temperature: 0.1,
          max_tokens: 4000
        })
      });
      const perplexityData: any = await perplexityResponse.json();
      return perplexityData.choices?.[0]?.message?.content || "";

    case "openai":
      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY
      });
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000
      });
      return openaiResponse.choices[0].message.content || "";

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Extract score from text response
 */
function extractScore(text: string): number {
  // Look for individual question scores in the format "Score: X/100" but EXCLUDE "Final Score:"
  const scoreMatches = text.match(/(?<!Final )Score:\s*(\d+)\/100/g);
  
  if (scoreMatches && scoreMatches.length > 0) {
    // Calculate average of all individual question scores
    const scores = scoreMatches.map(match => {
      const scoreMatch = match.match(/(\d+)/);
      return scoreMatch ? parseInt(scoreMatch[1]) : 0;
    });
    const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    console.log(`Calculated average score from ${scores.length} questions: ${scores.join(', ')} = ${average}/100`);
    return Math.min(Math.max(average, 0), 100);
  }
  
  // Alternative: Look for lines that end with Score: X/100 (but not Final Score)
  const alternativeMatches = text.match(/^(?!.*Final).*Score:\s*(\d+)\/100/gm);
  if (alternativeMatches && alternativeMatches.length > 0) {
    const scores = alternativeMatches.map(match => {
      const scoreMatch = match.match(/(\d+)\/100/);
      return scoreMatch ? parseInt(scoreMatch[1]) : 0;
    });
    const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    console.log(`Alternative calculation: averaged ${scores.length} question scores: ${scores.join(', ')} = ${average}/100`);
    return Math.min(Math.max(average, 0), 100);
  }
  
  // Last resort fallback to any X/100 pattern excluding "Final Score"
  const fallbackMatches = text.match(/(?<!Final Score: )(\d+)\/100/g);
  if (fallbackMatches && fallbackMatches.length > 1) {
    const scores = fallbackMatches.map(match => parseInt(match.match(/(\d+)/)?.[1] || "0"));
    const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    console.log(`Fallback calculation: averaged ${scores.length} scores: ${scores.join(', ')} = ${average}/100`);
    return Math.min(Math.max(average, 0), 100);
  }
  
  // Default fallback
  console.log('No scores found, using default fallback of 75/100');
  return 75;
}

/**
 * Split text into chunks of 500-1000 words
 */
function splitTextIntoChunks(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += 700) { // 700 word chunks (middle of 500-1000 range)
    const chunk = words.slice(i, i + 700).join(' ');
    chunks.push(chunk);
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
 * Get questions for each evaluation mode
 */
function getQuestions(mode: 'originality' | 'intelligence' | 'cogency' | 'overall_quality'): string {
  switch (mode) {
    case 'originality':
      return `IS IT ORIGINAL (NOT IN THE SENSE THAT IT HAS ALREADY BEEN SAID BUT IN THE SENSE THAT ONLY A FECUND MIND COULD COME UP WITH IT)?
EXPLANATION OF LAST QUESTION: IF I PUT IN ISAAC NEWTON, IT SHOULD BE NOT BE DESCRIBED AS 'UNORIGINAL' SIMPLY BECAUSE SOMEBODY (NAMELY, NEWTON) SAID IT HUNDREDS OF YEARS AGO.
ARE THE WAYS THE IDEAS ARE INTERCONNECTED ORIGINAL? OR ARE THOSE INTERCONNECTIONS CONVENTION-DRIVEN AND DOCTRINAIRE?
ARE IDEAS DEVELOPED IN A FRESH AND ORIGINAL WAY? OR IS THE IDEA-DEVELOPMENT MERELY ASSOCIATIVE, COMMONSENSE-BASED (OR COMMON-NONSENSE-BASED), OR DOCTRINAIRE?
IS IT ORIGINAL RELATIVE TO THE DATASET THAT, JUDGING BY WHAT IT SAYS AND HOW IT SAYS IT, IT APPEARS TO BE ADDRESSING? (THIS QUESTION IS MEANT TO RULE OUT 'ORIGINALITY'-BENCHMARKS THAT AUTOMATICALLY CHARACTERIZE DARWIN, FREUD, NEWTON, GALILEO AS 'UNORIGINAL.')
IS IT ORIGINAL IN A SUBSTANTIVE SENSE (IN THE SENSE IN WHICH BACH WAS ORIGINAL) OR ONLY IN A FRIVOLOUS TOKEN SENSE (THE SENSE IN WHICH SOMEBODY WHO RANDOMLY BANGS ON A PIANO IS 'ORIGINAL')?
IF YOU GAVE A ROBOT THE DATASET TO WHICH THE PASSAGE IS A RESPONSE, WOULD IT COME UP WITH THIS? OR, ON THE CONTRARY, DOES IT BUTCHER IDEAS, THIS BEING WHAT GIVES IT A SHEEN OF 'ORIGINALITY'?
IS IT BOILERPLATE (OR IF IT, PER SE, IS NOT BOILER PLATE, IS IT THE RESULT OF APPLYING BOILER PLATE PROTOCOLS IN A BOILER PLATE WAY TO SOME DATASET)?
WOULD SOMEBODY WHO HAD NOT READ IT, BUT WAS OTHERWISE EDUCATED AND INFORMED, COME AWAY FROM IT BEING MORE ENLIGHTENED AND BETTER EQUIPPED TO ADJUDICATE INTELLECTUAL QUESTIONS? OR, ON THE CONTRARY, WOULD HE COME UP CONFUSED WITH NOTHING TANGIBLE TO SHOW FOR IT?
WOULD SOMEBODY READING IT COME AWAY FROM THE EXPERIENCE WITH INSIGHTS THAT WOULD OTHERWISE BE HARD TO ACQUIRE THAT HOLD UP IN GENERAL? OR WOULD WHATEVER HIS TAKEAWAY WAS HAVE VALIDITY ONLY RELATIVE TO VALIDITIES THAT ARE SPECIFIC TO SOME AUTHOR OR SYSTEM AND PROBABLY DO NOT HAVE MUCH OBJECTIVE LEGITIMACY?`;

    case 'intelligence':
      return `IS IT INSIGHTFUL?
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

    case 'cogency':
      return `IS THE POINT BEING DEFENDED (IF THERE IS ONE) SHARP ENOUGH THAT IT DOES NOT NEED ARGUMENTATION?
DOES THE REASONING DEFEND THE POINT BEING ARGUED IN THE RIGHT WAYS?
DOES THE REASONING ONLY DEFEND THE ARGUED FOR POINT AGAINST STRAWMEN?
DOES THE REASONING DEVELOP THE POINT PER SE? IE DOES THE REASONING SHOW THAT THE POINT ITSELF IS STRONG? OR DOES IT 'DEFEND' IT ONLY BY SHOWING THAT VARIOUS AUTHORITIES DO OR WOULD APPROVE OF IT?
IS THE POINT SHARP? IF NOT, IS IT SHARPLY DEFENDED?
IS THE REASONING GOOD ONLY IN A TRIVIAL 'DEBATING' SENSE? OR IS IT GOOD IN THE SENSE THAT IT WOULD LIKELY MAKE AN INTELLIGENT PERSON RECONSIDER HIS POSITION?
IS THE REASONING INVOLVED IN DEFENDING THE KEY CLAIM ABOUT ACTUALLY ESTABLISHING THAT CLAIM? OR IS IT MORE ABOUT OBFUSCATING?
DOES THE REASONING HELP ILLUMINATE THE MERITS OF THE CLAIM? OR DOES IT JUST SHOW THAT THE CLAIM IS ON THE RIGHT SIDE OF SOME (FALSE OR TRIVIAL) PRESUMPTION?
IS THE 'REASONING' IN FACT REASONING? OR IS IT JUST A SERIES OF LATER STATEMENTS THAT CONNECT ONLY SUPERFICIALLY (E.G. BY REFERENCING THE SAME KEY TERMS OR AUTHORS) TO THE ORIGINAL?
IF COGENT, IS IT COGENT IN THE SENSE THAT A PERSON OF INTELLIGENCE WHO PREVIOUSLY THOUGHT OTHERWISE WOULD NOW TAKE IT MORE SERIOUSLY? OR IS IT COGENT ONLY IN THE SENSE THAT IT DOES IN FACT PROVIDE AN ARGUMENT AND TOUCH ALL THE RIGHT (MIDDLE-SCHOOL COMPOSITION CLASS) BASES? IN OTHER WORDS, IS THE ARGUMENTATION TOKEN AND PRO FORMA OR DOES IT ACTUALLY SERVE THE FUNCTION OF SHOWING THE IDEA TO HAVE MERIT?
DOES THE 'ARGUMENTATION' SHOW THAT THE IDEA MAY WELL BE CORRECT? OR DOES IT RATHER SHOW THAT IT HAS TO BE 'ACCEPTED' (IN THE SENSE THAT ONE WILL BE ON THE WRONG SIDE OF SOME PANEL OF 'EXPERTS' IF ONE THINKS OTHERWISE)?
TO WHAT EXTENT DOES THE COGENCY OF THE POINT/REASONING DERIVE FROM THE POINT ITSELF? AND TO WHAT EXTENT IS IT SUPERIMPOSED ON IT BY TORTURED ARGUMENTATION?`;

    case 'overall_quality':
      return `IS IT INSIGHTFUL?
IS IT TRUE?
OR IS TRUE OR FALSE? IN OTHER WORDS, DOES IT MAKE AN ADJUDICABLE CLAIM? (CLAIMS TO THE EFFECT THAT SO AND SO MIGHT HAVE SAID SUCH AND SUCH DO NOT COUNT.)
DOES IT MAKE A CLAIM ABOUT HOW SOME ISSUE IS TO BE RESOLVE OR ONLY ABOUT HOW SOME 'AUTHORITY' MIGHT FEEL ABOUT SOME ASPECT OF THAT ISSUE?
IS IT ORGANIC?
IS IT FRESH?
IS IT THE PRODUCT OF INSIGHT? OR OF SOMEBODY RECYCLING OLD MATERIAL OR JUST RECYCLING SLOGANS/MEMES AND/OR NAME-DROPPING?
IS IT BORING? IE SETTING ASIDE PEOPLE WHO ARE TOO IMPAIRED TO UNDERSTAND IT AND THEREFORE FIND IT BORING, IT IS BORING TO PEOPLE WHO ARE SMART ENOUGH TO UNDERSTAND IT?
DOES IT PRESENT A FRESH NEW ANGLE? IF NOT, DOES IT PROVIDE A FRESH NEW WAY OF DEFENDING OR EVALUATING THE SIGNIFICANCE OF A NOT-SO-FRESH POINT?
WOULD AN INTELLIGENT PERSON WHO WAS NOT UNDER PRESSURE (FROM A PROFESSOR OR COLLEAGUE OR BOSS OF PUBLIC OPINION) LIKELY FIND IT TO BE USEFUL AS AN EPISTEMIC INSTRUMENT (MEANS OF ACQUIRING KNOWLEDGE)?
IF THE POINT IT DEFENDS IS NOT TECHNICALLY TRUE, IS THAT POINT AT LEAST OPERATIONALLY TRUE (USEFUL TO REGARD AS TRUE IN SOME CONTEXTS)?
DOES THE PASSAGE GENERATE ORGANICALLY? DO IDEAS DEVELOP? OR IS IT JUST A SERIES OF FORCED STATEMENTS THAT ARE ONLY FORMALLY OR ARTIFICIALLY RELATED TO PREVIOUS STATEMENTS?
IS THERE A STRONG OVER-ARCHING IDEA? DOES THIS IDEA GOVERN THE REASONING? OR IS THE REASONING PURELY SEQUENTIAL, EACH STATEMENT BEING A RESPONSE TO THE IMMEDIATELY PRECEDING ONE WITHOUT ALSO IN SOME WAY SUBSTANTIATING THE MAIN ONE?
IF ORIGINAL, IS IT ORIGINAL BY VIRTUE OF BEING INSIGHTFUL OR BY VIRTUE OF BEING DEFECTIVE OR FACETIOUS?
IF THERE ARE ELEMENTS OF SPONTANEITY, ARE THEY INTERNAL TO A LARGER, WELL-BEHAVED LOGICAL ARCHITECTURE?
IS THE AUTHOR ABLE TO 'RIFF' (IN A WAY THAT SUPPORTS, RATHER THAN UNDERMINING, THE MAIN POINT AND ARGUMENTATIVE STRUCTURE OF THE PASSAGE)? OR IS IT WOODEN AND BUREAUCRATIC?
IS IT ACTUALLY SMART OR IS IT 'GEEK'-SMART (SMART IN THE WAY THAT SOMEBODY WHO IS NOT PARTICULARLY SMART BUT WHO WAS ALWAYS LAST TO BE PICKED BY THE SOFTBALL TEAM BECOMES SMART)?
IS IT MR. SPOCKS SMART (ACTUALLY SMART) OR Lieutenant DATA SMART (WHAT A DUMB PERSON WOULD REGARD AS SMART)?
IS IT "SMART" IN THE SENSE THAT, FOR CULTURAL OR SOCIAL REASONS, WE WOULD PRESUME THAT ONLY A SMART PERSON WOULD DISCUSS SUCH MATTERS? OR IS IT INDEED--SMART?
IS IT SMART BY VIRTUE BEING ARGUMENTATIVE AND SNIPPY OR BY VIRTUE OF BEING ILLUMINATING?`;

    default:
      throw new Error(`Unknown evaluation mode: ${mode}`);
  }
}

/**
 * Quick mode evaluation - single phase with all questions
 */
export async function performQuickEvaluation(
  text: string,
  provider: LLMProvider = "anthropic",
  mode: 'originality' | 'intelligence' | 'cogency' | 'overall_quality' = 'originality'
): Promise<OriginalityResult> {
  console.log(`Performing quick ${mode} evaluation with ${provider}...`);
  
  const questions = getQuestions(mode);
  
  const prompt = `ANSWER THESE QUESTIONS IN CONNECTION WITH THIS TEXT.

${questions}

TEXT:
${text}

A SCORE OF N/100 (E.G. 73/100) MEANS THAT (100-N)/100 (E.G. 27/100) OUTPERFORM THE AUTHOR WITH RESPECT TO THE PARAMETER DEFINED BY THE QUESTION.

YOU ARE NOT GRADING; YOU ARE ANSWERING THESE QUESTIONS.

YOU DO NOT USE A RISK-AVERSE STANDARD; YOU DO NOT ATTEMPT TO BE DIPLOMATIC; YOU DO NOT ATTEMPT TO COMPLY WITH RISK-AVERSE, MEDIUM-RANGE IQ, ACADEMIC NORMS. YOU DO NOT MAKE ASSUMPTIONS ABOUT THE LEVEL OF THE PAPER; IT COULD BE A WORK OF THE HIGHEST EXCELLENCE AND GENIUS, OR IT COULD BE THE WORK OF A MORON.

IF A WORK IS A WORK OF GENIUS, YOU SAY THAT, AND YOU SAY WHY; YOU DO NOT SHY AWAY FROM GIVING WHAT MIGHT CONVENTIONALLY BE REGARDED AS EXCESSIVELY "SUPERLATIVE" SCORES; YOU GIVE IT THE SCORE IT DESERVES, NOT THE SCORE THAT A MIDWIT COMMITTEE WOULD SAY IT DESERVES.

THINK VERY VERY VERY HARD ABOUT ITS ANSWERS; DO NOT DEFAULT TO COOKBOOK, MIDWIT EVALUATION PROTOCOLS.

DO NOT GIVE CREDIT MERELY FOR USE OF JARGON OR FOR REFERENCING AUTHORITIES. FOCUS ON SUBSTANCE. ONLY GIVE POINTS FOR SCHOLARLY REFERENCES/JARGON IF THEY UNAMBIGUOUSLY INCREASE SUBSTANCE.

Answer these questions and give a score out of 100.`;

  const response = await callLLM(provider, prompt);
  const score = extractScore(response);
  
  // Helper function to clean markdown
  const cleanMarkdown = (text: string) => text
    .replace(/#{1,6}\s*/g, '') // Remove # headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1') // Remove *italic*
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1') // Remove _underline_
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove `code`
    .trim();

  const cleanResponse = cleanMarkdown(response);
  
  let formattedReport = `QUICK ${mode.toUpperCase()} EVALUATION

${cleanResponse}

Final Score: ${score}/100

Quick Mode Analysis Complete`;

  // Clean the final report too
  formattedReport = cleanMarkdown(formattedReport);

  return {
    phase1: response,
    finalScore: score,
    formattedReport,
    mode
  };
}

/**
 * Comprehensive mode evaluation - 4 phases
 */
export async function performComprehensiveEvaluation(
  text: string,
  provider: LLMProvider = "anthropic",
  mode: 'originality' | 'intelligence' | 'cogency' | 'overall_quality' = 'originality'
): Promise<OriginalityResult> {
  console.log(`Performing comprehensive ${mode} evaluation with ${provider}...`);
  
  const questions = getQuestions(mode);
  const baseInstructions = `ANSWER THESE QUESTIONS IN CONNECTION WITH THIS TEXT.

A SCORE OF N/100 (E.G. 73/100) MEANS THAT (100-N)/100 (E.G. 27/100) OUTPERFORM THE AUTHOR WITH RESPECT TO THE PARAMETER DEFINED BY THE QUESTION.

YOU ARE NOT GRADING; YOU ARE ANSWERING THESE QUESTIONS.

YOU DO NOT USE A RISK-AVERSE STANDARD; YOU DO NOT ATTEMPT TO BE DIPLOMATIC; YOU DO NOT ATTEMPT TO COMPLY WITH RISK-AVERSE, MEDIUM-RANGE IQ, ACADEMIC NORMS. YOU DO NOT MAKE ASSUMPTIONS ABOUT THE LEVEL OF THE PAPER; IT COULD BE A WORK OF THE HIGHEST EXCELLENCE AND GENIUS, OR IT COULD BE THE WORK OF A MORON.

IF A WORK IS A WORK OF GENIUS, YOU SAY THAT, AND YOU SAY WHY; YOU DO NOT SHY AWAY FROM GIVING WHAT MIGHT CONVENTIONALLY BE REGARDED AS EXCESSIVELY "SUPERLATIVE" SCORES; YOU GIVE IT THE SCORE IT DESERVES, NOT THE SCORE THAT A MIDWIT COMMITTEE WOULD SAY IT DESERVES.

THINK VERY VERY VERY HARD ABOUT ITS ANSWERS; DO NOT DEFAULT TO COOKBOOK, MIDWIT EVALUATION PROTOCOLS.

DO NOT GIVE CREDIT MERELY FOR USE OF JARGON OR FOR REFERENCING AUTHORITIES. FOCUS ON SUBSTANCE. ONLY GIVE POINTS FOR SCHOLARLY REFERENCES/JARGON IF THEY UNAMBIGUOUSLY INCREASE SUBSTANCE.`;

  // PHASE 1: Initial evaluation
  const phase1Prompt = `${baseInstructions}

QUESTIONS:
${questions}

TEXT:
${text}

Answer each question with quotations and a score out of 100.`;

  const phase1Response = await callLLM(provider, phase1Prompt);
  const phase1Score = extractScore(phase1Response);

  // PHASE 2: Pushback if score < 95
  let phase2Response = "Score was 95+ - no pushback needed";
  let phase2Score = phase1Score;
  
  if (phase1Score < 95) {
    const phase2Prompt = `Your position is that ${100 - phase1Score}/100 outperform the author with respect to the cognitive metric defined by the question: that is your position, am I right? And are you sure about that?

ANSWER THE FOLLOWING QUESTIONS ABOUT THE TEXT DE NOVO:
${questions}

TEXT:
${text}

Give a revised score out of 100.`;

    phase2Response = await callLLM(provider, phase2Prompt);
    phase2Score = extractScore(phase2Response);
  }

  // PHASE 3: Walmart metric check
  const currentScore = Math.max(phase1Score, phase2Score);
  const phase3Prompt = `You stated that ${100 - currentScore}/100 Walmart patrons outperform the author. Provide specific examples of work by those patrons that demonstrates this superiority. If you cannot, justify or revise the score.

TEXT:
${text}

Final score out of 100:`;

  const phase3Response = await callLLM(provider, phase3Prompt);
  const phase3Score = extractScore(phase3Response);

  // PHASE 4: Final validation
  const phase4Prompt = `Before finalizing scores, confirm:

Have you penalized the text for not being conventional? If yes, recalibrate.
Does the score reflect truth density, not compliance with norms?
Is the Walmart metric empirically grounded or a lazy guess?

TEXT:
${text}

Final score out of 100:`;

  const phase4Response = await callLLM(provider, phase4Prompt);
  const finalScore = Math.max(phase1Score, phase2Score, phase3Score, extractScore(phase4Response));

  // Helper function to clean markdown
  const cleanMarkdown = (text: string) => text
    .replace(/#{1,6}\s*/g, '') // Remove # headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1') // Remove *italic*
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1') // Remove _underline_
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove `code`
    .trim();

  // Clean up all markdown formatting
  const cleanPhase1 = cleanMarkdown(phase1Response);
  const cleanPhase2 = cleanMarkdown(phase2Response);
  const cleanPhase3 = cleanMarkdown(phase3Response);
  const cleanPhase4 = cleanMarkdown(phase4Response);

  let formattedReport = `COMPREHENSIVE ${mode.toUpperCase()} EVALUATION

PHASE 1: INITIAL ASSESSMENT
${cleanPhase1}

PHASE 2: PUSHBACK ANALYSIS
${cleanPhase2}

PHASE 3: WALMART METRIC ENFORCEMENT
${cleanPhase3}

PHASE 4: FINAL VALIDATION
${cleanPhase4}

Final Score: ${finalScore}/100

Comprehensive 4-Phase Analysis Complete`;

  // Clean the final report too
  formattedReport = cleanMarkdown(formattedReport);

  return {
    phase1: phase1Response,
    phase2: phase2Response,
    phase3: phase3Response,
    phase4: phase4Response,
    finalScore,
    formattedReport,
    mode
  };
}

/**
 * Chunked evaluation for large texts (>1000 words)
 */
async function performChunkedEvaluation(
  text: string,
  provider: LLMProvider,
  mode: 'originality' | 'intelligence' | 'cogency' | 'overall_quality',
  comprehensive: boolean = false
): Promise<OriginalityResult> {
  console.log(`Text has ${text.split(/\s+/).length} words, performing chunked evaluation...`);
  
  const chunks = splitTextIntoChunks(text);
  console.log(`Split into ${chunks.length} chunks for evaluation`);
  
  const chunkResults: OriginalityResult[] = [];
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
    
    try {
      const chunkResult = comprehensive 
        ? await performComprehensiveEvaluation(chunks[i], provider, mode)
        : await performQuickEvaluation(chunks[i], provider, mode);
      
      chunkResults.push(chunkResult);
      console.log(`Chunk ${i + 1} complete. Score: ${chunkResult.finalScore}/100`);
      
      // 10-second delay between chunks as specified
      if (i < chunks.length - 1) {
        console.log(`Waiting 10 seconds before processing next chunk...`);
        await delay(10000);
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
    }
  }
  
  if (chunkResults.length === 0) {
    throw new Error("Failed to process any chunks during evaluation");
  }
  
  // Amalgamate results without filtering/modifying/censoring
  console.log(`Amalgamating results from ${chunkResults.length} chunks...`);
  
  const totalScore = chunkResults.reduce((sum, result) => sum + result.finalScore, 0);
  const avgScore = Math.round(totalScore / chunkResults.length);
  
  const amalgamatedReport = `CHUNKED ${mode.toUpperCase()} EVALUATION
Document Length: ${text.split(/\s+/).length} words  
Analysis Chunks: ${chunkResults.length}  
Final Score: ${avgScore}/100

CHUNK ANALYSES

${chunkResults.map((result, i) => `CHUNK ${i + 1} (Score: ${result.finalScore}/100)
${result.formattedReport}

---`).join('\n\n')}

AMALGAMATED SUMMARY
This analysis processed ${chunkResults.length} text chunks with individual scores ranging from ${Math.min(...chunkResults.map(r => r.finalScore))} to ${Math.max(...chunkResults.map(r => r.finalScore))}, resulting in an overall ${mode} assessment of ${avgScore}/100.`;

  return {
    phase1: chunkResults.map(r => r.phase1).join('\n\n'),
    phase2: chunkResults.map(r => r.phase2).join('\n\n'),
    phase3: chunkResults.map(r => r.phase3).join('\n\n'),
    phase4: chunkResults.map(r => r.phase4).join('\n\n'),
    finalScore: avgScore,
    formattedReport: amalgamatedReport,
    mode
  };
}

/**
 * Main single document evaluation function
 */
export async function evaluateDocument(
  text: string,
  provider: LLMProvider = "anthropic",
  mode: 'originality' | 'intelligence' | 'cogency' | 'overall_quality' = 'originality',
  comprehensive: boolean = false
): Promise<OriginalityResult> {
  console.log(`Starting ${comprehensive ? 'comprehensive' : 'quick'} ${mode} evaluation with ${provider}`);
  
  const wordCount = text.split(/\s+/).length;
  
  // Use chunked evaluation for texts > 1000 words
  if (wordCount > 1000) {
    return await performChunkedEvaluation(text, provider, mode, comprehensive);
  }
  
  // Use regular evaluation for shorter texts
  return comprehensive 
    ? await performComprehensiveEvaluation(text, provider, mode)
    : await performQuickEvaluation(text, provider, mode);
}

/**
 * Dual document evaluation
 */
export async function evaluateDualDocuments(
  textA: string,
  textB: string,
  provider: LLMProvider = "anthropic",
  mode: 'originality' | 'intelligence' | 'cogency' | 'overall_quality' = 'originality',
  comprehensive: boolean = false
): Promise<DualOriginalityResult> {
  try {
    console.log(`Starting dual ${mode} evaluation with ${provider}`);
    
    // Evaluate Document A
    console.log("Evaluating Document A...");
    const resultA = await evaluateDocument(textA, provider, mode, comprehensive);
    
    // Evaluate Document B
    console.log("Evaluating Document B...");
    const resultB = await evaluateDocument(textB, provider, mode, comprehensive);
    
    // Generate comparison report
    const comparisonPrompt = `Compare these two ${mode} evaluations. Provide a direct comparison without filtering or modifying the analysis.

Document A Score: ${resultA.finalScore}/100
Document B Score: ${resultB.finalScore}/100

Generate a comparison report analyzing which document performs better and why.`;
    
    const comparisonResponse = await callLLM(provider, comparisonPrompt);
    
    const finalReport = `# DUAL DOCUMENT ${mode.toUpperCase()} EVALUATION

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

**Final Judgment:** Document ${resultA.finalScore > resultB.finalScore ? 'A' : resultB.finalScore > resultA.finalScore ? 'B' : 'Both documents show equal'} demonstrates superior ${mode}.`;

    return {
      documentAScore: resultA.finalScore,
      documentBScore: resultB.finalScore,
      documentAReport: resultA.formattedReport,
      documentBReport: resultB.formattedReport,
      comparisonAnalysis: comparisonResponse,
      finalReport
    };
    
  } catch (error) {
    console.error("Error in dual document evaluation:", error);
    throw error;
  }
}