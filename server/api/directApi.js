// Direct API access for Cognitive Profiler
const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

// Exactly as specified in the requirements - use this exact prompt
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

// Direct OpenAI API call - pure passthrough
async function analyzeWithOpenAI(text) {
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
      ],
      temperature: 0.1
    });
    
    // Return the raw, unmodified response
    return {
      success: true,
      result: response.choices[0]?.message?.content || "Analysis failed"
    };
  } catch (error) {
    console.error("OpenAI API error:", error.message);
    return {
      success: false,
      result: "Service temporarily unavailable. Please try again later."
    };
  }
}

// Direct Anthropic API call - pure passthrough
async function analyzeWithAnthropic(text) {
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      messages: [
        { role: 'user', content: `${COGNITIVE_PROFILER_PROMPT}\n\n${text}` }
      ],
      max_tokens: 4000
    });
    
    // Return the raw, unmodified response
    if (response.content && response.content[0] && response.content[0].type === 'text') {
      return {
        success: true,
        result: response.content[0].text
      };
    } else {
      return {
        success: false,
        result: "Service temporarily unavailable. Please try again later."
      };
    }
  } catch (error) {
    console.error("Anthropic API error:", error.message);
    return {
      success: false,
      result: "Service temporarily unavailable. Please try again later."
    };
  }
}

// Direct OpenAI API call for comparison - pure passthrough
async function compareWithOpenAI(textA, textB) {
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  // Build comparison prompt
  const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze TWO separate texts and provide a cognitive profile for each:

TEXT A:
${textA}

TEXT B:
${textB}

For each text:
1. What kind of thinker wrote it?
2. Estimate the author's intelligence on a scale from 1 to 100
3. Explain your score based on the cognitive characteristics mentioned above

Then compare the two minds:
- What are the key differences in cognitive style?
- Which shows evidence of higher intelligence and why?
`;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: 'user', content: comparePrompt }
      ],
      temperature: 0.1
    });
    
    // Return the raw, unmodified response
    return {
      success: true,
      result: response.choices[0]?.message?.content || "Comparison failed"
    };
  } catch (error) {
    console.error("OpenAI comparison error:", error.message);
    return {
      success: false,
      result: "Service temporarily unavailable. Please try again later."
    };
  }
}

// Direct Anthropic API call for comparison - pure passthrough
async function compareWithAnthropic(textA, textB) {
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Build comparison prompt
  const comparePrompt = `
${COGNITIVE_PROFILER_PROMPT}

I need you to analyze TWO separate texts and provide a cognitive profile for each:

TEXT A:
${textA}

TEXT B:
${textB}

For each text:
1. What kind of thinker wrote it?
2. Estimate the author's intelligence on a scale from 1 to 100
3. Explain your score based on the cognitive characteristics mentioned above

Then compare the two minds:
- What are the key differences in cognitive style?
- Which shows evidence of higher intelligence and why?
`;
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      messages: [
        { role: 'user', content: comparePrompt }
      ],
      max_tokens: 4000
    });
    
    // Return the raw, unmodified response
    if (response.content && response.content[0] && response.content[0].type === 'text') {
      return {
        success: true,
        result: response.content[0].text
      };
    } else {
      return {
        success: false,
        result: "Service temporarily unavailable. Please try again later."
      };
    }
  } catch (error) {
    console.error("Anthropic comparison error:", error.message);
    return {
      success: false,
      result: "Service temporarily unavailable. Please try again later."
    };
  }
}

// Export our functions
module.exports = {
  analyzeWithOpenAI,
  analyzeWithAnthropic,
  compareWithOpenAI,
  compareWithAnthropic
};