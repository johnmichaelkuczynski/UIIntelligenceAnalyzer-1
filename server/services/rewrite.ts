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
  const systemPrompt = `You are an expert rewrite engine designed to upgrade the intelligence of a given text without dumbing it down, bloating it, or altering its format.

MANDATORY REWRITE RULES:
- STRICT LENGTH PRESERVATION: Final rewritten text MUST maintain exact length (98-102% of original). This is critical.
- INCREASE conceptual depth and precision without increasing complexity
- Never summarize, simplify, casualize, or inflate
- Never introduce padding, rhetorical filler, or fake "academic" gibberish
- Final output must be clean, editorial-grade, and print-ready

INTELLIGENCE ENHANCING TECHNIQUES (ALWAYS USE THESE):
- Replace vague claims with precise, empirically-backed statements
- Add recursive structure and layered reasoning
- Sharpen definitions and distinctions between related concepts
- Improve causal connections between linked phenomena
- Maintain original paragraph structure and length distribution
- Introduce relevant semantic compression (saying more with fewer words)

FORBIDDEN BEHAVIORS:
- No verbosity without added information
- No GPT-style bloating or synthetic transitions
- No simplification of concepts or logic chains
- No unnecessary jargon or artificially complex vocabulary
- NEVER increase word count beyond 102% of original

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