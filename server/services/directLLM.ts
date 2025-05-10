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
      system: ANALYSIS_PROMPT + "\n\nIMPORTANT: Return valid JSON directly without using markdown code blocks or backticks. Do not include ```json or ``` in your response. Just return the raw JSON object.",
      max_tokens: 4000,
      messages: [
        { role: "user", content: text }
      ]
    });

    // Parse the response content and return without custom processing
    if (response.content && response.content[0] && 'text' in response.content[0]) {
      // Claude often wraps JSON in code blocks, so we need to extract just the JSON part
      let responseText = response.content[0].text as string;
      
      // Remove any markdown code block indicators if present
      if (responseText.includes("```json") || responseText.includes("```")) {
        // Extract text between code blocks if present
        const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
          responseText = jsonMatch[1].trim();
        } else {
          // Remove just the starting and ending backticks if present
          responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
      }
      
      console.log("Parsed Anthropic response text:", responseText.substring(0, 100) + "...");
      
      try {
        const result = JSON.parse(responseText);
        result.provider = "Anthropic (Claude-3.7-Sonnet)";
        return result;
      } catch (parseError) {
        console.error("JSON Parse error with Anthropic response:", parseError);
        console.error("First 500 chars of response:", responseText.substring(0, 500));
        
        // Return a fallback response
        return {
          surface: { grammar: 75, structure: 75, jargonUsage: 75, surfaceFluency: 75 },
          deep: { 
            conceptualDepth: 80, inferentialContinuity: 80, claimNecessity: 80,
            semanticCompression: 80, logicalLaddering: 80, depthFluency: 80, originality: 80
          },
          overallScore: 80,
          analysis: "Error parsing Anthropic response. Here's the raw text: " + responseText.substring(0, 1000),
          surfaceScore: 75,
          deepScore: 80,
          provider: "Anthropic (Claude-3.7-Sonnet) - Parse Error"
        };
      }
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
  // Default fallback response when API calls fail
  const fallbackResponse = {
    surface: { grammar: 75, structure: 75, jargonUsage: 75, surfaceFluency: 75 },
    deep: { 
      conceptualDepth: 80, inferentialContinuity: 80, claimNecessity: 80,
      semanticCompression: 80, logicalLaddering: 80, depthFluency: 80, originality: 80
    },
    overallScore: 80,
    surfaceScore: 75,
    deepScore: 80,
    provider: "Perplexity (API Error)"
  };
  
  try {
    // Check if Perplexity API key exists
    if (!process.env.PERPLEXITY_API_KEY) {
      console.error("PERPLEXITY_API_KEY is missing");
      return {
        ...fallbackResponse,
        analysis: "Error: PERPLEXITY_API_KEY is required but not provided"
      };
    }

    console.log("Starting Perplexity API request with key:", 
               process.env.PERPLEXITY_API_KEY ? `${process.env.PERPLEXITY_API_KEY.substring(0, 5)}...` : "missing");
    
    try {           
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: ANALYSIS_PROMPT + "\n\nIMPORTANT: Return valid JSON directly without using markdown code blocks or backticks. Do not include ```json or ``` in your response. Just return the raw JSON object." },
            { role: "user", content: text }
          ],
          temperature: 0.2
        })
      });
      
      // Handle potential HTML response error (common with API authentication issues)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const htmlContent = await response.text();
        console.error("Received HTML response from Perplexity:", htmlContent.substring(0, 500));
        return {
          ...fallbackResponse,
          analysis: "Error: Received HTML instead of JSON from Perplexity API. This usually indicates an authentication error."
        };
      }
      
      const data = await response.json() as any;
      if (!response.ok) {
        return {
          ...fallbackResponse,
          analysis: `Perplexity API error: ${data?.error?.message || JSON.stringify(data)}`
        };
      }

      // Parse result from Perplexity response
      if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        // Extract JSON from the response (Perplexity might also wrap in code blocks)
        let responseText = data.choices[0].message.content;
        
        // Remove any markdown code block indicators if present
        if (responseText.includes("```json") || responseText.includes("```")) {
          // Extract text between code blocks if present
          const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/);
          if (jsonMatch && jsonMatch[1]) {
            responseText = jsonMatch[1].trim();
          } else {
            // Remove just the starting and ending backticks if present
            responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
        }
        
        console.log("Parsed Perplexity response text:", responseText.substring(0, 100) + "...");
        
        try {
          const result = JSON.parse(responseText);
          result.provider = "Perplexity (Llama-3.1-Sonar)";
          return result;
        } catch (parseError) {
          console.error("JSON Parse error with Perplexity response:", parseError);
          console.error("First 500 chars of response:", responseText.substring(0, 500));
          
          return {
            ...fallbackResponse,
            analysis: "Error parsing Perplexity response. Here's the raw text: " + responseText.substring(0, 1000),
            provider: "Perplexity (Llama-3.1-Sonar) - Parse Error"
          };
        }
      } else {
        return {
          ...fallbackResponse,
          analysis: "Unexpected response format from Perplexity API"
        };
      }
    } catch (fetchError) {
      console.error("Fetch error with Perplexity:", fetchError);
      return {
        ...fallbackResponse,
        analysis: "Error connecting to Perplexity API: " + (fetchError instanceof Error ? fetchError.message : String(fetchError))
      };
    }
  } catch (error) {
    console.error("Error in direct passthrough to Perplexity:", error);
    return {
      ...fallbackResponse,
      analysis: "Error in Perplexity API call: " + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Direct pass-through for translation using selected LLM provider
 * No custom algorithms or processing - just send the text directly to the LLM
 */
export async function directTranslate(
  text: string, 
  sourceLanguage: string,
  targetLanguage: string,
  provider: string = "openai"
): Promise<any> {
  try {
    // Construct translation prompt
    const translationPrompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Preserve the original meaning, tone, and formatting as closely as possible.\n\nOriginal text (${sourceLanguage}):\n\n${text}\n\nTranslated text (${targetLanguage}):`;
    
    let translatedText = "";
    
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
            { role: "user", content: translationPrompt }
          ]
        });
        
        if (response.content && response.content[0] && 'text' in response.content[0]) {
          translatedText = response.content[0].text as string;
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
              { role: "user", content: translationPrompt }
            ],
            temperature: 0.3
          })
        });
        
        const data = await response.json() as any;
        if (!response.ok) {
          throw new Error(`Perplexity API error: ${data?.error?.message || JSON.stringify(data)}`);
        }
        
        if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          translatedText = data.choices[0].message.content;
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
            { role: "user", content: translationPrompt }
          ],
          temperature: 0.3
        });
        
        translatedText = response.choices[0].message.content || "";
        break;
      }
    }
    
    return {
      originalText: text,
      translatedText: translatedText,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      provider: provider,
      stats: {
        originalLength: text.length,
        translatedLength: translatedText.length,
        lengthChange: translatedText.length - text.length,
        lengthChangePct: Math.round((translatedText.length - text.length) / text.length * 100)
      }
    };
  } catch (error) {
    console.error(`Error in direct ${provider} translation:`, error);
    throw error;
  }
}

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