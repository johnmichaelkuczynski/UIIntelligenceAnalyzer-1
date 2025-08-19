import { parseCleanIntelligenceResponse, CleanAnalysis } from './cleanResponseParser';

type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

// Frontend expects DocumentAnalysis structure
interface DocumentAnalysis {
  id: number;
  documentId: number;
  provider: string;
  formattedReport: string;
  overallScore: number;
  surface: {
    grammar: number;
    structure: number;
    jargonUsage: number;
    surfaceFluency: number;
  };
  deep: {
    score: number;
  };
}

interface DocumentComparison {
  winnerDocument: 'A' | 'B';
  summary: string;
  detailedAnalysis: string;
}

export interface IntelligenceComparisonResult {
  analysisA: DocumentAnalysis;
  analysisB: DocumentAnalysis;
  comparison: DocumentComparison;
}

const INTELLIGENCE_COMPARISON_PROMPT = `INTELLIGENCE ASSESSMENT COMPARISON

You are comparing the intelligence levels demonstrated by two different authors based on their writing samples. Your task is to assess the cognitive capacity of each author and determine which demonstrates superior intellectual capability.

SCORING INTERPRETATION:
- Score represents percentile ranking: how many people out of 100 the author outperforms intellectually
- 96-98/100: Doctoral-level theoretical work, systematic framework construction
- 90-95/100: Advanced academic analysis with original insights
- 80-89/100: Competent scholarly work within established boundaries
- 70-79/100: Basic academic competence without depth
- 40-69/100: Average to below-average cognitive demonstration
- 30-39/100: Pseudo-intellectual simulation without substance

For each document, provide a clear intelligence assessment using real evaluation methods:

DOCUMENT [A/B] INTELLIGENCE ASSESSMENT:
🧠 Final Intelligence Score: [X]/100

PERCENTILE INTERPRETATION: This author is intellectually superior to approximately [X]% of the general population.

ASSESSMENT JUSTIFICATION: [Detailed explanation of the intelligence evaluation based on genuine cognitive abilities demonstrated in the text]

EXECUTIVE SUMMARY: [200-word assessment of author's intellectual profile based on real intelligence indicators]

COMPARATIVE INTELLIGENCE PLACEMENT: [How this author compares to undergraduates, graduates, journal authors, canonical thinkers]

Then provide:

WINNER: Document [A/B]
COMPARATIVE ANALYSIS: [Detailed explanation of why one author demonstrates superior cognitive capacity]

Focus on measuring actual intelligence markers, not writing quality or style.`;

/**
 * Helper function to call LLM based on provider
 */
async function callComparisonLLM(provider: string, prompt: string): Promise<string> {
  let response = "";
  
  if (provider === "openai") {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 2000
    });
    return completion.choices[0].message.content || "";
  } else if (provider === "anthropic") {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    });
    return completion.content[0].type === 'text' ? completion.content[0].text : "";
  } else if (provider === "perplexity") {
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      })
    });
    const data = await perplexityResponse.json();
    return data.choices[0]?.message?.content || "";
  } else if (provider === "deepseek") {
    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
      })
    });
    const data = await deepseekResponse.json();
    return data.choices[0]?.message?.content || "";
  }
  return "";
}

/**
 * Perform 4-Phase evaluation for a single document
 */
async function perform4PhaseEvaluation(provider: string, text: string, documentLabel: string): Promise<{
  phase1: string;
  phase2: string; 
  phase3: string;
  phase4: string;
  finalScore: number;
}> {
  
  // PHASE 1: Answer the analytical questions directly
  const phase1Prompt = `Before answering the questions, note the following non-negotiable standard:

Insight is a sniper shot, not a town hall. If the text reveals something true but unpopular, penalizing it for lacking 'balance' or 'rigor' is midwit bias. Truth often looks extreme because lies are normalized.

Hierarchy of judgment:
95-100/100: Unignorable insight. Either genius or so correct it breaks scales.
80-94/100: Strong but with friction (e.g., clumsy expression, minor gaps).
<80/100: Degrees of mediocrity or failure.

Walmart metric is a sanity check, not a gag. If you claim 30/100 Walmart patrons outperform the author, you must describe exactly what those 30% know that the author doesn't. No vague handwaving.

Now answer these questions in connection with this text:

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

Answer these questions and give a score out of 100.`;

  const phase1Response = await callComparisonLLM(provider, phase1Prompt);
  
  // Extract score for pushback decision
  const phase1ScoreMatch = phase1Response.match(/(\d+)\/100/);
  const phase1Score = phase1ScoreMatch ? parseInt(phase1ScoreMatch[1]) : 75;
  
  // PHASE 2: Pushback if score < 95
  let phase2Response = "";
  if (phase1Score < 95) {
    const pushbackScore = 100 - phase1Score;
    const phase2Prompt = `You scored this ${phase1Score}/100, meaning ${pushbackScore}/100 outperform the author. Describe the cognitive superiority of those ${pushbackScore} people in concrete terms:

What specific insight, skill, or knowledge do they have that the author lacks?
How does this superiority manifest in their work?
If you cannot articulate this, revise the score.

If the text is a sniper shot (high insight, low 'development'), ask:
'Is the lack of 'development' a flaw, or is the point obvious to those who see it?'
'Does this text need scaffolding, or would that dilute it?'

Answer the following questions about the text de novo:

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

    phase2Response = await callComparisonLLM(provider, phase2Prompt);
  } else {
    phase2Response = "No pushback required (score ≥ 95/100)";
  }
  
  // Extract revised score from phase 2 if applicable - take the highest score mentioned
  const allScoresInPhase2 = phase2Response.match(/(\d+)\/100/g) || [];
  let revisedScore = phase1Score;
  
  if (allScoresInPhase2.length > 0) {
    const scores = allScoresInPhase2.map(s => {
      const match = s.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    revisedScore = Math.max(...scores, phase1Score);
  }
  
  // PHASE 3: Consistency check with score interpretation
  const currentScore = revisedScore;
  const peopleOutperforming = 100 - currentScore;
  
  const phase3Prompt = `You stated that ${peopleOutperforming}/100 Walmart patrons outperform the author. Provide specific examples of work by those patrons that demonstrates this superiority. If you cannot, justify or revise the score.

For example: If you scored ${currentScore}/100 ('${peopleOutperforming}% outperform'), show me ${peopleOutperforming} Walmart patrons whose writing on this topic is sharper. If you can't, the score is wrong.

Previous assessment: ${phase2Response || phase1Response}

Are your numerical scores (${currentScore}/100) consistent with the fact that ${peopleOutperforming}/100 people in Walmart are running rings around this person? Provide concrete evidence or revise the score.`;

  const phase3Response = await callComparisonLLM(provider, phase3Prompt);
  
  // Extract final score - prioritize the highest score mentioned in phase 3
  const allScoresInPhase3 = phase3Response.match(/(\d+)\/100/g) || [];
  let finalScore = currentScore;
  
  if (allScoresInPhase3.length > 0) {
    const scores = allScoresInPhase3.map(s => {
      const match = s.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    finalScore = Math.max(...scores, currentScore);
  }

  // PHASE 4: Final validation before accepting
  const phase4Prompt = `Before finalizing scores, confirm:

Have you penalized the text for not being conventional? If yes, recalibrate.
Does the score reflect truth density, not compliance with norms?
Is the Walmart metric empirically grounded or a lazy guess?

Final score: ${finalScore}/100`;

  const phase4Response = await callComparisonLLM(provider, phase4Prompt);

  return {
    phase1: phase1Response,
    phase2: phase2Response,
    phase3: phase3Response,
    phase4: phase4Response,
    finalScore: finalScore
  };
}

export async function performIntelligenceComparison(
  documentA: string,
  documentB: string,
  provider: LLMProvider
): Promise<IntelligenceComparisonResult> {
  
  console.log(`COMPARING INTELLIGENCE WITH ${provider.toUpperCase()}`);
  
  // Import the 4-phase evaluation function
  const { perform4PhaseEvaluation } = await import('./fourPhaseEvaluation');
  
  // Perform 4-phase evaluation for Document A with chunking support
  console.log(`Starting 4-phase evaluation for Document A (${documentA.length} chars)`);
  const evaluationA = await perform4PhaseEvaluation(documentA, provider);
  console.log(`Document A 4-phase score: ${evaluationA.finalScore}`);
  
  // Perform 4-phase evaluation for Document B with chunking support  
  console.log(`Starting 4-phase evaluation for Document B (${documentB.length} chars)`);
  const evaluationB = await perform4PhaseEvaluation(documentB, provider);
  console.log(`Document B 4-phase score: ${evaluationB.finalScore}`);
  
  // Create comprehensive reports using the formatted reports from 4-phase evaluation
  const reportA = evaluationA.formattedReport;
  const reportB = evaluationB.formattedReport;



  // Create document analyses
  const analysisA: DocumentAnalysis = {
    id: 0,
    documentId: 0,
    provider: `${provider} - 4-Phase Analysis`,
    formattedReport: reportA,
    overallScore: evaluationA.finalScore,
    surface: {
      grammar: Math.max(0, evaluationA.finalScore - 10),
      structure: Math.max(0, evaluationA.finalScore - 5),
      jargonUsage: Math.min(100, evaluationA.finalScore + 5),
      surfaceFluency: evaluationA.finalScore
    },
    deep: {
      score: evaluationA.finalScore
    }
  };
  
  const analysisB: DocumentAnalysis = {
    id: 1,
    documentId: 1,
    provider: `${provider} - 4-Phase Analysis`,
    formattedReport: reportB,
    overallScore: evaluationB.finalScore,
    surface: {
      grammar: Math.max(0, evaluationB.finalScore - 10),
      structure: Math.max(0, evaluationB.finalScore - 5),
      jargonUsage: Math.min(100, evaluationB.finalScore + 5),
      surfaceFluency: evaluationB.finalScore
    },
    deep: {
      score: evaluationB.finalScore
    }
  };

  // Determine winner based on scores
  const winnerDocument: 'A' | 'B' = evaluationA.finalScore >= evaluationB.finalScore ? 'A' : 'B';
  console.log(`Winner determined by scores: ${winnerDocument} (A: ${evaluationA.finalScore} vs B: ${evaluationB.finalScore})`);

  const comparison: DocumentComparison = {
    winnerDocument,
    summary: `Document ${winnerDocument} demonstrates superior cognitive sophistication with a score of ${winnerDocument === 'A' ? evaluationA.finalScore : evaluationB.finalScore}/100 versus ${winnerDocument === 'A' ? evaluationB.finalScore : evaluationA.finalScore}/100.`,
    detailedAnalysis: `**COMPARATIVE INTELLIGENCE ANALYSIS**
    
Document A Score: ${evaluationA.finalScore}/100
Document B Score: ${evaluationB.finalScore}/100

Winner: Document ${winnerDocument}

The evaluation used the comprehensive 4-phase protocol with anti-diplomatic instructions, pushback methodology, and consistency verification to ensure accurate assessment of cognitive sophistication.`
  };

  return {
    analysisA,
    analysisB,
    comparison
  };
}

function parseIntelligenceComparisonResponse(
  response: string,
  provider: string,
  documentA: string,
  documentB: string
): IntelligenceComparisonResult {
  
  // Split response into document analyses
  const docAStart = response.indexOf('DOCUMENT A INTELLIGENCE ASSESSMENT:');
  const docBStart = response.indexOf('DOCUMENT B INTELLIGENCE ASSESSMENT:');
  const winnerStart = response.indexOf('WINNER:');
  const comparisonStart = response.indexOf('COMPARATIVE ANALYSIS:');
  
  let analysisAText = '';
  let analysisBText = '';
  let comparisonText = '';
  
  if (docAStart !== -1 && docBStart !== -1) {
    analysisAText = response.substring(docAStart, docBStart).trim();
    
    const endBPos = winnerStart !== -1 ? winnerStart : response.length;
    analysisBText = response.substring(docBStart, endBPos).trim();
  }
  
  if (comparisonStart !== -1) {
    comparisonText = response.substring(comparisonStart + 20).trim();
  }
  
  // Parse individual analyses
  const cleanAnalysisA = parseCleanIntelligenceResponse(analysisAText, provider, documentA);
  const cleanAnalysisB = parseCleanIntelligenceResponse(analysisBText, provider, documentB);
  
  // Convert CleanAnalysis to DocumentAnalysis format
  const analysisA: DocumentAnalysis = {
    id: 0,
    documentId: 0,
    provider: cleanAnalysisA.provider,
    formattedReport: cleanAnalysisA.formattedReport,
    overallScore: cleanAnalysisA.overallScore,
    surface: {
      grammar: Math.max(0, cleanAnalysisA.overallScore - 10),
      structure: Math.max(0, cleanAnalysisA.overallScore - 5),
      jargonUsage: Math.min(100, cleanAnalysisA.overallScore + 5),
      surfaceFluency: cleanAnalysisA.overallScore
    },
    deep: {
      score: cleanAnalysisA.overallScore
    }
  };
  
  const analysisB: DocumentAnalysis = {
    id: 1,
    documentId: 1,
    provider: cleanAnalysisB.provider,
    formattedReport: cleanAnalysisB.formattedReport,
    overallScore: cleanAnalysisB.overallScore,
    surface: {
      grammar: Math.max(0, cleanAnalysisB.overallScore - 10),
      structure: Math.max(0, cleanAnalysisB.overallScore - 5),
      jargonUsage: Math.min(100, cleanAnalysisB.overallScore + 5),
      surfaceFluency: cleanAnalysisB.overallScore
    },
    deep: {
      score: cleanAnalysisB.overallScore
    }
  };
  
  // Determine winner
  let winnerDocument: 'A' | 'B' = 'A';
  const winnerMatch = response.match(/WINNER:\s*Document\s*([AB])/i);
  if (winnerMatch) {
    winnerDocument = winnerMatch[1].toUpperCase() as 'A' | 'B';
  } else {
    // Fallback to score comparison
    winnerDocument = analysisA.overallScore >= analysisB.overallScore ? 'A' : 'B';
  }
  
  return {
    analysisA,
    analysisB,
    comparison: {
      winnerDocument,
      summary: `Document ${winnerDocument} demonstrates superior cognitive capacity`,
      detailedAnalysis: comparisonText || response
    }
  };
}