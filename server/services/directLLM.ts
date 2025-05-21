import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fetch from 'node-fetch';

// The core cognitive profiler prompt that treats the text as evidence, not something to be graded
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

// The newest OpenAI model - do not change unless requested
const GPT_MODEL = 'gpt-4o';

// The newest Anthropic model - do not change unless requested
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

/**
 * Direct OpenAI analysis - pure passthrough without any scoring manipulation
 */
export async function directOpenAIAnalyze(content: string): Promise<any> {
  console.log('Sending direct request to OpenAI...');
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        provider: 'OpenAI (Not Configured)',
        formattedReport: "Error: OpenAI API key is not configured. Please add your API key to continue."
      };
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Construct the full prompt with cognitive profiler instructions
    const prompt = `
${COGNITIVE_PROFILER_PROMPT}

TEXT TO PROFILE:
${content}
`;
    
    // Make direct API call to OpenAI
    const response = await openai.chat.completions.create({
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
      temperature: 0.1,
      max_tokens: 3000
    });
    
    // Extract the raw response text
    const analysisText = response.choices[0]?.message?.content || "No analysis was generated.";
    
    // Return the raw analysis without any additional processing
    return {
      provider: 'OpenAI (GPT-4o)',
      formattedReport: analysisText,
      rawResponse: response
    };
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    return {
      provider: 'OpenAI (Error)',
      formattedReport: `Error: ${error.message || "Unknown error occurred when calling OpenAI API"}`
    };
  }
}

/**
 * Direct Anthropic Claude analysis - pure passthrough without any scoring manipulation
 */
export async function directAnthropicAnalyze(content: string): Promise<any> {
  console.log('Sending direct request to Anthropic Claude...');
  
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        provider: 'Anthropic (Not Configured)',
        formattedReport: "Error: Anthropic API key is not configured. Please add your API key to continue."
      };
    }
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    // Construct the full prompt with cognitive profiler instructions
    const prompt = `
${COGNITIVE_PROFILER_PROMPT}

TEXT TO PROFILE:
${content}
`;
    
    // Make direct API call to Anthropic
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 3000
    });
    
    // Extract the raw response text safely
    let analysisText = "No analysis was generated.";
    if (response.content && response.content.length > 0) {
      if (response.content[0].type === 'text') {
        analysisText = response.content[0].text;
      }
    }
    
    // Return the raw analysis without any additional processing
    return {
      provider: 'Anthropic (Claude 3 Sonnet)',
      formattedReport: analysisText,
      rawResponse: response
    };
  } catch (error: any) {
    console.error("Anthropic API error:", error);
    
    return {
      provider: 'Anthropic (Error)',
      formattedReport: `Error: ${error.message || "Unknown error occurred when calling Anthropic API"}`
    };
  }
}

/**
 * Direct Perplexity analysis - pure passthrough without any scoring manipulation
 */
export async function directPerplexityAnalyze(content: string): Promise<any> {
  console.log('Sending direct request to Perplexity...');
  
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      return {
        provider: 'Perplexity (Not Configured)',
        formattedReport: "Error: Perplexity API key is not configured. Please add your API key to continue."
      };
    }
    
    // Construct the full prompt with cognitive profiler instructions
    const prompt = `
${COGNITIVE_PROFILER_PROMPT}

TEXT TO PROFILE:
${content}
`;
    
    // Make direct API call to Perplexity
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
        max_tokens: 3000,
        temperature: 0.1
      })
    });
    
    const data = await response.json() as any;
    
    // Extract the raw response text
    const analysisText = data?.choices?.[0]?.message?.content || "No analysis was generated.";
    
    // Return the raw analysis without any additional processing
    return {
      provider: 'Perplexity (Llama-3.1-Sonar)',
      formattedReport: analysisText,
      rawResponse: data
    };
  } catch (error: any) {
    console.error("Perplexity API error:", error);
    
    return {
      provider: 'Perplexity (Error)',
      formattedReport: `Error: ${error.message || "Unknown error occurred when calling Perplexity API"}`
    };
  }
}

/**
 * Direct comparison of two documents for cognitive profile comparison
 */
export async function directCompare(documentA: string, documentB: string, provider: string): Promise<any> {
  console.log(`Sending direct comparison request to ${provider}...`);
  
  // Construct the comparison prompt using the cognitive profiler instructions
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
    // Use the selected provider for the comparison
    switch (provider.toLowerCase()) {
      case 'anthropic':
        return await directAnthropicCompare(prompt);
      case 'perplexity':
        return await directPerplexityCompare(prompt);
      case 'openai':
      default:
        return await directOpenAICompare(prompt);
    }
  } catch (error: any) {
    console.error(`Error in ${provider} comparison:`, error);
    
    return {
      provider: `${provider} (Error)`,
      comparisonResult: `Error: ${error.message || "Unknown error occurred during comparison"}`,
      error: true
    };
  }
}

/**
 * Helper function for OpenAI comparison
 */
async function directOpenAICompare(prompt: string): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      provider: 'OpenAI (Not Configured)',
      comparisonResult: "Error: OpenAI API key is not configured. Please add your API key to continue."
    };
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const response = await openai.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a cognitive profiler who analyzes writing to understand the minds behind the texts."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 4000
  });
  
  const comparisonText = response.choices[0]?.message?.content || "No comparison was generated.";
  
  return {
    provider: 'OpenAI (GPT-4o)',
    comparisonResult: comparisonText,
    rawResponse: response
  };
}

/**
 * Helper function for Anthropic comparison
 */
async function directAnthropicCompare(prompt: string): Promise<any> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'Anthropic (Not Configured)',
      comparisonResult: "Error: Anthropic API key is not configured. Please add your API key to continue."
    };
  }
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 4000
  });
  
  // Extract the raw response text safely
  let comparisonText = "No comparison was generated.";
  if (response.content && response.content.length > 0) {
    if (response.content[0].type === 'text') {
      comparisonText = response.content[0].text;
    }
  }
  
  return {
    provider: 'Anthropic (Claude 3 Sonnet)',
    comparisonResult: comparisonText,
    rawResponse: response
  };
}

/**
 * Helper function for Perplexity comparison
 */
async function directPerplexityCompare(prompt: string): Promise<any> {
  if (!process.env.PERPLEXITY_API_KEY) {
    return {
      provider: 'Perplexity (Not Configured)',
      comparisonResult: "Error: Perplexity API key is not configured. Please add your API key to continue."
    };
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
          role: "system",
          content: "You are a cognitive profiler who analyzes writing to understand the minds behind the texts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    })
  });
  
  const data = await response.json();
  
  const comparisonText = data?.choices?.[0]?.message?.content || "No comparison was generated.";
  
  return {
    provider: 'Perplexity (Llama-3.1-Sonar)',
    comparisonResult: comparisonText,
    rawResponse: data
  };
}