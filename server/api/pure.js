const OpenAI = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');

// Exactly your profiler prompt - no modifications
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

// OpenAI direct passthrough
async function profileOpenAI(text) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: PROFILER_PROMPT + "\n\n" + text }],
  });
  
  return response.choices[0].message.content;
}

// Claude direct passthrough
async function profileClaude(text) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    messages: [{ role: "user", content: PROFILER_PROMPT + "\n\n" + text }],
    max_tokens: 4000,
  });
  
  // Extract text safely
  if (response.content && response.content[0] && response.content[0].type === 'text') {
    return response.content[0].text;
  }
  return "Analysis failed";
}

// Compare two texts
async function compareTexts(textA, textB, provider) {
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
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      messages: [{ role: "user", content: comparePrompt }],
      max_tokens: 4000,
    });
    
    if (response.content && response.content[0] && response.content[0].type === 'text') {
      return response.content[0].text;
    }
    return "Comparison failed";
  } else {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: comparePrompt }],
    });
    
    return response.choices[0].message.content;
  }
}

module.exports = {
  profileOpenAI,
  profileClaude,
  compareTexts
};
