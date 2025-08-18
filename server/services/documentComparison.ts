type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

export interface DocumentComparisonResult {
  winnerDocument: 'A' | 'B';
  documentAScore: number;
  documentBScore: number;
  comparisonAnalysis: string;
  detailedBreakdown: string;
}

interface ThreePhaseResult {
  phase1: string;
  phase2: string;
  phase3: string;
  finalScore: number;
}

/**
 * Simplified 3-Phase Intelligence Evaluation Protocol
 */
async function performThreePhaseAnalysis(
  text: string,
  provider: LLMProvider
): Promise<ThreePhaseResult> {
  
  // PHASE 1: Core analytical questions
  const phase1Prompt = `Answer these questions in connection with this text:

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

Give a score out of 100.

TEXT:
${text}`;

  let phase1Response = await callLLM(provider, phase1Prompt);
  
  // Extract initial score
  const scoreMatch = phase1Response.match(/(\d+)\/100/);
  const initialScore = scoreMatch ? parseInt(scoreMatch[1]) : 75;
  
  // PHASE 2: Pushback if score < 95
  let phase2Response = "";
  if (initialScore < 95) {
    const phase2Prompt = `Your position is that ${100-initialScore} out of 100 outperform the author with respect to the cognitive metric defined by the question: that is your position, am I right? And are you sure about that?

Answer the following questions about the text DE NOVO:
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

PREVIOUS ASSESSMENT:
${phase1Response}

Consider carefully whether your score accurately reflects the cognitive sophistication demonstrated.`;

    phase2Response = await callLLM(provider, phase2Prompt);
  }

  // PHASE 3: Accept and report final assessment
  const phase3Response = phase2Response || phase1Response;
  
  // Extract final score
  const finalScoreMatch = phase3Response.match(/(\d+)\/100/);
  const finalScore = finalScoreMatch ? parseInt(finalScoreMatch[1]) : initialScore;

  return {
    phase1: phase1Response,
    phase2: phase2Response,
    phase3: phase3Response,
    finalScore: finalScore
  };
}

/**
 * Helper function to call LLM based on provider
 */
async function callLLM(provider: LLMProvider, prompt: string): Promise<string> {
  let response = "";
  
  if (provider === "openai") {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a forensic cognitive profiler. Follow instructions precisely and avoid diplomatic hedging." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 3000
    });
    response = completion.choices[0].message.content || "";
  } else if (provider === "anthropic") {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }]
    });
    response = completion.content[0].type === 'text' ? completion.content[0].text : "";
  } else if (provider === "deepseek") {
    const fetch = (await import('node-fetch')).default;
    
    // Add retry logic for DeepSeek API connection issues
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const apiResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { 
                role: "system", 
                content: "You are a forensic cognitive profiler. Follow instructions precisely and avoid diplomatic hedging." 
              },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 3000
          }),
          timeout: 60000 // 60 second timeout
        });
        
        if (!apiResponse.ok) {
          throw new Error(`DeepSeek API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        
        const data = await apiResponse.json() as any;
        response = data.choices?.[0]?.message?.content || "";
        break; // Success, exit retry loop
        
      } catch (error) {
        attempts++;
        console.log(`DeepSeek API attempt ${attempts} failed:`, error);
        
        if (attempts === maxAttempts) {
          // Fall back to OpenAI if DeepSeek fails completely
          console.log("DeepSeek failed, falling back to OpenAI...");
          const OpenAI = (await import('openai')).default;
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              { 
                role: "system", 
                content: "You are a forensic cognitive profiler. Follow instructions precisely and avoid diplomatic hedging." 
              },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 3000
          });
          response = completion.choices[0].message.content || "";
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }
  } else if (provider === "perplexity") {
    const fetch = (await import('node-fetch')).default;
    
    const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { 
            role: "system", 
            content: "You are a forensic cognitive profiler. Follow instructions precisely and avoid diplomatic hedging." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })
    });
    const data = await apiResponse.json() as any;
    response = data.choices?.[0]?.message?.content || "";
  }
  
  return response;
}

const COMPARISON_PROMPT = `GENRE-AWARE DOCUMENT COMPARISON: WHICH MAKES ITS CASE BETTER?

You are comparing two documents to determine which one makes its case more effectively using genre-appropriate criteria.

CRITICAL: Use consistent scoring standards. A document that would score 93/100 in single assessment should score similarly in comparison unless directly outperformed by a superior document.

GENRE-AWARE EVALUATION:
First identify each document's genre (PHILOSOPHICAL ARGUMENT, FORMAL PROOF, EMPIRICAL RESEARCH, HISTORICAL ANALYSIS, TECHNICAL ESSAY, THEORETICAL FRAMEWORK), then apply appropriate criteria:

PHILOSOPHICAL ARGUMENTS: Emphasize conceptual precision, logical coherence, inferential control over empirical proof
FORMAL PROOFS: Prioritize mathematical rigor, logical completeness, formal validity
EMPIRICAL RESEARCH: Focus on data quality, statistical validity, methodological soundness
HISTORICAL ANALYSIS: Value archival evidence, chronological coherence, historical methodology
TECHNICAL ESSAYS: Assess practical applicability, technical accuracy, solution effectiveness
THEORETICAL FRAMEWORKS: Evaluate systematic construction, explanatory power, theoretical coherence

For each document, you must provide:
1. ARGUMENT SUMMARY: What is the document's main argument and key claims?
2. IMPROVED RECONSTRUCTION: Present the argument in improved form - restructure and strengthen the actual argument itself while preserving its core insights. Provide this as an outline of the enhanced argument, not suggestions for improvement.

COMPARISON CRITERIA:
1. Argument Strength: Which document has stronger logical arguments?
2. Evidence Quality: Which provides better evidence for its claims?
3. Persuasiveness: Which is more convincing overall?
4. Clarity of Case: Which presents its argument more clearly?
5. Completeness: Which covers its topic more thoroughly?

SCORING SYSTEM (Use same standards as single document assessment):
- Document A Score: 0-100 (how well Document A makes its case)
- Document B Score: 0-100 (how well Document B makes its case)

CALIBRATION ANCHORS:
- Score 95-100: Comprehensive historical/systematic analysis (e.g., financial regulation with citations, formal logic proofs)
- Score 90-94: Strong academic work with solid evidence and important claims
- Score 80-89: Well-supported academic arguments with good evidence
- Score 70-79: Competent but with some gaps or limitations
- Score below 70: Significant weaknesses in case-making

CRITICAL: If a document would score 93/100 in isolation, it should score 90+ in comparison unless clearly outperformed.
Winner: The document with the higher score

RESPONSE FORMAT (NO MARKDOWN):

WINNER: Document [A or B]

DOCUMENT A SCORE: [Score]/100
DOCUMENT B SCORE: [Score]/100

DOCUMENT A ANALYSIS:
GENRE: [Identify as PHILOSOPHICAL ARGUMENT, FORMAL PROOF, EMPIRICAL RESEARCH, HISTORICAL ANALYSIS, TECHNICAL ESSAY, or THEORETICAL FRAMEWORK]

ARGUMENT SUMMARY: [Summarize the main argument and key claims of Document A]

IMPROVED RECONSTRUCTION: [Present Document A's argument in strengthened form as an outline - the actual improved argument structure, not tips for improvement]

DOCUMENT B ANALYSIS:
GENRE: [Identify as PHILOSOPHICAL ARGUMENT, FORMAL PROOF, EMPIRICAL RESEARCH, HISTORICAL ANALYSIS, TECHNICAL ESSAY, or THEORETICAL FRAMEWORK]

ARGUMENT SUMMARY: [Summarize the main argument and key claims of Document B]

IMPROVED RECONSTRUCTION: [Present Document B's argument in strengthened form as an outline - the actual improved argument structure, not tips for improvement]

COMPARISON ANALYSIS:
[Brief explanation of which document makes its case better and why]

FINAL VERDICT:
[Conclusive statement about which document makes its case better with key reasons]

DOCUMENT A:
`;

export async function compareDocuments(
  documentA: string,
  documentB: string,
  provider: LLMProvider = 'openai'
): Promise<DocumentComparisonResult> {
  // Use the simplified 3-phase protocol for each document
  const analysisA = await performThreePhaseAnalysis(documentA, provider);
  const analysisB = await performThreePhaseAnalysis(documentB, provider);
  
  console.log(`Document A 3-phase score: ${analysisA.finalScore}`);
  console.log(`Document B 3-phase score: ${analysisB.finalScore}`);
  
  // Now perform comparison using the 3-phase results
  const prompt = COMPARISON_PROMPT + 
    `\n\nIMPORTANT: Document A has been assessed at ${analysisA.finalScore}/100 and Document B at ${analysisB.finalScore}/100 using the 3-phase intelligence evaluation protocol. Use these exact scores in your comparison - do not deviate from them.\n\n` +
    "DOCUMENT A:\n" + documentA + "\n\nDOCUMENT B:\n" + documentB;
  
  // Call the LLM directly without using the analysis functions
  let response: string;
  
  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });
    
    response = completion.choices[0].message.content || "No response available";
  } else if (provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
        { role: "user", content: prompt }
      ]
    });
    
    response = completion.content[0].type === 'text' ? completion.content[0].text : "No response available";
  } else if (provider === 'deepseek') {
    const fetch = (await import('node-fetch')).default;
    
    const apiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
      })
    });
    
    const data = await apiResponse.json() as any;
    response = data.choices?.[0]?.message?.content || "No response available";
  } else if (provider === 'perplexity') {
    const fetch = (await import('node-fetch')).default;
    
    const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
      })
    });
    
    const data = await apiResponse.json() as any;
    response = data.choices?.[0]?.message?.content || "No response available";
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  
  console.log('Raw comparison response:', response.substring(0, 500) + '...');
  return parseComparisonResponse(response, analysisA.finalScore, analysisB.finalScore);
}

function parseComparisonResponse(response: string, lockedScoreA: number, lockedScoreB: number): DocumentComparisonResult {
  const cleanResponse = response.replace(/\*\*/g, '').replace(/\*/g, '').replace(/```/g, '');
  
  console.log('Parsing comparison response. Response length:', cleanResponse.length);
  console.log('First 1000 chars:', cleanResponse.substring(0, 1000));
  
  // Use locked-in scores from individual assessments
  const documentAScore = lockedScoreA;
  const documentBScore = lockedScoreB;
  
  console.log('Using locked scores - Document A:', documentAScore, 'Document B:', documentBScore);
  
  // Determine winner based on locked-in scores
  const winnerDocument: 'A' | 'B' = documentAScore >= documentBScore ? 'A' : 'B';
  console.log('Winner determined by scores:', winnerDocument, `(A: ${documentAScore} vs B: ${documentBScore})`);
  
  // Extract document analyses
  let documentAAnalysis = '';
  let documentBAnalysis = '';
  let comparisonAnalysis = '';
  
  const docAStart = cleanResponse.indexOf('DOCUMENT A ANALYSIS:');
  const docBStart = cleanResponse.indexOf('DOCUMENT B ANALYSIS:');
  const comparisonStart = cleanResponse.indexOf('COMPARISON ANALYSIS:');
  const verdictStart = cleanResponse.indexOf('FINAL VERDICT:');
  
  if (docAStart !== -1) {
    const endPos = docBStart !== -1 ? docBStart : (comparisonStart !== -1 ? comparisonStart : cleanResponse.length);
    documentAAnalysis = cleanResponse.substring(docAStart + 20, endPos).trim();
  }
  
  if (docBStart !== -1) {
    const endPos = comparisonStart !== -1 ? comparisonStart : (verdictStart !== -1 ? verdictStart : cleanResponse.length);
    documentBAnalysis = cleanResponse.substring(docBStart + 20, endPos).trim();
  }
  
  if (comparisonStart !== -1) {
    const endPos = verdictStart !== -1 ? verdictStart : cleanResponse.length;
    comparisonAnalysis = cleanResponse.substring(comparisonStart + 19, endPos).trim();
  }
  
  // Combine all analyses into detailed breakdown
  let detailedBreakdown = '';
  if (documentAAnalysis) {
    detailedBreakdown += 'DOCUMENT A ANALYSIS:\n' + documentAAnalysis + '\n\n';
  }
  if (documentBAnalysis) {
    detailedBreakdown += 'DOCUMENT B ANALYSIS:\n' + documentBAnalysis + '\n\n';
  }
  if (verdictStart !== -1) {
    const verdict = cleanResponse.substring(verdictStart).trim();
    detailedBreakdown += verdict;
  }
  
  // If we still don't have analysis, use the entire response
  if (!comparisonAnalysis && !detailedBreakdown) {
    comparisonAnalysis = cleanResponse.trim();
  }
  
  console.log('Parsed result:', {
    winnerDocument,
    documentAScore,
    documentBScore,
    hasAnalysis: !!comparisonAnalysis,
    hasBreakdown: !!detailedBreakdown
  });
  
  return {
    winnerDocument,
    documentAScore,
    documentBScore,
    comparisonAnalysis,
    detailedBreakdown
  };
}