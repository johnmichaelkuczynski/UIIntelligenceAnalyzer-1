import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fetch from 'node-fetch';

// Initialize the API clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY as string,
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const GPT_MODEL = 'gpt-4o';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string
});

/**
 * Translate a document to a target language
 * @param document The document to translate
 * @param targetLanguage The language to translate to
 * @param preserveStyle Whether to preserve cognitive style (default: true)
 * @param provider The AI provider to use
 * @returns Translated text and metadata
 */
export async function translateDocument(
  document: string, 
  targetLanguage: string, 
  preserveStyle: boolean = true,
  provider: string = 'openai'
) {
  console.log(`Using ${provider} for document translation to ${targetLanguage}...`);
  
  // Construct the prompt focusing on cognitive pattern preservation
  const preserveStyleInstruction = preserveStyle ? 
    `- Preserve the cognitive patterns and intellectual signature of the original author
    - Maintain the same level of conceptual density, inferential structure, and logical rigor
    - Keep the same type of reasoning (deductive, inductive, abductive) where identifiable
    - Preserve the author's unique cognitive style and intellectual framework` :
    `- Focus on clear, natural expression in the target language`;
  
  const prompt = `
I need you to translate the following text into ${targetLanguage}.

ORIGINAL TEXT:
${document}

TRANSLATION GUIDELINES:
${preserveStyleInstruction}
- Ensure the translation is accurate and complete
- Make sure technical terms are translated appropriately
- Maintain the tone of the original text

Please provide:
1. The translated text in ${targetLanguage}
2. A brief note about any significant challenges in preserving the cognitive style during translation
`;

  try {
    if (provider === 'anthropic') {
      const result = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });
      
      // Access the content safely
      let content = '';
      if (result.content[0]?.type === 'text') {
        content = result.content[0].text;
      }
      
      // Extract the translated text and notes
      const sections = content.split(/\n{2,}/);
      const translatedText = sections[0] || content;
      const notes = sections.length > 1 ? sections[sections.length - 1] : 'Translation completed successfully.';
      
      return {
        provider: 'anthropic',
        translatedText,
        targetLanguage,
        notes,
        preservedStyle: preserveStyle,
        rawResponse: result
      };
      
    } else if (provider === 'perplexity') {
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
              content: "You are an expert linguist and translator."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.1,
        })
      });
      
      const data = await response.json() as any;
      const content = data?.choices?.[0]?.message?.content || '';
      
      // Extract the translated text and notes
      const sections = content.split(/\n{2,}/);
      const translatedText = sections[0] || content;
      const notes = sections.length > 1 ? sections[sections.length - 1] : 'Translation completed successfully.';
      
      return {
        provider: 'perplexity',
        translatedText,
        targetLanguage,
        notes,
        preservedStyle: preserveStyle,
        rawResponse: data
      };
      
    } else {
      // Default to OpenAI
      const result = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert linguist and translator."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      });
      
      const content = result.choices[0]?.message?.content || '';
      
      // Extract the translated text and notes
      const sections = content.split(/\n{2,}/);
      const translatedText = sections[0] || content;
      const notes = sections.length > 1 ? sections[sections.length - 1] : 'Translation completed successfully.';
      
      return {
        provider: 'openai',
        translatedText,
        targetLanguage,
        notes,
        preservedStyle: preserveStyle,
        rawResponse: result
      };
    }
  } catch (error: any) {
    console.error(`Error in document translation (${provider}):`, error);
    throw new Error(`Document translation with ${provider} failed: ${error.message}`);
  }
}