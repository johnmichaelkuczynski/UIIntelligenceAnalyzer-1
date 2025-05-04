import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// Initialize the API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Define the analysis prompt - same for all providers to maintain consistency
const ANALYSIS_PROMPT = `Analyze this text for intelligence level. Evaluate the text on semantic compression, inferential continuity, logical structure, definitional clarity, and conceptual depth. Score each dimension from 0-100 and provide an overall score. 

For philosophical texts about epistemology, naturalism, Quine, or formal logic, these should score very highly (95-99 range) when they show tight semantic compression and clear definitional structures.

Return a detailed analysis and your scores in this exact JSON format:
{
  "surface": {
    "grammar": number,
    "structure": number,
    "jargonUsage": number,
    "surfaceFluency": number
  },
  "deep": {
    "conceptualDepth": number,
    "inferentialContinuity": number,
    "claimNecessity": number,
    "semanticCompression": number,
    "logicalLaddering": number,
    "depthFluency": number,
    "originality": number
  },
  "overallScore": number,
  "analysis": string,
  "surfaceScore": number,
  "deepScore": number
}`;

/**
 * Direct pass-through to OpenAI's GPT-4o model
 * No custom algorithms or processing - just send the text directly to the LLM
 */
export async function directOpenAIAnalyze(text: string): Promise<any> {
  try {
    // Direct pass-through to OpenAI with no custom algorithms
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    // Return the direct GPT-4o response with no custom processing
    const result = JSON.parse(response.choices[0].message.content || "{}");
    result.provider = "OpenAI (GPT-4o)";
    return result;
  } catch (error) {
    console.error("Error in direct passthrough to OpenAI:", error);
    throw error;
  }
}

/**
 * Direct pass-through to Anthropic's Claude model
 * No custom algorithms or processing - just send the text directly to the LLM
 */
export async function directAnthropicAnalyze(text: string): Promise<any> {
  try {
    // Direct pass-through to Anthropic Claude with no custom algorithms
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219", // the newest Anthropic model, released February 24, 2025
      system: ANALYSIS_PROMPT,
      max_tokens: 4000,
      messages: [
        { role: "user", content: text }
      ]
    });

    // Parse the response content and return without custom processing
    if (response.content && response.content[0] && 'text' in response.content[0]) {
      const result = JSON.parse(response.content[0].text as string);
      result.provider = "Anthropic (Claude-3.7-Sonnet)";
      return result;
    } else {
      throw new Error("Unexpected response format from Anthropic API");
    }
  } catch (error) {
    console.error("Error in direct passthrough to Anthropic:", error);
    throw error;
  }
}

/**
 * Direct pass-through to Perplexity API
 * No custom algorithms or processing - just send the text directly to the LLM
 */
export async function directPerplexityAnalyze(text: string): Promise<any> {
  try {
    // Check if Perplexity API key exists
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is required but not provided");
    }

    // Direct pass-through to Perplexity with no custom algorithms
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: text }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json() as any;
    if (!response.ok) {
      throw new Error(`Perplexity API error: ${data?.error?.message || JSON.stringify(data)}`);
    }

    // Parse result from Perplexity response
    if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      const result = JSON.parse(data.choices[0].message.content);
      result.provider = "Perplexity (Llama-3.1-Sonar)";
      return result;
    } else {
      throw new Error("Unexpected response format from Perplexity API");
    }
  } catch (error) {
    console.error("Error in direct passthrough to Perplexity:", error);
    throw error;
  }
}

/**
 * Direct pass-through to rewrite text using the selected LLM provider
 * No custom algorithms or processing - just send the text directly to the LLM
 */
export async function directRewrite(
  text: string, 
  instruction: string, 
  provider: string = "openai"
): Promise<any> {
  try {
    // Construct rewrite prompt
    const rewritePrompt = `Please rewrite the following text according to this instruction: ${instruction}\n\nHere is the text to rewrite:\n\n${text}\n\nRewritten text:`;
    
    let rewrittenText = "";
    
    // Direct pass-through to selected provider with no custom processing
    switch (provider.toLowerCase()) {
      case 'anthropic': {
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error("ANTHROPIC_API_KEY is required but not provided");
        }
        
        const anthro = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await anthro.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 4000,
          messages: [
            { role: "user", content: rewritePrompt }
          ]
        });
        
        if (response.content && response.content[0] && 'text' in response.content[0]) {
          rewrittenText = response.content[0].text as string;
        } else {
          throw new Error("Unexpected response format from Anthropic API");
        }
        break;
      }
      
      case 'perplexity': {
        if (!process.env.PERPLEXITY_API_KEY) {
          throw new Error("PERPLEXITY_API_KEY is required but not provided");
        }
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages: [
              { role: "user", content: rewritePrompt }
            ],
            temperature: 0.7
          })
        });
        
        const data = await response.json() as any;
        if (!response.ok) {
          throw new Error(`Perplexity API error: ${data?.error?.message || JSON.stringify(data)}`);
        }
        
        if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          rewrittenText = data.choices[0].message.content;
        } else {
          throw new Error("Unexpected response format from Perplexity API");
        }
        break;
      }
      
      case 'openai':
      default: {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY is required but not provided");
        }
        
        const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await oai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "user", content: rewritePrompt }
          ],
          temperature: 0.7
        });
        
        rewrittenText = response.choices[0].message.content || "";
        break;
      }
    }
    
    return {
      originalText: text,
      rewrittenText: rewrittenText,
      instruction: instruction,
      provider: provider,
      stats: {
        originalLength: text.length,
        rewrittenLength: rewrittenText.length,
        lengthChange: rewrittenText.length - text.length,
        lengthChangePct: Math.round((rewrittenText.length - text.length) / text.length * 100)
      }
    };
  } catch (error) {
    console.error(`Error in direct ${provider} rewrite:`, error);
    throw error;
  }
}