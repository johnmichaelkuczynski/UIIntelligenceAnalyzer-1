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

// The core forensic profiler prompt that will be used for all analysis
const COGNITIVE_PROFILER_PROMPT = `
You are not grading this text.
You are not evaluating its style, quality, clarity, or completeness.

You are treating this text as evidence — a cognitive fingerprint of its author.

Your task is to infer the author's intelligence and cognitive profile solely from the structure and content of the text.

This may be a full paper, abstract, fragment, or rough sketch. That does not matter. Treat it as evidence, not an argument.

Estimate the author's intelligence on a scale from 1 to 100.
Then describe the cognitive character of the mind behind the text.

You may comment on:
- Is this mind analytical, synthetic, mechanical, imitative, original, confused, creative, disciplined, superficial, visionary?
- Does it show evidence of deep reasoning, abstraction, novelty, inferential control, or originality?
- What kind of thought is being performed? What kind of thinker is revealed?

DO NOT penalize for:
- Incompleteness
- Lack of clarity or polish
- Informality or lack of structure
- Absence of citations or full arguments

Your job is to evaluate intelligence, not to give feedback.

This is a cognitive profiling task. Be precise. Be bold. Be honest.
`;

/**
 * Analyze a document using the cognitive profiling approach
 * @param document The document to analyze
 * @param provider The AI provider to use
 * @returns Raw cognitive profile from the AI model
 */
export async function analyzeCognitiveProfile(document: string, provider: string = 'openai') {
  console.log(`Using ${provider} for cognitive profiling...`);
  
  // Construct the prompt focusing on cognitive patterns, not text quality
  const prompt = `
${COGNITIVE_PROFILER_PROMPT}

TEXT TO PROFILE:
${document}
`;

  try {
    let result: any;
    
    // Use the appropriate provider for the analysis
    if (provider === 'anthropic') {
      result = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });
      
      // Access the content safely
      const content = result.content[0]?.type === 'text' 
        ? result.content[0].text 
        : 'Unable to retrieve cognitive profile';
      
      return {
        provider: 'anthropic',
        profileResult: content,
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
              content: "You are a cognitive profiler who analyzes writing to understand the mind behind it."
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
      
      return {
        provider: 'perplexity',
        profileResult: data?.choices?.[0]?.message?.content || 'Unable to retrieve cognitive profile',
        rawResponse: data
      };
      
    } else {
      // Default to OpenAI
      result = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a cognitive profiler who analyzes writing to understand the mind behind it."
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
        profileResult: result.choices[0]?.message?.content || 'Unable to retrieve cognitive profile',
        rawResponse: result
      };
    }
  } catch (error: any) {
    console.error(`Error in cognitive profiling (${provider}):`, error);
    throw new Error(`Cognitive profiling with ${provider} failed: ${error.message}`);
  }
}

/**
 * Compare two documents using cognitive profiling
 * @param documentA The first document to compare
 * @param documentB The second document to compare
 * @param provider The AI provider to use
 * @returns Comparison results
 */
export async function compareCognitiveProfiles(documentA: string, documentB: string, provider: string = 'openai') {
  console.log(`Using ${provider} for cognitive profile comparison...`);
  
  // Construct a comparison prompt
  const prompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze and compare TWO separate writing samples. For each sample, create a cognitive profile of the author according to the instructions above. Then compare the two profiles.

DOCUMENT A:
${documentA}

DOCUMENT B:
${documentB}

For each document:
1. Estimate the author's intelligence on a scale from 1 to 100
2. Describe the cognitive character of the mind behind the text
3. Identify key cognitive patterns and reasoning styles

Then provide a comparative analysis:
- How do these minds differ?
- What cognitive strengths does each exhibit?
- Which author demonstrates more sophisticated reasoning or greater intelligence?

Remember: This is forensic cognitive profiling. You are not grading the texts.
`;

  try {
    let result: any;
    
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
              content: "You are a cognitive profiler who analyzes writing to understand the mind behind it."
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
      
      return {
        provider: 'perplexity',
        comparisonResult: data?.choices?.[0]?.message?.content || 'Unable to retrieve comparison results',
        rawResponse: data
      };
      
    } else {
      // Default to OpenAI
      result = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a cognitive profiler who analyzes writing to understand the mind behind it."
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
        comparisonResult: result.choices[0]?.message?.content || 'Unable to retrieve comparison results',
        rawResponse: result
      };
    }
  } catch (error: any) {
    console.error(`Error in cognitive profile comparison (${provider}):`, error);
    throw new Error(`Cognitive profile comparison with ${provider} failed: ${error.message}`);
  }
}