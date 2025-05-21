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
 * Compare two documents using a specified LLM provider for cognitive profiling
 * @param documentA The first document to compare
 * @param documentB The second document to compare
 * @param provider The AI provider to use for comparison
 * @returns Comparison results including detailed analysis
 */
export async function compareDocuments(documentA: string, documentB: string, provider: string = 'openai') {
  console.log(`Using ${provider} for document comparison...`);
  
  // The prompt focuses on cognitive patterns, not surface qualities
  const prompt = `
I need you to carefully analyze two writing samples and provide a detailed comparison of the COGNITIVE PATTERNS revealed in both.

DOCUMENT A:
${documentA}

DOCUMENT B:
${documentB}

Please provide a COGNITIVE PROFILE COMPARISON focusing on:

1. Cognitive patterns in DOCUMENT A (types of reasoning, conceptual frameworks, mental models)
2. Cognitive patterns in DOCUMENT B (types of reasoning, conceptual frameworks, mental models)
3. Comparative intelligence assessment (which document reveals more sophisticated cognitive patterns)
4. Specific examples from both texts that reveal differences in cognitive approaches
5. A calibrated cognitive intelligence score (1-100) for both authors based PURELY on the cognitive patterns in their writing, not on correctness, completeness, or surface polish

IMPORTANT: 
- Focus on the MIND behind the text, not the text itself
- This is NOT about writing quality or correctness of ideas
- Score should reflect cognitive patterns that reveal intelligence, not writing skill
- A score of 50 represents ordinary college-level reasoning, while 100 represents profoundly intelligent thinking

Present your complete analysis in a clear, organized format.
`;

  try {
    let result;
    
    // Use the appropriate provider for the comparison
    if (provider === 'anthropic') {
      result = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });
      
      // Access the content safely
      const content = result.content[0]?.type === 'text' 
        ? result.content[0].text 
        : 'Unable to retrieve comparison results';
      
      return {
        provider: 'anthropic',
        comparisonResult: content,
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
              content: "You are an expert in cognitive analysis and intelligence assessment."
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
      
      const data = await response.json();
      
      return {
        provider: 'perplexity',
        comparisonResult: data.choices[0].message.content,
        rawResponse: data
      };
      
    } else {
      // Default to OpenAI
      result = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert in cognitive analysis and intelligence assessment."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      });
      
      return {
        provider: 'openai',
        comparisonResult: result.choices[0].message.content,
        rawResponse: result
      };
    }
  } catch (error) {
    console.error(`Error in document comparison (${provider}):`, error);
    throw new Error(`Document comparison with ${provider} failed: ${error.message}`);
  }
}