import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// Initialize the API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Constants for text processing
const MAX_CHUNK_SIZE = 3000; // Characters per chunk (approx. 500 words)
const MAX_CHUNKS = 20; // Maximum number of chunks to process
const REQUEST_DELAY = 2000; // Delay between API requests in milliseconds
const RATE_LIMIT_RETRY_DELAY = 10000; // Delay before retrying after a rate limit error

// EXACTLY AS INSTRUCTED WITH UPDATED PROMPT
const ANALYSIS_PROMPT = `You are evaluating the intelligence of the author of the following text.

Read the passage carefully, then answer these 10 questions:

Did you learn anything new from this text?

If the claims are true, would you have learned anything new?

How well does each statement follow from the next?

How reliant is the text on undefined or ornamental jargon?

Is the author evasive or forthright in engaging difficult issues?

If the claims are correct, what are the consequences for the field or the world?

Is this original or recycled?

What kind of mind does this writing reveal (e.g., analytical, synthetic, imitative)?

Does the author reflect on the implications or limits of their claims?

Is the writing compressed (dense with meaning) or diffuse (wordy and vague)?

Then give an overall intelligence score from 1 to 100, using this scale:

50 = average writing by a college student

60 = slightly above average

70 = solidly intelligent, with some insight

80 = original and synthetic thinking, possibly publishable

90 = deeply intelligent, integrative, and conceptually creative

100 = profoundly brilliant, philosophical, or visionary

If the text includes a genuinely original insight—especially one that links psychological and behavioral levels of explanation—then the score should reflect that.

Explain how you arrived at your score.`;

/**
 * Split text into chunks for large document processing
 * Attempts to split at paragraph or sentence boundaries
 */
function splitTextIntoChunks(textInput: string, maxChunkSize = MAX_CHUNK_SIZE): string[] {
  const text = textInput || "";
  if (text.length <= maxChunkSize) {
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
  
  // Create a simple combined result with just the formatted reports
  const combined: any = {
    provider: results[0].provider,
    formattedReport: ""
  };
  
  // Combine the raw reports from each chunk
  const formattedReports = results.map((result, index) => {
    return `SECTION ${index + 1}:\n\n${result.formattedReport || "No analysis available for this section."}`;
  });
  
  combined.formattedReport = [
    "This document was analyzed in multiple sections due to its length. Below are the analyses for each section:",
    ...formattedReports
  ].join("\n\n");
  
  return combined;
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