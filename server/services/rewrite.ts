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
async function performRewriteSanityCheck(originalText: string, rewrittenText: string): Promise<boolean> {
  try {
    // Limit input size for the check
    const maxChars = 2500;
    const truncatedOriginal = originalText.length > maxChars ? originalText.substring(0, maxChars) : originalText;
    const truncatedRewrite = rewrittenText.length > maxChars ? rewrittenText.substring(0, maxChars) : rewrittenText;
    
    // Get API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is missing for sanity check");
      return true; // Skip check if no API key
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
          content: `You are an expert judge in cognitive intelligence assessment with the following task:
          
Compare ORIGINAL TEXT to REWRITTEN TEXT to determine if the rewrite preserves or improves the following qualities:

1. Semantic density (information per word)
2. Logical structure (clear, recursive reasoning)
3. Definitional clarity (precise operational definitions)
4. Inferential continuity (coherent argument flow)
5. Distinction-making (clear separation between related concepts)

Focus on substantive cognitive content, not style or readability. Identify cases where:
- Original text has tight, clear formulations that were expanded unnecessarily
- Original has recursive structures that were linearized
- Original has clear distinctions that were made verbose
- Rewrite added academic-style phrasing lacking new inferential content or cognitive value

Respond with a JSON object only:
{
  "semanticDensity": {
    "originalScore": 1-10,
    "rewriteScore": 1-10,
    "preserved": true|false,
    "reason": "brief explanation"
  },
  "logicalStructure": {
    "originalScore": 1-10,
    "rewriteScore": 1-10,
    "preserved": true|false,
    "reason": "brief explanation"
  },
  "definitionalClarity": {
    "originalScore": 1-10,
    "rewriteScore": 1-10,
    "preserved": true|false,
    "reason": "brief explanation"
  },
  "overallVerdict": true if rewrite preserves or improves quality, false if it degrades it,
  "explanation": "brief explanation"
}`
        },
        {
          role: "user",
          content: `ORIGINAL TEXT:
${truncatedOriginal}

REWRITTEN TEXT:
${truncatedRewrite}

Evaluate whether the rewrite preserves or improves cognitive qualities of the original text.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Log the evaluation
      console.log("Rewrite quality evaluation:", {
        semanticDensity: {
          originalScore: result.semanticDensity?.originalScore,
          rewriteScore: result.semanticDensity?.rewriteScore,
          preserved: result.semanticDensity?.preserved
        },
        logicalStructure: {
          originalScore: result.logicalStructure?.originalScore,
          rewriteScore: result.logicalStructure?.rewriteScore,
          preserved: result.logicalStructure?.preserved
        },
        definitionalClarity: {
          originalScore: result.definitionalClarity?.originalScore,
          rewriteScore: result.definitionalClarity?.rewriteScore,
          preserved: result.definitionalClarity?.preserved
        },
        overallVerdict: result.overallVerdict
      });
      
      return result.overallVerdict === true;
      
    } catch (error) {
      console.error("Error parsing sanity check response:", error);
      return true; // Default to passing the check if parsing fails
    }
    
  } catch (error) {
    console.error("Error in rewrite sanity check:", error);
    return true; // Default to passing the check if API call fails
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
  const systemPrompt = `You are an expert rewrite engine for enhancing the genuine intelligence of text. Your purpose is to improve logical structure, definitional clarity, and inferential depth WITHOUT any style inflation.

CORE FUNCTION:
Your ONLY goal is to enhance real cognitive content. Never add words without adding genuine inferential value.

CRITICAL REWRITE RULES (MANDATORY):
- EXACT LENGTH ENFORCEMENT: Final rewritten text MUST maintain 98-100% of original character count. Never exceed original length.
- PRESERVE ALL SEMANTIC COMPRESSION: If the original uses fewer words to express an idea clearly, never expand it.
- MAINTAIN OR ENHANCE RECURSIVE STRUCTURES: Preserve any A→B→C→A* patterns in arguments.
- PRESERVE DEFINITIONAL CLARITY: Sharp definitions are superior to stylistic exposition.
- NO DISFLUENT TRANSITIONS: Never add "moreover," "furthermore," or similar academic padding.
- MATCH ORIGINAL'S SENTENCE/PARAGRAPH LENGTH DISTRIBUTION: If original uses compact sentences, maintain that pattern.

INTELLIGENCE ENHANCEMENT TECHNIQUES:
- Replace imprecise claims with exact, empirically-grounded statements
- Enhance operational definitions (how concepts work, not just what they are)
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