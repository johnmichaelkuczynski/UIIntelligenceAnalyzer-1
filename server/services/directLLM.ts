import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// Initialize the API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Constants for text processing
const MAX_CHUNK_SIZE = 12000; // Characters per chunk - increased to handle full documents
const MAX_CHUNKS = 3; // Maximum number of chunks to process
const REQUEST_DELAY = 2000; // Delay between API requests in milliseconds
const RATE_LIMIT_RETRY_DELAY = 10000; // Delay before retrying after a rate limit error

// PURE PASS-THROUGH MODEL - USING EXACT INSTRUCTIONS WITHOUT MODIFICATION
const ANALYSIS_PROMPT = `You are a highly intelligent, philosophically rigorous reader. You have just read the following passage. Your task is to assess what the text reveals about the intelligence of its author. Do not grade the quality of the text. Instead, assess the probable intelligence of the person who wrote it, based solely on this passage.

Here is what to consider:

Epistemic Novelty:
Did you learn anything new from this text?
If all its claims were true, would you have learned something new from it?

Inferential Integrity:
How well does one statement follow from the next?
Are the claims logically and inferentially tight, or loose and impressionistic?

Linguistic Transparency vs. Jargon Dependence:
How reliant is the text on undefined or ornamental jargon?
Are terms used with precision and continuity?

Cognitive Forthrightness:
Does the author confront the difficult or controversial parts of their claims?
Or is the prose evasive, hedged, or padded?

Theoretical Consequences:
Assuming what is said is true, what would follow?
Would there be any consequences for philosophy, science, policy, or practical thought?

Originality vs. Recycling:
Does this seem like an original mind at work, or is it a paint-by-numbers regurgitation of standard material?

Cognitive Load & Conceptual Control:
Is the author dealing with complex, interlocking ideas?
If so, do they seem to have a firm grasp over those ideas, or is the complexity merely stylistic?

Model of Mind Implied by the Text:
Based on this sample, what kind of mind does this text reveal—e.g., analytical, synthetic, imitative, mechanical, confused?

Meta-Cognitive Clues:
Does the author show awareness of the limits or implications of their own claims?
Is there evidence of dialectical self-checking?

Compression vs. Diffusion:
Does the author say more with less, or less with more?

IMPORTANT: After your analysis, please provide a single numerical score between 0 and 100 that represents your assessment of the author's intellectual capabilities, with 0 being completely lacking and 100 being exceptionally intelligent. Format this as "Intelligence Score: [score]/100" at the top of your response.`;

/**
 * Split text into chunks for large document processing
 * Attempts to split at paragraph or sentence boundaries
 */
function splitTextIntoChunks(textInput: string, maxChunkSize = MAX_CHUNK_SIZE): string[] {
  const text = textInput || "";
  // Never split short documents at all - fix the document splitting issue
  if (text.length <= 25000) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    // Determine the potential end of the current chunk
    let endPos = Math.min(currentPos + maxChunkSize, text.length);
    
    // Try to find a paragraph break
    if (endPos < text.length) {
      const newlineBreak = text.lastIndexOf('\n\n', endPos);
      if (newlineBreak > currentPos && newlineBreak > endPos - 300) {
        endPos = newlineBreak + 2; // Include the double newline
      } else {
        // Try to find a single newline
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
 * Combine multiple analysis results into a single result
 * Used when a document is split into chunks
 */
function combineAnalysisResults(results: any[]): any {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];
  
  // For the improved implementation, just take the first result instead of creating artificial sections
  // This prevents the confusion with multiple sections for small documents
  return results[0];
}

/**
 * Direct pass-through to OpenAI's GPT-4o model without custom processing
 */
export async function directOpenAIAnalyze(textInput: string): Promise<any> {
  // Ensure we have text to analyze
  const text = textInput || "";
  
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    console.log("DIRECT OPENAI PASSTHROUGH FOR ANALYSIS");
    console.log("Sending direct request to OpenAI...");
    
    try {
      // Make a single request to OpenAI with pure text output
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: text }
        ],
        temperature: 0.2
      });
      
      // Return the raw text response
      return {
        provider: "OpenAI (GPT-4o)",
        formattedReport: response.choices[0].message.content || "No analysis available."
      };
    } catch (error: any) {
      // Handle OpenAI API errors
      console.error(`Error in direct passthrough to OpenAI:`, error);
      
      return {
        provider: "OpenAI (GPT-4o) - Error",
        formattedReport: `Error: ${error.message || "Unknown error occurred"}`
      };
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
      // Process each chunk
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: chunk }
        ],
        temperature: 0.2
      });
      
      // Store the raw text result
      const result = { 
        formattedReport: response.choices[0].message.content || "",
        provider: "OpenAI (GPT-4o)"
      };
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
              { role: "system", content: ANALYSIS_PROMPT },
              { role: "user", content: chunk }
            ],
            temperature: 0.2
          });
          
          const result = {
            formattedReport: response.choices[0].message.content || "",
            provider: "OpenAI (GPT-4o)"
          };
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} on retry`);
        } catch (retryError) {
          console.error(`Error retrying chunk ${i+1}:`, retryError);
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
  
  // Combine the results from all chunks
  console.log(`Combining results from ${results.length} chunks...`);
  const combinedResult = combineAnalysisResults(results);
  return combinedResult;
}

/**
 * Direct pass-through to Anthropic's Claude model
 */
export async function directAnthropicAnalyze(textInput: string): Promise<any> {
  // Ensure we have text to analyze
  const text = textInput || "";
  
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    try {
      // Direct pass-through to Anthropic Claude with the intelligence analysis prompt
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        system: ANALYSIS_PROMPT,
        max_tokens: 4000,
        messages: [
          { role: "user", content: `Here is the text to analyze:\n\n${text}` }
        ]
      });
      
      // Parse the response content and return the raw text
      if (response.content && response.content[0] && 'text' in response.content[0]) {
        return {
          provider: "Anthropic (Claude 3 Sonnet)",
          formattedReport: response.content[0].text
        };
      } else {
        return {
          provider: "Anthropic (Claude 3 Sonnet) - Error",
          formattedReport: "Error: Unable to extract text from Anthropic response."
        };
      }
    } catch (error: any) {
      console.error(`Error in direct passthrough to Anthropic:`, error);
      
      return {
        provider: "Anthropic (Claude 3 Sonnet) - Error",
        formattedReport: `Error: ${error.message || "Unknown error occurred"}`
      };
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
      // Process each chunk
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        system: ANALYSIS_PROMPT,
        max_tokens: 4000,
        messages: [
          { role: "user", content: `Here is the text to analyze:\n\n${chunk}` }
        ]
      });
      
      // Extract the text from the response
      if (response.content && response.content[0] && 'text' in response.content[0]) {
        const result = { 
          formattedReport: response.content[0].text,
          provider: "Anthropic (Claude 3 Sonnet)"
        };
        results.push(result);
        console.log(`Successfully processed chunk ${i+1}`);
      } else {
        console.error(`Error: Unable to extract text from Anthropic response for chunk ${i+1}`);
      }
      
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
          const response = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
            system: ANALYSIS_PROMPT,
            max_tokens: 4000,
            messages: [
              { role: "user", content: `Here is the text to analyze:\n\n${chunk}` }
            ]
          });
          
          // Extract the text from the response
          if (response.content && response.content[0] && 'text' in response.content[0]) {
            const result = { 
              formattedReport: response.content[0].text,
              provider: "Anthropic (Claude 3 Sonnet)"
            };
            results.push(result);
            console.log(`Successfully processed chunk ${i+1} on retry`);
          }
        } catch (retryError) {
          console.error(`Error retrying chunk ${i+1}:`, retryError);
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
  
  // Combine the results from all chunks
  console.log(`Combining results from ${results.length} chunks processed by Anthropic...`);
  const combinedResult = combineAnalysisResults(results);
  return combinedResult;
}

/**
 * Direct pass-through to Perplexity AI
 */
export async function directPerplexityAnalyze(textInput: string): Promise<any> {
  // Fallback response in case all chunks fail
  const fallbackResponse = {
    provider: "Perplexity (LLaMA 3.1) - Error",
    formattedReport: "Failed to analyze document with Perplexity. Please try again or use a different AI provider."
  };
  
  // Ensure we have text to analyze
  const text = textInput || "";
  
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
    try {
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
              content: ANALYSIS_PROMPT
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        provider: "Perplexity (LLaMA 3.1)",
        formattedReport: data.choices[0].message.content
      };
    } catch (error: any) {
      console.error(`Error in direct passthrough to Perplexity:`, error);
      
      return {
        provider: "Perplexity (LLaMA 3.1) - Error",
        formattedReport: `Error: ${error.message || "Unknown error occurred"}`
      };
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
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars) with Perplexity...`);
    
    try {
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
              content: ANALYSIS_PROMPT
            },
            {
              role: "user",
              content: chunk
            }
          ],
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const result = { 
        formattedReport: data.choices[0].message.content,
        provider: "Perplexity (LLaMA 3.1)"
      };
      results.push(result);
      console.log(`Successfully processed chunk ${i+1} with Perplexity`);
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk with Perplexity...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1} with Perplexity:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log(`Perplexity rate limit exceeded. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
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
                  content: ANALYSIS_PROMPT
                },
                {
                  role: "user",
                  content: chunk
                }
              ],
              temperature: 0.2
            })
          });
          
          if (!response.ok) {
            throw new Error(`Perplexity API error on retry: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          
          const result = { 
            formattedReport: data.choices[0].message.content,
            provider: "Perplexity (LLaMA 3.1)"
          };
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} with Perplexity on retry`);
        } catch (retryError) {
          console.error(`Error retrying chunk ${i+1} with Perplexity:`, retryError);
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next Perplexity chunk despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, return the fallback
  if (results.length === 0) {
    return fallbackResponse;
  }
  
  // Combine the results from all chunks
  console.log(`Combining results from ${results.length} chunks processed by Perplexity...`);
  const combinedResult = combineAnalysisResults(results);
  return combinedResult;
}