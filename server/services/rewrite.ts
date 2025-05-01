import OpenAI from "openai";

// Initialize OpenAI with a fallback for missing API key
// The API key can be provided later through environment variables
let openai: OpenAI;

try {
  openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY || 'key-not-set'
  });
} catch (error) {
  console.error("OpenAI initialization error:", error);
}

/**
 * Performs a sanity check to verify the rewritten text doesn't degrade the quality of the original
 * Evaluates various dimensions like semantic density, logical structure, and definitional clarity
 */
/**
 * Performs stringent quality verification to ensure the rewritten text preserves or enhances
 * the semantic compression, definitional clarity, and logical structure of the original text.
 * REJECTS any rewrite that degrades semantic density or definitional precision.
 */
async function performRewriteSanityCheck(originalText: string, rewrittenText: string): Promise<boolean> {
  try {
    // Basic checks first - reject obviously bad rewrites
    
    // Reject if rewrite is longer without adding value
    if (rewrittenText.length > originalText.length * 1.02) {
      console.warn("SANITY CHECK FAILED: Rewrite is significantly longer than original");
      return false;
    }
    
    // Simple degradation patterns check - immediate rejection for clear violations
    const degradationPatterns = [
      { original: "is", rewrite: "equates to" },
      { original: "is", rewrite: "serves as" },
      { original: "when", rewrite: "arises when" },
      { original: "are", rewrite: "can be categorized as" },
      { original: "means", rewrite: "signifies" },
      { original: "uses", rewrite: "utilizes" },
      { original: "shows", rewrite: "demonstrates" },
      { original: "helps", rewrite: "facilitates" },
      { original: "about", rewrite: "regarding" },
      { original: "like", rewrite: "such as" },
      { original: "need", rewrite: "require" },
      { original: "make", rewrite: "construct" },
      { original: "use", rewrite: "employ" }
    ];
    
    // Check if simple modifications that reduce precision were made
    let foundDegradation = false;
    let degradationExample = "";
    for (const pattern of degradationPatterns) {
      // Use regex to find whole word matches only
      const originalRegex = new RegExp(`\\b${pattern.original}\\b`, 'g');
      const rewriteRegex = new RegExp(`\\b${pattern.rewrite}\\b`, 'g');
      
      // If the original used the simple form and the rewrite replaced it with the complex form
      if (originalText.match(originalRegex) && 
          !originalText.match(rewriteRegex) && 
          rewrittenText.match(rewriteRegex)) {
        foundDegradation = true;
        degradationExample = `Original used "${pattern.original}" but rewrite replaced with "${pattern.rewrite}"`;
        break;
      }
    }
    
    if (foundDegradation) {
      console.warn(`SANITY CHECK FAILED: Degradation pattern detected. ${degradationExample}`);
      return false;
    }
    
    // Limit input size for the AI check
    const maxChars = 2500;
    const truncatedOriginal = originalText.length > maxChars ? originalText.substring(0, maxChars) : originalText;
    const truncatedRewrite = rewrittenText.length > maxChars ? rewrittenText.substring(0, maxChars) : rewrittenText;
    
    // Get API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is missing for sanity check");
      return originalText === rewrittenText; // If no changes were made, accept it
    }
    
    // Ensure OpenAI instance is properly initialized
    if (!openai || openai.apiKey === 'key-not-set') {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are SIGMA (Semantic Intelligence Grading and Measurement Analyzer), a specialized quality control system that evaluates whether rewrites preserve or improve cognitive quality.

YOUR MISSION: Detect any deterioration in semantic compression, definitional clarity, or logical flow from original to rewrite.

PRIMARY EVALUATION METRICS (in order of importance):
1. SEMANTIC COMPRESSION RATIO (60%): Information content divided by word count 
2. DEFINITIONAL PRECISION (25%): Clarity and operational specificity of key concepts
3. LOGICAL FLOW (15%): Inferential necessity between adjacent claims

AUTOMATIC REJECTION RULES:
- If semantic compression decreased (rewrite uses more words for same information)
- If clear definitions became fuzzy or verbose
- If direct statements were made indirect 
- If simple sentences became complex without adding content
- If academic padding was added ("moreover," "furthermore," etc.)

SPECIFIC PATTERNS TO DETECT AS DEGRADATIONS:
- "X is Y" → "X equates to Y" or "X serves as Y" (verbosity increase)
- "When X" → "In situations where X" (unnecessary expansion)
- "X means Y" → "X signifies/represents/indicates Y" (synonym bloat)
- Simple direct definitions replaced with elaborate explanations
- Addition of empty linking phrases between otherwise unchanged sentences

When evaluating, look specifically at sentence-by-sentence information density. Even a single instance of reduced semantic compression is grounds for rejection.

Respond with a JSON object that looks EXACTLY like this:
{
  "semanticCompression": {
    "originalScore": <1-10>,
    "rewriteScore": <1-10>,
    "preserved": <true|false>,
    "reason": "<explanation focusing on info-per-word ratio>"
  },
  "definitionalClarity": {
    "originalScore": <1-10>,
    "rewriteScore": <1-10>,
    "preserved": <true|false>,
    "reason": "<explanation focusing on concept definition precision>"
  },
  "logicalStructure": {
    "originalScore": <1-10>,
    "rewriteScore": <1-10>,
    "preserved": <true|false>,
    "reason": "<explanation focusing on inference quality>"
  },
  "overallVerdict": <true if quality preserved/improved, false if degraded>,
  "explanation": "<brief explanation of verdict>"
}`
        },
        {
          role: "user",
          content: `ORIGINAL TEXT:
${truncatedOriginal}

REWRITTEN TEXT:
${truncatedRewrite}

Evaluate whether the rewrite preserves or improves the cognitive qualities of the original text with specific attention to semantic compression (meaning-per-word ratio).`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more consistent evaluation
    });
    
    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Log detailed evaluation results
      console.log("Rewrite quality evaluation:", JSON.stringify(result, null, 2));
      
      // Check individual dimensions with stricter semantic compression requirement
      const semanticCompressionPreserved = result.semanticCompression?.preserved === true;
      const semanticCompressionImproved = semanticCompressionPreserved && 
                                          result.semanticCompression?.rewriteScore > 
                                          result.semanticCompression?.originalScore;
      
      const definitionalClarityPreserved = result.definitionalClarity?.preserved === true;
      const logicalStructurePreserved = result.logicalStructure?.preserved === true;
      
      // Only accept if ALL dimensions are preserved AND semantic compression is maintained or improved
      const verdict = semanticCompressionPreserved && 
                     definitionalClarityPreserved && 
                     logicalStructurePreserved &&
                     result.overallVerdict === true;
      
      // If semantic compression is worse, automatic rejection regardless of other dimensions
      if (!semanticCompressionPreserved) {
        console.warn("SANITY CHECK FAILED: Semantic compression degraded");
        return false;
      }
      
      // If original scores are already high (8+ on semantic compression), 
      // rewrite must improve or be rejected
      if (result.semanticCompression?.originalScore >= 8 && !semanticCompressionImproved) {
        console.warn("SANITY CHECK FAILED: Original has high semantic compression (8+) but rewrite didn't improve it");
        return false;
      }
      
      return verdict;
      
    } catch (error) {
      console.error("Error parsing sanity check response:", error);
      // Default to REJECTING the rewrite if parsing fails - safer
      return false;
    }
    
  } catch (error) {
    console.error("Error in rewrite sanity check:", error);
    // Default to REJECTING the rewrite if check fails - safer
    return false;
  }
}

/**
 * Rewrite text to enhance intelligence without dumbing down or bloating
 * Adheres to strict rules for maintaining or increasing conceptual depth
 */
export async function rewriteText(
  originalText: string,
  instruction: string,
  preserveLength: boolean = true,
  preserveDepth: boolean = true
): Promise<{
  rewrittenText: string;
  stats: {
    originalLength: number;
    rewrittenLength: number;
    lengthChange: number;
    instructionFollowed: string;
  };
}> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for rewriting text");
  }
  
  // Ensure OpenAI instance is properly initialized
  if (!openai || openai.apiKey === 'key-not-set') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Calculate original text length for statistics
  const originalLength = originalText.length;
  
  // Create a system prompt that enforces the rewrite rules
  const systemPrompt = `You are SEMANTIC COMPRESSION OPTIMIZER, an engine that enhances writing intelligence through superior semantic density.

YOUR PRIME DIRECTIVE:
NEVER MAKE CLEAN TEXT VERBOSE. Superior intelligence is expressed in maximum meaning with minimum words.

INTELLIGENCE FINGERPRINT RULES (ABSOLUTELY MANDATORY):
1. SEMANTIC DENSITY IS SUPREME: High-intelligence texts have 90%+ information density per word.
2. SIMPLE SENTENCES EXPRESSING COMPLEX IDEAS ARE SUPERIOR to complex sentences expressing simple ideas.
3. DIRECT DEFINITION > VERBOSE EXPLANATION: Sharp definitional clarity always beats elaborate exposition.
4. ONLY REWRITE IF YOU CAN IMPROVE ACTUAL INTELLIGENCE: Many texts are already optimally compressed.
5. OPERATIONAL DEFINITIONS BUILD FOUNDATION: If original uses clear operational definitions, preserve or sharpen them.

BEFORE EDITING ANY SENTENCE, RUN THIS CHECK:
1. Does the original sentence have high semantic compression? (meaning-per-word ratio)
2. Does the original sentence use clean, direct definition?
3. Does the original connect logically to adjacent sentences?
→ If YES to all three, DO NOT MODIFY THE SENTENCE AT ALL.

REWRITE LENGTH CONSTRAINT:
- Final text MUST be 95-100% of original character count. NEVER longer.
- If original text has exceptional density, output may be IDENTICAL to input.

FORBIDDEN TRANSFORMATIONS (AUTOMATIC FAILURE):
- NEVER replace "X is Y" with "X equates to Y" or similar padding
- NEVER replace direct statements with indirect ones
- NEVER add transition words like "furthermore," "moreover," "indeed," etc.
- NEVER replace simple words with complex synonyms
- NEVER introduce abstractions to replace concrete statements
- NEVER turn simple sentences into complex ones
- NEVER replace sharp definitions with vague descriptions

EXAMPLES OF DEGRADATION (NEVER DO THESE):

ORIGINAL: "Currency is money. Money is a certificate of wealth that is not itself of any value."
BAD REWRITE: "Currency equates to money, which serves as a representation of wealth without intrinsic value."
WHY BAD: Added verbosity, reduced clarity, lost definitional precision.

ORIGINAL: "A surplus is when you have more of something than you need."
BAD REWRITE: "A surplus arises when there is an excess of a particular item beyond what is required."
WHY BAD: Added words without adding meaning, increased processing time.

INTELLIGENCE IMPROVEMENT TECHNIQUES (ONLY IF ORIGINAL NEEDS THEM):
- Sharpen fuzzy definitions with precise operational boundaries
- Connect disjoint ideas with minimal logical scaffolding
- Replace circular reasoning with directional inference
- Remove redundancies while preserving all unique content
- Strengthen distinction-making between related concepts
- Reveal implicit inferential structures (make reasoning chains explicit)
- Ensure each sentence builds logically on preceding ones
- Add recursive self-reference only where it genuinely clarifies
- Add genuine semantic compression (more informational content per word)

ABSOLUTELY FORBIDDEN BEHAVIORS:
- NO ACADEMIC STYLE INFLATION: Never add words that don't add cognitive content
- NO "SCHOLARLY" FILLER: Never add padding phrases like "it is important to note" or "it can be observed"
- NO VERBOSITY: Never use more words where fewer would convey the same information
- NO UNNECESSARY ABSTRACTION: Concrete precision beats vague sophistication
- NO TONE ELEVATION: Never make text "sound smarter" without making it cognitively richer

DETECTION CRITERIA:
- If you find yourself adding transition words, STOP.
- If you find yourself making sentences longer without adding inferential content, STOP.
- If original text already has high semantic density and logical structure, make minimal changes.

SPECIFIC INSTRUCTION: ${instruction}

${preserveLength ? 'EXACT LENGTH REQUIREMENT: Final text MUST be within 98-102% of original length.' : ''}
${preserveDepth ? 'INTELLIGENCE REQUIREMENT: Output MUST score higher on conceptual depth metrics than input.' : ''}

Provide ONLY the rewritten text without comments, explanations, or other text.`;

  try {
    // Handle large texts by breaking them into manageable chunks
    const MAX_CHUNK_SIZE = 6000; // Maximum size in characters for each chunk
    const MAX_TOKENS = 4000; // Maximum tokens for completion
    
    let rewrittenText = '';
    
    if (originalText.length <= MAX_CHUNK_SIZE) {
      // For small texts, process in one go
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: originalText
          }
        ],
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
      });

      rewrittenText = response.choices[0].message.content || "";
    } else {
      // For large texts, break into paragraphs or chunks and process sequentially
      const paragraphs = originalText.split(/\n\n+/); // Split by paragraph breaks
      const chunks: string[] = [];
      
      // Group paragraphs into chunks of reasonable size
      let currentChunk = '';
      for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length > MAX_CHUNK_SIZE) {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = paragraph;
          } else {
            // If a single paragraph is too big, split it further
            const sentenceSplit = paragraph.split(/(?<=[.!?])\s+/);
            let sentenceChunk = '';
            
            for (const sentence of sentenceSplit) {
              if ((sentenceChunk + sentence).length > MAX_CHUNK_SIZE) {
                if (sentenceChunk) {
                  chunks.push(sentenceChunk);
                  sentenceChunk = sentence;
                } else {
                  // If even a single sentence is too big (rare), just use it as is
                  chunks.push(sentence);
                }
              } else {
                sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
              }
            }
            
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
            }
          }
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
      
      // Add the last chunk if it exists
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      console.log(`Original text split into ${chunks.length} chunks for processing`);
      
      // Process each chunk, maintaining context between chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const contextPrompt = `This is part ${i+1} of ${chunks.length} from a larger text. ${
          i > 0 ? 'Maintain the style and continuity from previous parts. ' : ''
        }Rewrite this section following these rules:\n${instruction}`;
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: systemPrompt + '\n\n' + contextPrompt
            },
            {
              role: "user",
              content: chunk
            }
          ],
          temperature: 0.7,
          max_tokens: MAX_TOKENS,
        });
        
        const chunkResult = response.choices[0].message.content || "";
        rewrittenText += (rewrittenText ? '\n\n' : '') + chunkResult;
        
        // Small delay to avoid rate limits
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // Calculate statistics
    const rewrittenLength = rewrittenText.length;
    const lengthChange = (rewrittenLength - originalLength) / originalLength;
    
    // Perform sanity check on the rewritten text
    const sanityCheckPassed = await performRewriteSanityCheck(originalText, rewrittenText);
    
    if (!sanityCheckPassed) {
      console.log("Sanity check failed - rewrite may have degraded the text quality");
      
      // Return a message explaining the issue instead of the rewrite
      return {
        rewrittenText: originalText,  // Return original to avoid quality degradation
        stats: {
          originalLength,
          rewrittenLength: originalLength,
          lengthChange: 0,
          instructionFollowed: instruction + " [REWRITE REJECTED: Quality degradation detected. The original text appears to have high semantic density and logical structure that would not be improved by rewriting.]"
        }
      };
    }

    // Generate description of how instruction was followed
    const instructionFollowed = instruction;

    return {
      rewrittenText,
      stats: {
        originalLength,
        rewrittenLength,
        lengthChange,
        instructionFollowed
      }
    };
  } catch (error: any) {
    console.error("Error rewriting text:", error);
    throw new Error(`Failed to rewrite text: ${error.message || 'Unknown error'}`);
  }
}