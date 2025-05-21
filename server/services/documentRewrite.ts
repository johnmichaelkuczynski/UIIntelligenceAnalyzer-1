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
 * Rewrite a document with specific instructions using an AI provider
 * @param document The document to rewrite
 * @param instructions Custom instructions for rewriting
 * @param provider The AI provider to use
 * @returns Rewritten text and metadata
 */
export async function rewriteDocument(document: string, instructions: string, provider: string = 'openai') {
  console.log(`Using ${provider} for document rewrite...`);
  
  // Construct the prompt focusing on cognitive improvements
  const prompt = `
I need you to rewrite the following text while maintaining or enhancing the cognitive patterns revealed in the original.

DOCUMENT:
${document}

INSTRUCTIONS:
${instructions}

IMPORTANT GUIDELINES:
- Focus on enhancing the cognitive quality and clarity of thought, not just surface writing
- Maintain the original's conceptual density and inferential structure
- Preserve the intellectual signature/thinking style of the original author
- Enhance organization and flow of complex ideas
- If the original reveals sophisticated thinking, preserve that sophistication
- If the original reveals limitations in reasoning, improve the logical structure while maintaining author voice

Please provide:
1. The rewritten text
2. A brief explanation of the cognitive improvements made
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
      
      // Extract the rewritten text and explanation
      const sections = content.split(/\n{2,}/);
      const rewrittenText = sections[0] || content;
      const explanation = sections.length > 1 ? sections[sections.length - 1] : 'Rewrite completed successfully.';
      
      return {
        provider: 'anthropic',
        rewrittenText,
        explanation,
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
              content: "You are an expert in cognitive enhancement and writing improvement."
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
      
      // Extract the rewritten text and explanation
      const sections = content.split(/\n{2,}/);
      const rewrittenText = sections[0] || content;
      const explanation = sections.length > 1 ? sections[sections.length - 1] : 'Rewrite completed successfully.';
      
      return {
        provider: 'perplexity',
        rewrittenText,
        explanation,
        rawResponse: data
      };
      
    } else {
      // Default to OpenAI
      const result = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert in cognitive enhancement and writing improvement."
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
      
      // Extract the rewritten text and explanation
      const sections = content.split(/\n{2,}/);
      const rewrittenText = sections[0] || content;
      const explanation = sections.length > 1 ? sections[sections.length - 1] : 'Rewrite completed successfully.';
      
      return {
        provider: 'openai',
        rewrittenText,
        explanation,
        rawResponse: result
      };
    }
  } catch (error: any) {
    console.error(`Error in document rewrite (${provider}):`, error);
    throw new Error(`Document rewrite with ${provider} failed: ${error.message}`);
  }
}