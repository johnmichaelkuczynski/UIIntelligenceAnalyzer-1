import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fetch from 'node-fetch';

// Using the exact prompt provided by the user
const COGNITIVE_PROFILER_PROMPT = `
You are not grading this text.
You are not evaluating its completeness.
You are evaluating the intelligence of the mind that produced it.

The text is a cognitive fingerprint.
Based on what it reveals, what kind of thinker wrote it?

Estimate intelligence from 1 to 100.
Explain your score.
Focus on originality, abstraction, synthesis, inference, and compression.
Ignore polish, structure, citations, or whether it's a full argument.
You are profiling a mind—not grading an essay.
`;

// Models to use (latest versions)
const OPENAI_MODEL = "gpt-4o";
const CLAUDE_MODEL = "claude-3-7-sonnet-20250219";
const PERPLEXITY_MODEL = "llama-3.1-sonar-small-128k-online";

/**
 * Pure passthrough cognitive profiling with GPT-4o
 * No post-processing, no scoring adjustments
 */
export async function profileWithOpenAI(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  // Make the API call with the exact prompt
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: "You are analyzing a text as a cognitive fingerprint to profile the mind that produced it. Do not grade the text itself."
      },
      {
        role: "user",
        content: `${COGNITIVE_PROFILER_PROMPT}\n\nTEXT TO PROFILE:\n${text}`
      }
    ],
    temperature: 0.4,
    max_tokens: 2000
  });
  
  // Return the raw response
  return response.choices[0]?.message?.content || "Profile could not be generated";
}

/**
 * Pure passthrough cognitive profiling with Claude
 * No post-processing, no scoring adjustments
 */
export async function profileWithClaude(text: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Make the API call with the exact prompt
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    messages: [
      {
        role: "user",
        content: `${COGNITIVE_PROFILER_PROMPT}\n\nTEXT TO PROFILE:\n${text}`
      }
    ],
    max_tokens: 2000
  });
  
  // Return the raw response
  return response.content[0]?.type === 'text' 
    ? response.content[0].text 
    : "Profile could not be generated";
}

/**
 * Pure passthrough cognitive profiling with Perplexity
 * No post-processing, no scoring adjustments
 */
export async function profileWithPerplexity(text: string): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }
  
  // Make the API call with the exact prompt
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: "system",
          content: "You are analyzing a text as a cognitive fingerprint to profile the mind that produced it. Do not grade the text itself."
        },
        {
          role: "user",
          content: `${COGNITIVE_PROFILER_PROMPT}\n\nTEXT TO PROFILE:\n${text}`
        }
      ],
      temperature: 0.4,
      max_tokens: 2000
    })
  });
  
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || "Profile could not be generated";
}

/**
 * Compare two texts using cognitive profiling with GPT-4o
 * No post-processing, no scoring adjustments
 */
export async function compareWithOpenAI(textA: string, textB: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  // Create a comparison prompt based on the cognitive profiler
  const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze TWO separate texts and provide a cognitive profile for each, plus a comparison:

TEXT A:
${textA}

TEXT B:
${textB}

For each text:
1. What kind of thinker wrote it?
2. Estimate intelligence from 1 to 100
3. Explain your score based on originality, abstraction, synthesis, inference, and compression

Then compare the two minds:
- What are the key differences in cognitive style and strength?
- Which shows evidence of higher intelligence and why?

Remember, you are profiling minds, not grading essays.
`;
  
  // Make the API call
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: "You are analyzing texts as cognitive fingerprints to profile the minds that produced them. Do not grade the texts themselves."
      },
      {
        role: "user",
        content: comparePrompt
      }
    ],
    temperature: 0.4,
    max_tokens: 3000
  });
  
  // Return the raw response
  return response.choices[0]?.message?.content || "Comparison could not be generated";
}

/**
 * Compare two texts using cognitive profiling with Claude
 * No post-processing, no scoring adjustments
 */
export async function compareWithClaude(textA: string, textB: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Create a comparison prompt based on the cognitive profiler
  const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze TWO separate texts and provide a cognitive profile for each, plus a comparison:

TEXT A:
${textA}

TEXT B:
${textB}

For each text:
1. What kind of thinker wrote it?
2. Estimate intelligence from 1 to 100
3. Explain your score based on originality, abstraction, synthesis, inference, and compression

Then compare the two minds:
- What are the key differences in cognitive style and strength?
- Which shows evidence of higher intelligence and why?

Remember, you are profiling minds, not grading essays.
`;
  
  // Make the API call
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    messages: [
      {
        role: "user",
        content: comparePrompt
      }
    ],
    max_tokens: 3000
  });
  
  // Return the raw response
  return response.content[0]?.type === 'text' 
    ? response.content[0].text 
    : "Comparison could not be generated";
}

/**
 * Compare two texts using cognitive profiling with Perplexity
 * No post-processing, no scoring adjustments
 */
export async function compareWithPerplexity(textA: string, textB: string): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }
  
  // Create a comparison prompt based on the cognitive profiler
  const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze TWO separate texts and provide a cognitive profile for each, plus a comparison:

TEXT A:
${textA}

TEXT B:
${textB}

For each text:
1. What kind of thinker wrote it?
2. Estimate intelligence from 1 to 100
3. Explain your score based on originality, abstraction, synthesis, inference, and compression

Then compare the two minds:
- What are the key differences in cognitive style and strength?
- Which shows evidence of higher intelligence and why?

Remember, you are profiling minds, not grading essays.
`;
  
  // Make the API call
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: "system",
          content: "You are analyzing texts as cognitive fingerprints to profile the minds that produced them. Do not grade the texts themselves."
        },
        {
          role: "user",
          content: comparePrompt
        }
      ],
      temperature: 0.4,
      max_tokens: 3000
    })
  });
  
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || "Comparison could not be generated";
}