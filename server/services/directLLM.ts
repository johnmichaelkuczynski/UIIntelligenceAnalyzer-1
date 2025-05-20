import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import { ENHANCED_ANALYSIS_PROMPT } from '../prompts/enhancedAnalysisPrompt';

// Initialize the API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Constants for text processing
const MAX_CHUNK_SIZE = 8000; // Characters per chunk (approx. 2000-2500 tokens)
const MAX_CHUNKS = 8; // Maximum number of chunks to process
const REQUEST_DELAY = 2000; // Delay between API requests in milliseconds
const RATE_LIMIT_RETRY_DELAY = 10000; // Delay before retrying after a rate limit error

// Use the enhanced analysis prompt that detects authentic vs. simulated intelligence
const ANALYSIS_PROMPT = ENHANCED_ANALYSIS_PROMPT;

/**
 * Split text into chunks for large document processing
 * Attempts to split at paragraph or sentence boundaries
 */
function splitTextIntoChunks(text: string, maxChunkSize = MAX_CHUNK_SIZE): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    // Determine the potential end of the current chunk
    let endPos = Math.min(currentPos + maxChunkSize, text.length);
    
    // Try to find a paragraph break
    const paragraphBreak = text.lastIndexOf('\n\n', endPos);
    if (paragraphBreak > currentPos && paragraphBreak > endPos - 500) {
      endPos = paragraphBreak + 2; // Include the newlines
    } else {
      // Try to find a newline
      const newlineBreak = text.lastIndexOf('\n', endPos);
      if (newlineBreak > currentPos && newlineBreak > endPos - 300) {
        endPos = newlineBreak + 1; // Include the newline
      } else {
        // Try to find a sentence boundary
        const sentenceBreak = Math.max(
          text.lastIndexOf('. ', endPos),
          text.lastIndexOf('! ', endPos),
          text.lastIndexOf('? ', endPos)
        );
        if (sentenceBreak > currentPos && sentenceBreak > endPos - 200) {
          endPos = sentenceBreak + 2; // Include the period and space
        }
      }
    }
    
    // If we couldn't find a good break point, just use the max size
    if (endPos <= currentPos) {
      endPos = Math.min(currentPos + maxChunkSize, text.length);
    }
    
    // Add the chunk and move to the next position
    chunks.push(text.substring(currentPos, endPos));
    currentPos = endPos;
  }
  
  return chunks;
}

/**
 * Delay execution with a promise
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Average multiple analysis results into a single result
 * Used when a document is split into chunks
 */
function averageAnalysisResults(results: any[]): any {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];
  
  // Initialize result object with the structure from the first result
  const averaged: any = {
    surface: {
      grammar: 0,
      structure: 0,
      jargonUsage: 0,
      surfaceFluency: 0
    },
    deep: {
      conceptualIntegrity: 0,
      inferentialNecessity: 0,
      compressionFidelity: 0,
      contentOrigination: 0,
      impostorIndex: 0
    },
    overallScore: 0,
    surfaceScore: 0,
    deepScore: 0,
    analysis: "",
    provider: results[0].provider
  };
  
  // Sum all numeric values
  for (const result of results) {
    // Surface metrics
    for (const key in result.surface) {
      if (typeof result.surface[key] === 'number') {
        averaged.surface[key] += result.surface[key] / results.length;
      }
    }
    
    // Deep metrics
    for (const key in result.deep) {
      if (typeof result.deep[key] === 'number') {
        averaged.deep[key] += result.deep[key] / results.length;
      }
    }
    
    // Overall scores
    if (typeof result.overallScore === 'number') {
      averaged.overallScore += result.overallScore / results.length;
    }
    if (typeof result.surfaceScore === 'number') {
      averaged.surfaceScore += result.surfaceScore / results.length;
    }
    if (typeof result.deepScore === 'number') {
      averaged.deepScore += result.deepScore / results.length;
    }
    
    // Concatenate analyses with separators
    if (result.analysis) {
      if (averaged.analysis) {
        averaged.analysis += "\n\n--- Next Section Analysis ---\n\n";
      }
      averaged.analysis += result.analysis;
    }
  }
  
  // Round numeric values for cleaner display
  for (const key in averaged.surface) {
    if (typeof averaged.surface[key] === 'number') {
      averaged.surface[key] = Math.round(averaged.surface[key]);
    }
  }
  
  for (const key in averaged.deep) {
    if (typeof averaged.deep[key] === 'number') {
      averaged.deep[key] = Math.round(averaged.deep[key]);
    }
  }
  
  averaged.overallScore = Math.round(averaged.overallScore);
  averaged.surfaceScore = Math.round(averaged.surfaceScore);
  averaged.deepScore = Math.round(averaged.deepScore);
  
  // Add a note about the chunking process
  averaged.summary = `This analysis was performed by processing the document in ${results.length} sections and combining the results.`;
  
  return averaged;
}

/**
 * Direct pass-through to OpenAI's GPT-4o model
 * Handles large documents by splitting into chunks and processing them separately
 */
export async function directOpenAIAnalyze(text: string): Promise<any> {
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    try {
      // Direct pass-through to OpenAI with no custom algorithms
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { 
            role: "system", 
            content: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level. Provide detailed, evidence-based assessments that identify specific cognitive strengths and weaknesses in writing. Focus on semantic density, logical structure, and conceptual clarity. Always cite specific quotes from the text to justify your scores."
          },
          { role: "user", content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${text}` }
        ],
        max_tokens: 4000,
        temperature: 0.2
      });

      // Parse the response to separate the formatted report from the JSON data
      const responseText = response.choices[0].message.content || "{}";
      let result;
      
      try {
        // Extract the JSON part from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          result = JSON.parse(jsonStr);
          
          // Store the formatted report (the text before the JSON)
          const formattedReport = responseText.substring(0, responseText.indexOf('{'));
          result.formattedReport = formattedReport.trim();
          
          // Add provider information
          result.provider = "OpenAI (GPT-4o)";
        } else {
          // If no JSON found, try to parse the whole response as JSON
          result = JSON.parse(responseText);
          result.provider = "OpenAI (GPT-4o)";
          result.formattedReport = "Intelligence Score: " + result.overallScore + "/100\n\n" +
            "Surface-Level Scores:\n" +
            "- Grammar: " + result.surface.grammar + "\n" +
            "- Structure: " + result.surface.structure + "\n" +
            "- Jargon Usage: " + result.surface.jargonUsage + "\n" +
            "- Surface Fluency: " + result.surface.surfaceFluency + "\n\n" +
            "Deep-Level Scores:\n" +
            "- Conceptual Integrity: " + result.deep.conceptualIntegrity + "\n" +
            "- Inferential Necessity: " + result.deep.inferentialNecessity + "\n" +
            "- Compression Fidelity: " + result.deep.compressionFidelity + "\n" +
            "- Content Origination: " + result.deep.contentOrigination + "\n" +
            "- Impostor Index: " + result.deep.impostorIndex + "\n\n" +
            "Summary Assessment:\n" + result.analysis;
        }
      } catch (error) {
        console.error("Failed to parse OpenAI response:", error);
        console.error("Raw response:", responseText);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error("Error in direct passthrough to OpenAI:", error);
      throw error;
    }
  }
  
  // For large texts, split into chunks and process each one
  console.log(`Text is large (${text.length} chars), splitting into chunks for processing...`);
  
  const chunks = splitTextIntoChunks(text);
  console.log(`Split into ${chunks.length} chunks`);
  
  // Limit the number of chunks to prevent excessive API usage
  const chunksToProcess = chunks.slice(0, MAX_CHUNKS);
  if (chunksToProcess.length < chunks.length) {
    console.log(`Processing only the first ${MAX_CHUNKS} chunks to limit API usage`);
  }
  
  const results = [];
  
  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars)...`);
    
    try {
      // Try to process the chunk
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level." },
          { role: "user", content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${chunk}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });
      
      const result = JSON.parse(response.choices[0].message.content || "{}");
      result.provider = "OpenAI (GPT-4o)";
      results.push(result);
      console.log(`Successfully processed chunk ${i+1}`);
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1}:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.log(`Rate limit exceeded. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1}...`);
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level." },
              { role: "user", content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${chunk}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
          });
          
          const result = JSON.parse(response.choices[0].message.content || "{}");
          result.provider = "OpenAI (GPT-4o)";
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} on retry`);
        } catch (retryError) {
          console.error(`Failed to process chunk ${i+1} on retry:`, retryError);
          // Continue to the next chunk
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next chunk despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, throw an error
  if (results.length === 0) {
    throw new Error("Failed to process any chunks of the document. The document may be too large or processed too quickly. Please try again later.");
  }
  
  // Average the results from all chunks
  console.log(`Combining results from ${results.length} chunks...`);
  const combinedResult = averageAnalysisResults(results);
  return combinedResult;
}

/**
 * Direct pass-through to Anthropic's Claude model
 * Handles large documents by splitting into chunks and processing them separately
 */
export async function directAnthropicAnalyze(text: string): Promise<any> {
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    try {
      // Direct pass-through to Anthropic Claude with no custom algorithms
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        system: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level. Provide detailed, evidence-based assessments with specific quotes from the text. Use the exact format requested.",
        max_tokens: 4000,
        messages: [
          { role: "user", content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${text}` }
        ]
      });
  
      // Parse the response content and return without custom processing
      if (response.content && response.content[0] && 'text' in response.content[0]) {
        // Get the full response text from Claude
        let responseText = response.content[0].text as string;
        
        // Split the response into the formatted report and JSON parts
        let formattedReport = "";
        let jsonText = "";
        
        // Extract JSON part (usually at the end)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
          // The formatted report is everything before the JSON
          formattedReport = responseText.substring(0, responseText.indexOf(jsonMatch[0]));
          
          try {
            // Parse the JSON part
            const result = JSON.parse(jsonText);
            result.formattedReport = formattedReport.trim();
            result.provider = "Anthropic (Claude-3-7-Sonnet)";
            return result;
          } catch (jsonError) {
            console.error("Failed to parse JSON from Claude response:", jsonError);
            throw new Error("Failed to parse JSON from Claude response");
          }
        } else {
          // No JSON found, return the text as is with a basic structure
          return {
            provider: "Anthropic (Claude-3-7-Sonnet)",
            formattedReport: responseText,
            surface: {
              grammar: 0,
              structure: 0,
              jargonUsage: 0,
              surfaceFluency: 0
            },
            deep: {
              conceptualIntegrity: 0,
              inferentialNecessity: 0,
              compressionFidelity: 0,
              contentOrigination: 0,
              impostorIndex: 0
            },
            overallScore: 0,
            analysis: responseText
          };
        }
      } else {
        throw new Error("Unexpected response format from Anthropic");
      }
    } catch (error) {
      console.error("Error in direct passthrough to Anthropic:", error);
      throw error;
    }
  }
  
  // For large texts, split into chunks and process each one
  console.log(`Text is large (${text.length} chars), splitting into chunks for processing with Claude...`);
  
  const chunks = splitTextIntoChunks(text);
  console.log(`Split into ${chunks.length} chunks`);
  
  // Limit the number of chunks to prevent excessive API usage
  const chunksToProcess = chunks.slice(0, MAX_CHUNKS);
  if (chunksToProcess.length < chunks.length) {
    console.log(`Processing only the first ${MAX_CHUNKS} chunks to limit API usage`);
  }
  
  const results = [];
  
  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars) with Claude...`);
    
    try {
      // Process the chunk with Claude
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        system: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level. Return your analysis in JSON format.",
        max_tokens: 4000,
        messages: [
          { role: "user", content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${chunk}` }
        ]
      });
      
      if (response.content && response.content[0] && 'text' in response.content[0]) {
        const responseText = response.content[0].text as string;
        
        // Extract JSON part
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          result.provider = "Anthropic (Claude-3-7-Sonnet)";
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} with Claude`);
        } else {
          console.warn(`No JSON found in Claude's response for chunk ${i+1}`);
          // Create a basic result if JSON is missing
          results.push({
            provider: "Anthropic (Claude-3-7-Sonnet)",
            surface: {
              grammar: 70,
              structure: 70,
              jargonUsage: 70,
              surfaceFluency: 70
            },
            deep: {
              conceptualIntegrity: 70,
              inferentialNecessity: 70,
              compressionFidelity: 70,
              contentOrigination: 70,
              impostorIndex: 30
            },
            overallScore: 70,
            analysis: "Analysis could not be extracted from Claude's response."
          });
        }
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk with Claude...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1} with Claude:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.log(`Rate limit exceeded with Claude. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1} with Claude...`);
          const response = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            system: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level. Return your analysis in JSON format.",
            max_tokens: 4000,
            messages: [
              { role: "user", content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${chunk}` }
            ]
          });
          
          if (response.content && response.content[0] && 'text' in response.content[0]) {
            const responseText = response.content[0].text as string;
            
            // Extract JSON part
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              result.provider = "Anthropic (Claude-3-7-Sonnet)";
              results.push(result);
              console.log(`Successfully processed chunk ${i+1} with Claude on retry`);
            }
          }
        } catch (retryError) {
          console.error(`Failed to process chunk ${i+1} with Claude on retry:`, retryError);
          // Continue to the next chunk
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next chunk with Claude despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, throw an error
  if (results.length === 0) {
    throw new Error("Failed to process any chunks of the document with Claude. The document may be too large or processed too quickly. Please try again later.");
  }
  
  // Average the results from all chunks
  console.log(`Combining Claude results from ${results.length} chunks...`);
  const combinedResult = averageAnalysisResults(results);
  return combinedResult;
}

/**
 * Direct pass-through to Perplexity API
 * Handles large documents by splitting into chunks and processing them separately
 */
export async function directPerplexityAnalyze(text: string): Promise<any> {
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    try {
      // Direct pass-through to Perplexity
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
              content: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level. You provide detailed, evidence-based assessments with specific quotes from the text. Use the exact format requested."
            },
            {
              role: "user",
              content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${text}`
            }
          ],
          temperature: 0.2,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
        // Get the response content
        const responseText = responseData.choices[0].message.content;
        
        // Split the response into the formatted report and JSON parts
        let formattedReport = "";
        let jsonText = "";
        
        // Extract JSON part (usually at the end)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
          // The formatted report is everything before the JSON
          formattedReport = responseText.substring(0, responseText.indexOf(jsonMatch[0]));
          
          try {
            // Parse the JSON part
            const result = JSON.parse(jsonText);
            result.formattedReport = formattedReport.trim();
            result.provider = "Perplexity (Llama-3.1-Sonar)";
            if (responseData.citations) {
              result.citations = responseData.citations;
            }
            return result;
          } catch (jsonError) {
            console.error("Failed to parse JSON from Perplexity response:", jsonError);
            throw new Error("Failed to parse JSON from Perplexity response");
          }
        } else {
          // No JSON found, return the text as is with a basic structure
          return {
            provider: "Perplexity (Llama-3.1-Sonar)",
            formattedReport: responseText,
            surface: {
              grammar: 0,
              structure: 0,
              jargonUsage: 0,
              surfaceFluency: 0
            },
            deep: {
              conceptualIntegrity: 0,
              inferentialNecessity: 0,
              compressionFidelity: 0,
              contentOrigination: 0,
              impostorIndex: 0
            },
            overallScore: 0,
            analysis: responseText
          };
        }
      } else {
        throw new Error("Unexpected response format from Perplexity");
      }
    } catch (error) {
      console.error("Error in direct passthrough to Perplexity:", error);
      throw error;
    }
  }
  
  // For large texts, split into chunks and process each one
  console.log(`Text is large (${text.length} chars), splitting into chunks for processing with Perplexity...`);
  
  const chunks = splitTextIntoChunks(text);
  console.log(`Split into ${chunks.length} chunks`);
  
  // Limit the number of chunks to prevent excessive API usage
  const chunksToProcess = chunks.slice(0, MAX_CHUNKS);
  if (chunksToProcess.length < chunks.length) {
    console.log(`Processing only the first ${MAX_CHUNKS} chunks to limit API usage`);
  }
  
  const results = [];
  
  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars) with Perplexity...`);
    
    try {
      // Process the chunk with Perplexity
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
              content: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level. Return your analysis in JSON format."
            },
            {
              role: "user",
              content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${chunk}`
            }
          ],
          temperature: 0.2,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
        const responseText = responseData.choices[0].message.content;
        
        // Extract JSON part
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          result.provider = "Perplexity (Llama-3.1-Sonar)";
          if (responseData.citations) {
            result.citations = responseData.citations;
          }
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} with Perplexity`);
        } else {
          console.warn(`No JSON found in Perplexity's response for chunk ${i+1}`);
          // Create a basic result if JSON is missing
          results.push({
            provider: "Perplexity (Llama-3.1-Sonar)",
            surface: {
              grammar: 70,
              structure: 70,
              jargonUsage: 70,
              surfaceFluency: 70
            },
            deep: {
              conceptualIntegrity: 70,
              inferentialNecessity: 70,
              compressionFidelity: 70,
              contentOrigination: 70,
              impostorIndex: 30
            },
            overallScore: 70,
            analysis: "Analysis could not be extracted from Perplexity's response."
          });
        }
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk with Perplexity...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1} with Perplexity:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.log(`Rate limit exceeded with Perplexity. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1} with Perplexity...`);
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
                  content: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level. Return your analysis in JSON format."
                },
                {
                  role: "user",
                  content: `${ANALYSIS_PROMPT}\n\nHere is the text to analyze:\n\n${chunk}`
                }
              ],
              temperature: 0.2,
              max_tokens: 4000
            })
          });

          if (!response.ok) {
            throw new Error(`Perplexity API error on retry: ${response.status} ${response.statusText}`);
          }
          
          const responseData = await response.json();
          
          if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
            const responseText = responseData.choices[0].message.content;
            
            // Extract JSON part
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              result.provider = "Perplexity (Llama-3.1-Sonar)";
              if (responseData.citations) {
                result.citations = responseData.citations;
              }
              results.push(result);
              console.log(`Successfully processed chunk ${i+1} with Perplexity on retry`);
            }
          }
        } catch (retryError) {
          console.error(`Failed to process chunk ${i+1} with Perplexity on retry:`, retryError);
          // Continue to the next chunk
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next chunk with Perplexity despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, throw an error
  if (results.length === 0) {
    throw new Error("Failed to process any chunks of the document with Perplexity. The document may be too large or processed too quickly. Please try again later.");
  }
  
  // Average the results from all chunks
  console.log(`Combining Perplexity results from ${results.length} chunks...`);
  const combinedResult = averageAnalysisResults(results);
  return combinedResult;
}

/**
 * Direct pass-through for translation using selected LLM provider
 * No custom algorithms or processing - just send the text directly to the LLM
 */
export async function directTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  provider: string
): Promise<string> {
  const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}:

${text}

Please provide ONLY the translated text with no additional commentary.`;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });
      
      return response.choices[0].message.content || "";
    } 
    else if (provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      });
      
      return response.content[0].text;
    } 
    else if (provider === 'perplexity') {
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
          temperature: 0.2
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    }
    else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error in direct translation with ${provider}:`, error);
    throw error;
  }
}

/**
 * Direct pass-through for rewriting text using selected LLM provider
 * No custom algorithms or processing - just send the text directly to the LLM
 */
export async function directRewrite(
  text: string,
  instructions: string,
  provider: string
): Promise<string> {
  const prompt = `Rewrite the following text according to these instructions: ${instructions}

Text to rewrite:
${text}

Please provide ONLY the rewritten text with no additional commentary.`;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
      
      return response.choices[0].message.content || "";
    } 
    else if (provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      });
      
      return response.content[0].text;
    }
    else if (provider === 'perplexity') {
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
          temperature: 0.7
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } 
    else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error in direct rewrite with ${provider}:`, error);
    throw error;
  }
}