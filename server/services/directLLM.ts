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
    const result = JSON.parse(response.content[0].text);
    result.provider = "Anthropic (Claude-3.7-Sonnet)";
    return result;
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

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Perplexity API error: ${data.error?.message || JSON.stringify(data)}`);
    }

    // Parse result from Perplexity response
    const result = JSON.parse(data.choices[0].message.content);
    result.provider = "Perplexity (Llama-3.1-Sonar)";
    return result;
  } catch (error) {
    console.error("Error in direct passthrough to Perplexity:", error);
    throw error;
  }
}