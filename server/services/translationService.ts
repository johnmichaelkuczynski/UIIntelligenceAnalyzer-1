import { directOpenAIRequest } from '../api/directModelRequest';

interface TranslationOptions {
  targetLanguage: string;
  preserveFormatting?: boolean;
  preserveTone?: boolean;
  model?: string;
}

/**
 * Translate a document to another language
 */
export async function translateDocument(text: string, options: TranslationOptions): Promise<string> {
  console.log("DIRECT OPENAI PASSTHROUGH FOR DOCUMENT TRANSLATION");
  
  const targetLanguage = options.targetLanguage || 'English';
  
  // Construct the translation prompt
  const translationPrompt = `
TRANSLATION WHILE PRESERVING COGNITIVE PATTERNS

Original text:
"""
${text}
"""

Translate this text into ${targetLanguage} while carefully preserving:
- The cognitive complexity and depth of the original
- The intellectual structure and flow
- The conceptual precision and nuance

${options.preserveFormatting ? 
  "Important: Maintain the same formatting, paragraph structure, and layout as the original." : ""}

${options.preserveTone ? 
  "Important: Preserve the author's tone, style, and voice in the translation." : ""}

This is not just a linguistic translation but a cognitive one - ensure that the same level of intelligence and thought pattern is apparent in the translated text.
`;

  try {
    const result = await directOpenAIRequest(translationPrompt);
    return result.content;
  } catch (error) {
    console.error("Error translating document:", error);
    throw error;
  }
}