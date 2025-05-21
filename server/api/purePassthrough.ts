import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// THE EXACT SPECIFIED PROMPT - NO MODIFICATIONS
const COGNITIVE_PROFILE_PROMPT = `
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
 * Request OpenAI analysis - pure passthrough
 */
export async function openaiPassthrough(text: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY 
  });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user", 
      content: `${COGNITIVE_PROFILE_PROMPT}\n\n${text}`
    }]
  });
  
  return response.choices[0].message.content;
}

/**
 * Request Anthropic analysis - pure passthrough
 */
export async function anthropicPassthrough(text: string): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    messages: [{
      role: "user", 
      content: `${COGNITIVE_PROFILE_PROMPT}\n\n${text}`
    }],
    max_tokens: 4000
  });
  
  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Request Perplexity analysis - pure passthrough
 */
export async function perplexityPassthrough(text: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [{
        role: "user", 
        content: `${COGNITIVE_PROFILE_PROMPT}\n\n${text}`
      }]
    })
  });
  
  const data = await response.json() as any;
  return data.choices[0].message.content;
}

/**
 * Compare two texts - pure passthrough
 */
export async function comparePassthrough(textA: string, textB: string, provider: string): Promise<string> {
  const comparePrompt = `
${COGNITIVE_PROFILE_PROMPT}

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

  switch (provider.toLowerCase()) {
    case 'anthropic':
      return await compareWithAnthropic(comparePrompt);
    case 'perplexity':
      return await compareWithPerplexity(comparePrompt);
    default:
      return await compareWithOpenAI(comparePrompt);
  }
}

async function compareWithOpenAI(prompt: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY 
  });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user", 
      content: prompt
    }]
  });
  
  return response.choices[0].message.content;
}

async function compareWithAnthropic(prompt: string): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    messages: [{
      role: "user", 
      content: prompt
    }],
    max_tokens: 4000
  });
  
  return response.content[0].type === 'text' ? response.content[0].text : '';
}

async function compareWithPerplexity(prompt: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [{
        role: "user", 
        content: prompt
      }]
    })
  });
  
  const data = await response.json() as any;
  return data.choices[0].message.content;
}