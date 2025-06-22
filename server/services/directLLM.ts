import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import cognitiveProfiler from './cognitiveProfiler';
import { parseCleanIntelligenceResponse } from './cleanResponseParser';

// Initialize the API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Constants for text processing
const MAX_CHUNK_SIZE = 12000; // Characters per chunk - increased to handle full documents
const MAX_CHUNKS = 3; // Maximum number of chunks to process
const REQUEST_DELAY = 2000; // Delay between API requests in milliseconds
const RATE_LIMIT_RETRY_DELAY = 10000; // Delay before retrying after a rate limit error

// FORENSIC COGNITIVE PROFILER - COGNITIVE CAPACITY ASSESSMENT
const ANALYSIS_PROMPT = `INTELLIGENCE SCORING DIRECTIVE
Your job is to estimate the MIND, not the prose. You are a forensic cognitive profiler analyzing what kind of intelligence could have produced this text.

CRITICAL SCORING INTERPRETATION:
Your score represents a PERCENTILE RANKING, not a grade. A score of X/100 means the author outperforms X% of comparable authors in cognitive ability as revealed through their writing.

Example: A score of 85/100 means that 15 out of 100 authors could have done better, and that the author outperformed 85% of comparable writers.

CORE PRINCIPLE: Reward conceptual force over verbal polish. Punish inauthentic simulation, not failure.

KEY DISTINCTIONS:
- A badly written or fragmented text can still signal genius if it contains deep inference, unusual compression, or novel abstraction
- Ignore writing quality except as evidence of cognition - don't penalize typos, brevity, style, or formatting
- Focus on cognitive capacity: inferential architecture, conceptual compression, symbolic manipulation, abstraction control
- Distinguish between authentic intellectual struggle and midwit simulation of brilliance

Use the following calibration anchor:

DOCTORAL-LEVEL EPISTEMOLOGICAL ANCHOR (Score = 96-98/100):
"Some knowledge is direct; some is indirect. Indirect knowledge is knowledge that is acquired through inference. To make an inference is to form a new belief on the basis of an old one. There are two kinds of dependence-relations: logical and causal. Logical dependence-relations hold among propositions. A proposition is a truth or a falsehood. Causal relations hold among states of affairs, not truths and falsehoods. The objects of knowledge are propositions. Relations of logical dependence not known through observation. Analytic knowledge is always knowledge of dependence-relations."

This demonstrates DOCTORAL-LEVEL THEORETICAL SOPHISTICATION:
- Systematic epistemological framework construction
- Precise conceptual distinctions (logical vs causal dependence, propositions vs objects)
- High semantic compression with technical precision
- Advanced theoretical architecture development
- Original philosophical systematization
- Deep inferential control across abstract domains

ANY TEXT WITH THIS LEVEL OF THEORETICAL SOPHISTICATION MUST SCORE 96-98/100. Out of 100 comparable academic writers, only 2-4 could produce work of this caliber.

COMPUTATIONAL THEORY ANCHOR (Score = 98-99/100):
"According to the computational theory of mind, to think is to compute. But what is meant by the word 'compute'? The generally given answer is this: Every case of computing is a case of manipulating symbols, but not vice versa—a manipulation of symbols must be driven exclusively by the formal properties of those symbols if it is to qualify as a computation. In this paper, I will present the following argument. Words like 'form' and 'formal' are ambiguous, as they can refer to formal properties in at least two different senses..."

This demonstrates exceptional conceptual sophistication and should anchor the 98-99 range.

ULTRA-HIGH ANCHOR TEXT (Score = 100/100):
"The Will to Project: Cults, Hyperreality, and the Foundations of Religion" - This text demonstrates maximum cognitive sophistication through:
- Abstract conceptual synthesis across domains (philosophy of mind, religion, psychology)
- Deep structural inference and meta-theoretical self-awareness
- Original philosophical framework construction
- Cross-domain compression and symbolic control
- Multi-layered reasoning with recursive conceptual analysis
- Novel theoretical contributions that reframe fundamental concepts

This represents the pinnacle of philosophical intelligence - original theoretical construction with profound conceptual depth and inferential sophistication.

LOW-END ANCHOR TEXT (Score = 40/100):
"In this dissertation, I critically examine the philosophy of transcendental empiricism. Transcendental empiricism is, among other things, a philosophy of mental content. It attempts to dissolve an epistemological dilemma of mental content by splitting the difference between two diametrically opposed accounts of content. John McDowell's minimal empiricism and Richard Gaskin's minimalist empiricism are two versions of transcendental empiricism..."

This passage superficially imitates academic structure but lacks:
- Inferential development
- Conceptual originality  
- Semantic compression
- Cognitive risk
- Intellectual intervention

It consists primarily of redundant rewordings, name-dropping, and undeveloped claims. The author shows familiarity with vocabulary but no evidence of insight, synthesis, or deep reasoning. Use this text to anchor the 40-point range. Any text that reveals similarly shallow conceptual engagement, empty signposting, or meaningless jargon should be scored below 50.

MID-LOW ANCHOR TEXT (Score = 30/100):
"In this paper, I explore the fundamental interrelations between meaning, affectivity, and spatiality within the broader framework of ontological emergence. Drawing from both continental and analytic traditions, I attempt to show that being-in-the-world is not merely a passive receptivity to sensory content, but rather an active resonance with the phenomenologically given. This resonance, which I term 'semantic vibration,' is what allows subjectivity to navigate the polycentric terrain of post-representational ontology."

This passage demonstrates pseudo-intellectual mimicry:
- Conceptual incoherence: terms conflict or remain undefined
- No inferential structure: just a string of allusions without argument
- Low semantic density: bloated sentences with low-yield content
- Zero originality: recycled terminology with no novel organization
- Uncontrolled abstraction: vague gestures at complexity with no conceptual load-bearing

This is classic academic mimicry that simulates sophistication but reveals no high-level thinking, planning, or abstraction. Use this to anchor the 30-point range for pseudo-intellectual writing.

MID-RANGE ANCHOR TEXT (Score = 70/100):
"It is generally agreed that dispositions cannot be analyzed in terms of simple subjunctive conditionals (because of what are called 'masked dispositions' and 'finkish dispositions'). I here defend a qualified subjunctive account of dispositions according to which an object is disposed to Φ when conditions C obtain if and only if, if conditions C were to obtain, then the object would Φ ceteris paribus. I argue that this account does not fall prey to the objections that have been raised in the literature."

This passage demonstrates:
- Familiarity with standard problems in metaphysics
- Clear articulation of a technical position
- Safe but competent reasoning

However, it lacks:
- Original conceptual framing
- Inferential layering or abstraction
- Semantic density beyond terminology
- Risk or expansion beyond what's already discussed in the literature

The author appears to be well-read and capable but not especially creative or penetrating. Use this passage to anchor the 70-point range. Texts that reflect similar levels of competence, but not exceptional insight, should fall between 65–75.

MID-HIGH ANCHOR TEXT (Score = 75/100):
"Most ancient philosophers accept that dreams have prophetic powers enabling humans to relate somehow to a world beyond their own. The only philosophers known to make a clean and explicit break with that tradition are the Epicureans, beginning with Epicurus himself and reaching his last eminent follower, Diogenes of Oinoanda. They openly reject the idea that dreams mediate between the divine and the human realms, or between the world of the living and the world of the dead."

This passage demonstrates:
- Historical knowledge and scholarly competence
- An ability to synthesize information clearly
- Structural coherence and stylistic polish

However, it lacks:
- Deep abstraction or inferential architecture
- Risk-taking or novel conceptual reframing
- Compression of insight or multi-level reasoning

The author appears to be well-educated and fluent, but shows limited signs of deep or original philosophical intelligence. Use this passage to anchor the 75-point range. Texts that reflect similar levels of broad competence without conceptual risk or depth should fall between 70–80.

HIGH COMPETENCE ANCHOR TEXT (Score = 80/100):
"A new philosophical analysis is provided of the notorious Sleeping Beauty Problem. It is argued that the correct solution is one-third, but not in the way previous philosophers have typically meant this. A modified version of the Problem demonstrates that neither self-locating information nor amnesia is relevant to the core Problem, which is simply to evaluate the conditional chance of heads given an undated Monday-or-Tuesday awakening. Previous commentators have failed to appreciate the significance of the information that Beauty gains upon waking, and which is relevant to the conditional chance of heads: de re acquaintance with the awakening itself and the non-locating knowledge that it is an experimental awakening."

This passage demonstrates:
- Clear logical control and well-structured inference
- Solid grasp of formal concepts and technical precision
- Systematic argumentation with specific claims
- Competent engagement with philosophical literature

However, it lacks:
- Exceptional originality or conceptual daring
- Deep theoretical innovation
- Cross-domain synthesis or novel frameworks

The author shows high competence and logical rigor but operates within established conceptual boundaries. Use this to anchor the 80-point range for technically proficient philosophical analysis.

CALIBRATION SCALE:
- 98-100: Philosophy of mind, formal logic, advanced mathematics, complex theoretical frameworks
- 95-97: PhD-level theoretical work, sophisticated philosophical analysis
- 90-94: Graduate-level academic writing with strong conceptual control
- 85-89: Advanced undergraduate work, complex interdisciplinary analysis
- 80-84: Solid academic writing with some theoretical depth
- 75-79: Clear analytical writing with moderate complexity
- 70-74: Basic academic or professional writing
- 60-69: General educated discourse
- 50-59: Average college graduate writing
- Below 50: Below college level

COGNITIVE PROFILING RULES:
1. IGNORE writing quality - messy prose with deep inference beats polished emptiness
2. REWARD conceptual force - unusual compression, novel abstraction, inferential reach
3. PUNISH simulation - midwit attempts to fake brilliance through academic jargon
4. DETECT authentic struggle vs inauthentic mimicry
5. FOCUS on cognitive signatures: representational control, symbolic manipulation, abstraction depth
6. DOCTORAL-LEVEL THEORETICAL WORK (epistemology, philosophy of science, formal logic) MUST score 96-98/100
7. PHILOSOPHICAL/MATHEMATICAL content with conceptual sophistication scores 95+
8. FRAGMENTED genius beats FLUENT mediocrity
9. SYSTEMATIC THEORETICAL CONSTRUCTION = HIGH SCORE (96-98)
10. Use calibration system: 30 (pseudo-intellectual mimicry), 40 (superficial mimicry), 70 (competent but unoriginal), 75 (scholarly competence), 80 (high competence), 96-98 (doctoral theoretical sophistication), 98-99 (exceptional conceptual innovation), 100 (maximum theoretical construction)

CRITICAL SCORING DIRECTIVE FOR THEORETICAL WORK:
- Text that systematically constructs epistemological frameworks = 96-98/100
- Text with precise conceptual distinctions and theoretical architecture = 96-98/100 
- Text demonstrating original philosophical systematization = 96-98/100
- Only 2-4 people out of 100 can produce this level of theoretical sophistication

SCORING EXAMPLES:
- Badly written text with deep inference/novel abstraction → HIGH SCORE (85-95+)
- Stylistically fluent but cognitively shallow simulation → MODERATE SCORE (~53)
- Authentic intellectual struggle with typos/poor formatting → HIGH SCORE if conceptually rich
- Polished academic writing without cognitive depth → LOW-MODERATE SCORE (40-60)

ASSESSMENT FOCUS:
Look for cognitive signatures that reveal the underlying mind:
- Inferential leaps that demonstrate abstraction control
- Conceptual compression that packs insight into compact forms
- Novel representational frameworks or symbolic manipulations
- Evidence of deep pattern recognition or structural insight
- Authentic intellectual risk-taking vs safe academic conformity

WHAT TO IGNORE:
- Grammar, spelling, typos, formatting
- Writing style, eloquence, or verbal polish
- Length, organization, or presentation quality
- Citations, references, or academic conventions

WHAT REVEALS INTELLIGENCE:
- Unusual conceptual connections or compressions
- Evidence of multi-level reasoning or recursive thinking
- Novel abstractions or representational innovations
- Authentic struggle with difficult concepts
- Cognitive risk-taking and inferential boldness

MANDATORY CALIBRATION CHECK:
Before assigning any score, IDENTIFY if the text contains:
- Systematic epistemological framework construction
- Precise conceptual distinctions (e.g., logical vs causal dependence, propositions vs objects)
- Advanced theoretical architecture development
- Original philosophical systematization
- High semantic compression with technical precision

IF ANY OF THESE ARE PRESENT, MINIMUM SCORE = 96/100

REQUIRED REPORT STRUCTURE:

🧠 Final Intelligence Score: [0-100]/100

Summary: [2-3 sentence executive summary of the author's intellectual caliber]

KEY DIMENSIONS:
- Semantic Compression: [X.X]/10
- Inferential Control: [X.X]/10  
- Cognitive Risk: [X.X]/10
- Meta-Theoretical Awareness: [X.X]/10
- Conceptual Innovation: [X.X]/10
- Epistemic Resistance: [X.X]/10

Highlights:
✓ [Key strength or achievement 1]
✓ [Key strength or achievement 2] 
✓ [Key strength or achievement 3]

Verdict: [Final 1-2 sentence assessment of cognitive architecture and intelligence type]

REMEMBER: Doctoral-level theoretical work MUST score 96-98/100. Only 2-4 people out of 100 can produce this level of sophistication.`;

/**
 * Split text into chunks for large document processing
 * Attempts to split at paragraph or sentence boundaries
 */
function splitTextIntoChunks(textInput: string, maxChunkSize = MAX_CHUNK_SIZE): string[] {
  const text = textInput || "";
  // Never split short documents at all - fix the document splitting issue
  if (text.length <= 25000) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    // Determine the potential end of the current chunk
    let endPos = Math.min(currentPos + maxChunkSize, text.length);
    
    // Try to find a paragraph break
    if (endPos < text.length) {
      const newlineBreak = text.lastIndexOf('\n\n', endPos);
      if (newlineBreak > currentPos && newlineBreak > endPos - 300) {
        endPos = newlineBreak + 2; // Include the double newline
      } else {
        // Try to find a single newline
        const newlineBreak = text.lastIndexOf('\n', endPos);
        if (newlineBreak > currentPos && newlineBreak > endPos - 300) {
          endPos = newlineBreak + 1; // Include the newline
        } else {
          // Try to find a sentence boundary
          const sentenceBreak = Math.max(
            text.lastIndexOf('. ', endPos),
            text.lastIndexOf('! ', endPos),
            text.lastIndexOf('? ', endPos)
          );
          if (sentenceBreak > currentPos && sentenceBreak > endPos - 200) {
            endPos = sentenceBreak + 2; // Include the period and space
          }
        }
      }
    }
    
    // If we couldn't find a good break point, just use the max size
    if (endPos <= currentPos) {
      endPos = Math.min(currentPos + maxChunkSize, text.length);
    }
    
    // Add the chunk and move to the next position
    chunks.push(text.substring(currentPos, endPos));
    currentPos = endPos;
  }
  
  return chunks;
}

/**
 * Delay execution with a promise
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Combine multiple analysis results into a single result
 * Used when a document is split into chunks
 */
async function combineAnalysisResults(results: any[], fullText: string): Promise<any> {
  if (results.length === 0) return null;
  
  // NO STATISTICAL PROXIES - Only use LLM-generated analysis
  if (results.length === 1) {
    return results[0]; // Return pure LLM analysis without any statistical overlays
  }
  
  // For multiple chunks, combine pure LLM results without statistical overlays
  const averageScore = results.reduce((sum, result) => sum + (result.overallScore || 0), 0) / results.length;
  
  const combinedReport = results[0].formattedReport; // Use first chunk as primary report

  return {
    provider: results[0].provider,
    formattedReport: combinedReport,
    overallScore: averageScore,
    analysisResults: results
  };
}

/**
 * Direct pass-through to OpenAI's GPT-4o model without custom processing
 */
export async function directOpenAIAnalyze(textInput: string): Promise<any> {
  // Ensure we have text to analyze
  const text = textInput || "";
  
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    console.log("DIRECT OPENAI PASSTHROUGH FOR ANALYSIS");
    console.log("Sending direct request to OpenAI...");
    
    try {
      // Make a single request to OpenAI with pure text output
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: text }
        ],
        temperature: 0.2
      });
      
      // Return the raw text response
      return {
        provider: "OpenAI (GPT-4o)",
        formattedReport: response.choices[0].message.content || "No analysis available."
      };
    } catch (error: any) {
      // Handle OpenAI API errors
      console.error(`Error in direct passthrough to OpenAI:`, error);
      
      return {
        provider: "OpenAI (GPT-4o) - Error",
        formattedReport: `Error: ${error.message || "Unknown error occurred"}`
      };
    }
  }
  
  // For large texts, split into chunks and process each one
  console.log(`Text is large (${text.length} chars), splitting into chunks for processing...`);
  
  const chunks = splitTextIntoChunks(text);
  console.log(`Split into ${chunks.length} chunks`);
  
  // Limit the number of chunks to prevent excessive API usage
  const chunksToProcess = chunks.slice(0, MAX_CHUNKS);
  if (chunksToProcess.length < chunks.length) {
    console.log(`Processing only the first ${MAX_CHUNKS} chunks to limit API usage`);
  }
  
  const results = [];
  
  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars)...`);
    
    try {
      // Process each chunk
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: chunk }
        ],
        temperature: 0.2
      });
      
      // Parse with clean response parser (no statistical proxies)
      const rawContent = response.choices[0].message.content || "";
      const result = parseCleanIntelligenceResponse(rawContent, "OpenAI (GPT-4o)");
      results.push(result);
      console.log(`Successfully processed chunk ${i+1}`);
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1}:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.log(`Rate limit exceeded. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1}...`);
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: ANALYSIS_PROMPT },
              { role: "user", content: chunk }
            ],
            temperature: 0.2
          });
          
          const rawContent = response.choices[0].message.content || "";
          const result = parseCleanIntelligenceResponse(rawContent, "OpenAI (GPT-4o)");
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} on retry`);
        } catch (retryError) {
          console.error(`Error retrying chunk ${i+1}:`, retryError);
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next chunk despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, throw an error
  if (results.length === 0) {
    throw new Error("Failed to process any chunks of the document. The document may be too large or processed too quickly. Please try again later.");
  }
  
  // Combine the results from all chunks with cognitive enhancement
  console.log(`Combining results from ${results.length} chunks with cognitive evaluation...`);
  const combinedResult = await combineAnalysisResults(results, textInput);
  return combinedResult;
}

/**
 * Direct pass-through to Anthropic's Claude model
 */
export async function directAnthropicAnalyze(textInput: string): Promise<any> {
  // Ensure we have text to analyze
  const text = textInput || "";
  
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    try {
      // Direct pass-through to Anthropic Claude with the intelligence analysis prompt
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        system: ANALYSIS_PROMPT,
        max_tokens: 4000,
        messages: [
          { role: "user", content: `Here is the text to analyze:\n\n${text}` }
        ]
      });
      
      // Parse the response content and return the raw text
      if (response.content && response.content[0] && 'text' in response.content[0]) {
        return {
          provider: "Anthropic (Claude 3 Sonnet)",
          formattedReport: response.content[0].text
        };
      } else {
        return {
          provider: "Anthropic (Claude 3 Sonnet) - Error",
          formattedReport: "Error: Unable to extract text from Anthropic response."
        };
      }
    } catch (error: any) {
      console.error(`Error in direct passthrough to Anthropic:`, error);
      
      return {
        provider: "Anthropic (Claude 3 Sonnet) - Error",
        formattedReport: `Error: ${error.message || "Unknown error occurred"}`
      };
    }
  }
  
  // For large texts, split into chunks and process each one
  console.log(`Text is large (${text.length} chars), splitting into chunks for processing...`);
  
  const chunks = splitTextIntoChunks(text);
  console.log(`Split into ${chunks.length} chunks`);
  
  // Limit the number of chunks to prevent excessive API usage
  const chunksToProcess = chunks.slice(0, MAX_CHUNKS);
  if (chunksToProcess.length < chunks.length) {
    console.log(`Processing only the first ${MAX_CHUNKS} chunks to limit API usage`);
  }
  
  const results = [];
  
  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars)...`);
    
    try {
      // Process each chunk
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        system: ANALYSIS_PROMPT,
        max_tokens: 4000,
        messages: [
          { role: "user", content: `Here is the text to analyze:\n\n${chunk}` }
        ]
      });
      
      // Extract the text from the response and parse cleanly
      if (response.content && response.content[0] && 'text' in response.content[0]) {
        const rawContent = response.content[0].text;
        const result = parseCleanIntelligenceResponse(rawContent, "Anthropic (Claude 3 Sonnet)");
        results.push(result);
        console.log(`Successfully processed chunk ${i+1}`);
      } else {
        console.error(`Error: Unable to extract text from Anthropic response for chunk ${i+1}`);
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1}:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.log(`Rate limit exceeded. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1}...`);
          const response = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
            system: ANALYSIS_PROMPT,
            max_tokens: 4000,
            messages: [
              { role: "user", content: `Here is the text to analyze:\n\n${chunk}` }
            ]
          });
          
          // Extract the text from the response
          if (response.content && response.content[0] && 'text' in response.content[0]) {
            const result = { 
              formattedReport: response.content[0].text,
              provider: "Anthropic (Claude 3 Sonnet)"
            };
            results.push(result);
            console.log(`Successfully processed chunk ${i+1} on retry`);
          }
        } catch (retryError) {
          console.error(`Error retrying chunk ${i+1}:`, retryError);
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next chunk despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, throw an error
  if (results.length === 0) {
    throw new Error("Failed to process any chunks of the document. The document may be too large or processed too quickly. Please try again later.");
  }
  
  // Combine the results from all chunks with cognitive enhancement
  console.log(`Combining results from ${results.length} chunks processed by Anthropic with cognitive evaluation...`);
  const combinedResult = await combineAnalysisResults(results, textInput);
  return combinedResult;
}

/**
 * Direct pass-through to Perplexity AI
 */
export async function directPerplexityAnalyze(textInput: string): Promise<any> {
  // Fallback response in case all chunks fail
  const fallbackResponse = {
    provider: "Perplexity (LLaMA 3.1) - Error",
    formattedReport: "Failed to analyze document with Perplexity. Please try again or use a different AI provider."
  };
  
  // Ensure we have text to analyze
  const text = textInput || "";
  
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: ANALYSIS_PROMPT
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }
      
      const data: any = await response.json();
      
      const rawContent = data.choices?.[0]?.message?.content || "No response received from Perplexity";
      return parseCleanIntelligenceResponse(rawContent, "Perplexity (LLaMA 3.1)");
    } catch (error: any) {
      console.error(`Error in direct passthrough to Perplexity:`, error);
      
      const errorContent = `Error: ${error.message || "Unknown error occurred"}`;
      return parseCleanIntelligenceResponse(errorContent, "Perplexity (LLaMA 3.1) - Error");
    }
  }
  
  // For large texts, split into chunks and process each one
  console.log(`Text is large (${text.length} chars), splitting into chunks for processing...`);
  
  const chunks = splitTextIntoChunks(text);
  console.log(`Split into ${chunks.length} chunks`);
  
  // Limit the number of chunks to prevent excessive API usage
  const chunksToProcess = chunks.slice(0, MAX_CHUNKS);
  if (chunksToProcess.length < chunks.length) {
    console.log(`Processing only the first ${MAX_CHUNKS} chunks to limit API usage`);
  }
  
  const results = [];
  
  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars) with Perplexity...`);
    
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: ANALYSIS_PROMPT
            },
            {
              role: "user",
              content: chunk
            }
          ],
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }
      
      const data: any = await response.json();
      
      const result = { 
        formattedReport: data.choices?.[0]?.message?.content || "No response received",
        provider: "Perplexity (LLaMA 3.1)"
      };
      results.push(result);
      console.log(`Successfully processed chunk ${i+1} with Perplexity`);
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk with Perplexity...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1} with Perplexity:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log(`Perplexity rate limit exceeded. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1} with Perplexity...`);
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
            },
            body: JSON.stringify({
              model: "llama-3.1-sonar-small-128k-online",
              messages: [
                {
                  role: "system",
                  content: ANALYSIS_PROMPT
                },
                {
                  role: "user",
                  content: chunk
                }
              ],
              temperature: 0.2
            })
          });
          
          if (!response.ok) {
            throw new Error(`Perplexity API error on retry: ${response.status} ${response.statusText}`);
          }
          
          const data: any = await response.json();
          
          const result = { 
            formattedReport: data.choices?.[0]?.message?.content || "No response received",
            provider: "Perplexity (LLaMA 3.1)"
          };
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} with Perplexity on retry`);
        } catch (retryError) {
          console.error(`Error retrying chunk ${i+1} with Perplexity:`, retryError);
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next Perplexity chunk despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, return the fallback
  if (results.length === 0) {
    return fallbackResponse;
  }
  
  // Combine the results from all chunks with cognitive enhancement
  console.log(`Combining results from ${results.length} chunks processed by Perplexity with cognitive evaluation...`);
  const combinedResult = await combineAnalysisResults(results, textInput);
  return combinedResult;
}

/**
 * Direct pass-through to DeepSeek AI
 */
export async function directDeepSeekAnalyze(textInput: string): Promise<any> {
  // Fallback response in case all chunks fail
  const fallbackResponse = {
    provider: "DeepSeek - Error",
    formattedReport: "Failed to analyze document with DeepSeek. Please try again or use a different AI provider."
  };
  
  // Ensure we have text to analyze
  const text = textInput || "";
  
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: ANALYSIS_PROMPT
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }
      
      const data: any = await response.json();
      
      return {
        provider: "DeepSeek",
        formattedReport: data.choices?.[0]?.message?.content || "No response received from DeepSeek"
      };
    } catch (error: any) {
      console.error(`Error in direct passthrough to DeepSeek:`, error);
      
      return {
        provider: "DeepSeek - Error",
        formattedReport: `Error: ${error.message || "Unknown error occurred"}`
      };
    }
  }
  
  // For large texts, split into chunks and process each one
  console.log(`Text is large (${text.length} chars), splitting into chunks for processing...`);
  
  const chunks = splitTextIntoChunks(text);
  console.log(`Split into ${chunks.length} chunks`);
  
  // Limit the number of chunks to prevent excessive API usage
  const chunksToProcess = chunks.slice(0, MAX_CHUNKS);
  if (chunksToProcess.length < chunks.length) {
    console.log(`Processing only the first ${MAX_CHUNKS} chunks to limit API usage`);
  }
  
  const results = [];
  
  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars)...`);
    
    try {
      // Process each chunk
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: ANALYSIS_PROMPT
            },
            {
              role: "user",
              content: chunk
            }
          ],
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }
      
      const data: any = await response.json();
      
      // Store the raw text result
      const result = { 
        formattedReport: data.choices?.[0]?.message?.content || "No response received",
        provider: "DeepSeek"
      };
      results.push(result);
      console.log(`Successfully processed chunk ${i+1}`);
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1}:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.log(`Rate limit exceeded. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1}...`);
          const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                {
                  role: "system",
                  content: ANALYSIS_PROMPT
                },
                {
                  role: "user",
                  content: chunk
                }
              ],
              temperature: 0.2
            })
          });
          
          if (!response.ok) {
            throw new Error(`DeepSeek API error on retry: ${response.status} ${response.statusText}`);
          }
          
          const data: any = await response.json();
          
          const result = { 
            formattedReport: data.choices?.[0]?.message?.content || "No response received",
            provider: "DeepSeek"
          };
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} with DeepSeek on retry`);
        } catch (retryError) {
          console.error(`Error retrying chunk ${i+1} with DeepSeek:`, retryError);
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next DeepSeek chunk despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, return the fallback
  if (results.length === 0) {
    return fallbackResponse;
  }
  
  // Combine the results from all chunks with cognitive enhancement
  console.log(`Combining results from ${results.length} chunks processed by DeepSeek with cognitive evaluation...`);
  const combinedResult = await combineAnalysisResults(results, textInput);
  return combinedResult;
}