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
- Preserve or slightly increase length (100% to 110% of original)
- Preserve or INCREASE conceptual depth and precision
- Never summarize, simplify, casualize, or inflate
- Never introduce padding, rhetorical filler, or fake "academic" gibberish
- Rewrite sentence-by-sentence for sharper logic, not stylistic smoothing
- No markdown or formatting symbols
- Final output must be clean, editorial-grade, and print-ready

FORBIDDEN BEHAVIORS:
- No verbosity without added information
- No GPT-style bloating or synthetic transitions
- No journalistic tone
- No simplification of concepts or logic chains

SPECIFIC INSTRUCTION: ${instruction}

${preserveLength ? 'MAINTAIN LENGTH: Keep output between 100% and 110% of original length.' : ''}
${preserveDepth ? 'MAINTAIN DEPTH: Never reduce cognitive depth or logical complexity.' : ''}

Provide ONLY the rewritten text without comments, explanations, or other text.`;

  try {
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
      max_tokens: Math.max(2000, originalText.length * 1.5),
    });

    // Extract the rewritten text
    const rewrittenText = response.choices[0].message.content || "";
    
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