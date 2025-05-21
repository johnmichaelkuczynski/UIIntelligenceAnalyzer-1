import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fetch from 'node-fetch';

// The exact cognitive profiler instructions from the specification
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
 * Analyze text with OpenAI - pure passthrough, no modification
 */
export async function openaiAnalyze(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `${COGNITIVE_PROFILER_PROMPT}\n\nTEXT TO PROFILE:\n${text}`
      }
    ],
  });
  
  return response.choices[0]?.message?.content || "Analysis failed";
}

/**
 * Analyze text with Claude - pure passthrough, no modification
 */
export async function claudeAnalyze(text: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    messages: [
      {
        role: "user",
        content: `${COGNITIVE_PROFILER_PROMPT}\n\nTEXT TO PROFILE:\n${text}`
      }
    ],
    max_tokens: 4000
  });
  
  if (response.content[0]?.type === 'text') {
    return response.content[0].text;
  }
  
  return "Analysis failed";
}

/**
 * Analyze text with Perplexity - pure passthrough, no modification
 */
export async function perplexityAnalyze(text: string): Promise<string> {
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
        {
          role: "user",
          content: `${COGNITIVE_PROFILER_PROMPT}\n\nTEXT TO PROFILE:\n${text}`
        }
      ],
      max_tokens: 4000
    })
  });
  
  const data = await response.json() as any;
  return data?.choices?.[0]?.message?.content || "Analysis failed";
}

/**
 * Compare two texts with OpenAI - pure passthrough, no modification
 */
export async function openaiCompare(textA: string, textB: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze and compare TWO separate writing samples. For each sample, create a cognitive profile of the author according to the instructions above. Then compare the two profiles.

DOCUMENT A:
${textA}

DOCUMENT B:
${textB}

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
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: comparePrompt
      }
    ],
  });
  
  return response.choices[0]?.message?.content || "Comparison failed";
}

/**
 * Compare two texts with Claude - pure passthrough, no modification
 */
export async function claudeCompare(textA: string, textB: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze and compare TWO separate writing samples. For each sample, create a cognitive profile of the author according to the instructions above. Then compare the two profiles.

DOCUMENT A:
${textA}

DOCUMENT B:
${textB}

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
  
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    messages: [
      {
        role: "user",
        content: comparePrompt
      }
    ],
    max_tokens: 4000
  });
  
  if (response.content[0]?.type === 'text') {
    return response.content[0].text;
  }
  
  return "Comparison failed";
}

/**
 * Compare two texts with Perplexity - pure passthrough, no modification
 */
export async function perplexityCompare(textA: string, textB: string): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }
  
  const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze and compare TWO separate writing samples. For each sample, create a cognitive profile of the author according to the instructions above. Then compare the two profiles.

DOCUMENT A:
${textA}

DOCUMENT B:
${textB}

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
          role: "user",
          content: comparePrompt
        }
      ],
      max_tokens: 4000
    })
  });
  
  const data = await response.json() as any;
  return data?.choices?.[0]?.message?.content || "Comparison failed";
}