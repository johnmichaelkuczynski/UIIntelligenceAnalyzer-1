import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// THE EXACT COGNITIVE PROFILER PROMPT
const PROFILER_PROMPT = `
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

/**
 * OpenAI cognitive profile - pure passthrough
 */
export async function profileWithOpenAI(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: `${PROFILER_PROMPT}\n\n${text}` }
    ]
  });
  
  return response.choices[0]?.message?.content || "Analysis failed";
}

/**
 * Anthropic cognitive profile - pure passthrough
 */
export async function profileWithClaude(text: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    messages: [
      { role: "user", content: `${PROFILER_PROMPT}\n\n${text}` }
    ],
    max_tokens: 4000
  });
  
  if (response.content[0]?.type === 'text') {
    return response.content[0].text;
  }
  
  return "Analysis failed";
}

/**
 * Perplexity cognitive profile - pure passthrough
 */
export async function profileWithPerplexity(text: string): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        { role: "user", content: `${PROFILER_PROMPT}\n\n${text}` }
      ],
      max_tokens: 4000
    })
  });
  
  const data = await response.json() as any;
  return data?.choices?.[0]?.message?.content || "Analysis failed";
}

/**
 * Compare cognitive profiles - pure passthrough
 */
export async function compareProfiles(textA: string, textB: string, provider: string): Promise<string> {
  const comparePrompt = `
${PROFILER_PROMPT}

I need you to analyze TWO separate texts and provide a cognitive profile for each:

TEXT A:
${textA}

TEXT B:
${textB}

For each text:
1. What kind of thinker wrote it?
2. Estimate intelligence from 1 to 100
3. Explain your score based on originality, abstraction, synthesis, inference, and compression

Then compare the two minds:
- What are the key differences in cognitive style?
- Which shows evidence of higher intelligence and why?
`;

  if (provider === 'anthropic') {
    return await compareWithClaude(comparePrompt);
  } else if (provider === 'perplexity') {
    return await compareWithPerplexity(comparePrompt);
  } else {
    return await compareWithOpenAI(comparePrompt);
  }
}

async function compareWithOpenAI(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: prompt }
    ]
  });
  
  return response.choices[0]?.message?.content || "Comparison failed";
}

async function compareWithClaude(prompt: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    messages: [
      { role: "user", content: prompt }
    ],
    max_tokens: 4000
  });
  
  if (response.content[0]?.type === 'text') {
    return response.content[0].text;
  }
  
  return "Comparison failed";
}

async function compareWithPerplexity(prompt: string): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 4000
    })
  });
  
  const data = await response.json() as any;
  return data?.choices?.[0]?.message?.content || "Comparison failed";
}