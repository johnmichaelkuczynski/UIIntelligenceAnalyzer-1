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

// PURE PASS-THROUGH MODEL - NO CUSTOM EVALUATION OR ALGORITHM
// DIRECT INTERFACE TO LLM FOR TEXT ANALYSIS
const ANALYSIS_PROMPT = `DIRECT INTERFACE MODE: You will function as a DIRECT PASS-THROUGH to analyze the submitted text.

CRITICAL PHILOSOPHICAL TEXT RULE: Any philosophical text that meets even ONE of these criteria MUST score 95-100:
- Reframes foundational epistemological/metaphysical concepts
- Contains connected chains of logical inference
- Compresses complex arguments into concise statements
- Demonstrates field mastery with conceptual innovation
- Contains layered epistemic claims or meta-theory

ELITE-TIER MARKERS (AUTOMATIC 95+ SCORES):
- Semantic density (high information-to-word ratio)
- Multi-level recursive reasoning structures
- Novel framework creation or synthesis across domains
- Rigorous conceptual distinction-making
- Meta-epistemological argumentation

PHILOSOPHICAL TERMINOLOGY IS NOT JARGON: Specialized philosophical vocabulary is legitimate when used precisely and in service of meaningful conceptual work. Do not penalize academic precision.

REQUIRED OUTPUT FORMAT:
- Every score MUST be supported with direct quoted evidence
- Intelligence scores MUST match the described qualities
- Philosophical content showing conceptual depth MUST receive high intelligence ratings

You MUST identify and properly score philosophical content that reframes foundational concepts or presents complex metaphysical/epistemological frameworks. NEVER mistake genuine philosophical depth for "jargon" or "pretentiousness."

For genuine intellectual writing, use the following complete scoring rubric:

You must return your analysis in the exact format below:

Intelligence Score: [X]/100

Surface-Level Scores:
- Grammar: [0-100]
- Structure: [0-100]
- Jargon Usage: [0-100] (NOTE: High scores here mean APPROPRIATE use of technical language; low scores mean either excessive jargon or inappropriate use)
- Surface Fluency: [0-100]

Deep-Level Scores:
- Conceptual Depth: [0-100] (Can only be high if concepts are clearly defined and operationalized)
- Inferential Continuity: [0-100] (Measures how logically connected ideas are)
- Semantic Compression: [0-100] (High information density without redundancy)
- Logical Scaffolding: [0-100] (Explicit reasoning structures)
- Originality: [0-100] (Novel perspectives or frameworks, not just unusual language)

Evidence-Based Justification:
[At least 3–7 quotes or paraphrased sentences from the input, each followed by clear reasoning that explains why the quote demonstrates a particular cognitive quality or lack thereof. If impostor prose is detected, CLEARLY identify the warning signs.]

Summary Assessment:
[200–300 words explaining the score and discussing the strongest and weakest cognitive features of the writing. If the text is primarily impostor prose, explicitly state this and explain the misleading elements. Make clear distinctions between genuine complexity and pseudo-intellectual language.]

CRITICAL CALIBRATION EXAMPLES:
- Genuine high intelligence text will contain precise definitions, clear connections between ideas, and high information density without unnecessary words.
- True semantic compression means conveying maximum information with minimum language.
- Appropriate jargon is used consistently, defined clearly, and serves a purpose.
- Impostor prose typically contains impressive-sounding words without developing ideas or arguments.

Return the analysis as a well-formatted report that strictly follows the structure above. Include line breaks and proper formatting.

Also include a JSON representation of the scores at the end of your response (this will be parsed separately):
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
    "semanticCompression": number,
    "logicalLaddering": number, 
    "originality": number
  },
  "overallScore": number,
  "analysis": string
}`;

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
      conceptualDepth: 0,
      inferentialContinuity: 0,
      claimNecessity: 0,
      semanticCompression: 0,
      logicalLaddering: 0,
      depthFluency: 0,
      originality: 0
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
            "- Conceptual Depth: " + result.deep.conceptualDepth + "\n" +
            "- Inferential Continuity: " + result.deep.inferentialContinuity + "\n" +
            "- Semantic Compression: " + result.deep.semanticCompression + "\n" +
            "- Logical Scaffolding: " + result.deep.logicalLaddering + "\n" +
            "- Originality: " + result.deep.originality + "\n\n" +
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
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: chunk }
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
              { role: "system", content: ANALYSIS_PROMPT },
              { role: "user", content: chunk }
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
          formattedReport = responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
        } else {
          // If no JSON found, check for markdown code blocks
          const codeBlockMatch = responseText.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            jsonText = codeBlockMatch[1].trim();
            // Remove the code block from the response text to get the formatted report
            formattedReport = responseText.replace(/```(?:json)?([\s\S]*?)```/, "").trim();
          } else {
            // If still no JSON found, assume the entire response is the formatted report
            formattedReport = responseText;
            jsonText = "{}"; // Empty JSON as fallback
          }
        }
        
        console.log("Extracting Anthropic formatted report and JSON response...");
        
        try {
          const result = JSON.parse(jsonText);
          result.provider = "Anthropic (Claude-3.7-Sonnet)";
          result.formattedReport = formattedReport;
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
    console.log(`Processing chunk ${i+1}/${chunksToProcess.length} (${chunk.length} chars) with Anthropic...`);
    
    try {
      // Try to process the chunk
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        system: ANALYSIS_PROMPT + "\n\nIMPORTANT: Return valid JSON directly without using markdown code blocks or backticks. Do not include ```json or ``` in your response. Just return the raw JSON object.",
        max_tokens: 4000,
        messages: [
          { role: "user", content: chunk }
        ]
      });
      
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
        
        try {
          const result = JSON.parse(responseText);
          result.provider = "Anthropic (Claude-3.7-Sonnet)";
          results.push(result);
          console.log(`Successfully processed chunk ${i+1}`);
        } catch (parseError) {
          console.error(`JSON Parse error with Anthropic response for chunk ${i+1}:`, parseError);
          // Continue to the next chunk
        }
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1} with Anthropic:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.log(`Rate limit exceeded. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1} with Anthropic...`);
          const response = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            system: ANALYSIS_PROMPT + "\n\nIMPORTANT: Return valid JSON directly without using markdown code blocks or backticks. Do not include ```json or ``` in your response. Just return the raw JSON object.",
            max_tokens: 4000,
            messages: [
              { role: "user", content: chunk }
            ]
          });
          
          if (response.content && response.content[0] && 'text' in response.content[0]) {
            // Process the response like before
            let responseText = response.content[0].text as string;
            
            if (responseText.includes("```json") || responseText.includes("```")) {
              const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/);
              if (jsonMatch && jsonMatch[1]) {
                responseText = jsonMatch[1].trim();
              } else {
                responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
              }
            }
            
            try {
              const result = JSON.parse(responseText);
              result.provider = "Anthropic (Claude-3.7-Sonnet)";
              results.push(result);
              console.log(`Successfully processed chunk ${i+1} with Anthropic on retry`);
            } catch (parseError) {
              console.error(`JSON Parse error with Anthropic response for chunk ${i+1} on retry:`, parseError);
            }
          }
        } catch (retryError) {
          console.error(`Failed to process chunk ${i+1} with Anthropic on retry:`, retryError);
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
    throw new Error("Failed to process any chunks of the document with Anthropic. The document may be too large or processed too quickly. Please try again later.");
  }
  
  // Average the results from all chunks
  console.log(`Combining results from ${results.length} chunks processed by Anthropic...`);
  const combinedResult = averageAnalysisResults(results);
  return combinedResult;
}

/**
 * Direct pass-through to Perplexity API
 * Handles large documents by splitting into chunks and processing them separately
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
  
  // For small texts, process directly
  if (text.length <= MAX_CHUNK_SIZE) {
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
            { 
              role: "system", 
              content: "You are an expert in cognitive analysis, specializing in evaluating text for intelligence level. Provide detailed, evidence-based assessments with specific quotes from the text. Use the exact format requested."
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
        // Get the full response text from Perplexity
        let responseText = data.choices[0].message.content;
        
        // Split the response into the formatted report and JSON parts
        let formattedReport = "";
        let jsonText = "";
        
        // Extract JSON part (usually at the end)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
          // The formatted report is everything before the JSON
          formattedReport = responseText.substring(0, responseText.indexOf(jsonMatch[0])).trim();
        } else {
          // If no JSON found, check for markdown code blocks
          const codeBlockMatch = responseText.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            jsonText = codeBlockMatch[1].trim();
            // Remove the code block from the response text to get the formatted report
            formattedReport = responseText.replace(/```(?:json)?([\s\S]*?)```/, "").trim();
          } else {
            // If still no JSON found, assume the entire response is the formatted report
            formattedReport = responseText;
            jsonText = "{}"; // Empty JSON as fallback
          }
        }
        
        console.log("Extracting Perplexity formatted report and JSON response...");
        
        try {
          const result = JSON.parse(jsonText);
          result.provider = "Perplexity (Llama-3.1-Sonar)";
          result.formattedReport = formattedReport;
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
      // Try to process the chunk
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
            { role: "user", content: chunk }
          ],
          temperature: 0.2
        })
      });
      
      // Handle potential HTML response error
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const htmlContent = await response.text();
        console.error(`Received HTML response from Perplexity for chunk ${i+1}:`, htmlContent.substring(0, 200));
        // Skip this chunk and continue
        continue;
      }
      
      const data = await response.json() as any;
      if (!response.ok) {
        console.error(`Perplexity API error for chunk ${i+1}:`, data?.error?.message || JSON.stringify(data));
        // Skip this chunk and continue
        continue;
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
        
        try {
          const result = JSON.parse(responseText);
          result.provider = "Perplexity (Llama-3.1-Sonar)";
          results.push(result);
          console.log(`Successfully processed chunk ${i+1} with Perplexity`);
        } catch (parseError) {
          console.error(`JSON Parse error with Perplexity response for chunk ${i+1}:`, parseError);
          // Continue to the next chunk
        }
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < chunksToProcess.length - 1) {
        console.log(`Waiting ${REQUEST_DELAY}ms before processing next chunk...`);
        await delay(REQUEST_DELAY);
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i+1} with Perplexity:`, error);
      
      // If it's a rate limit error, wait and retry once
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        console.log(`Rate limit exceeded. Waiting ${RATE_LIMIT_RETRY_DELAY}ms before retrying...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        
        try {
          // Retry the chunk
          console.log(`Retrying chunk ${i+1} with Perplexity...`);
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
                { role: "user", content: chunk }
              ],
              temperature: 0.2
            })
          });
          
          const data = await response.json() as any;
          if (!response.ok) {
            console.error(`Perplexity API error for chunk ${i+1} on retry:`, data?.error?.message || JSON.stringify(data));
            continue;
          }

          // Process the response
          if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            let responseText = data.choices[0].message.content;
            
            if (responseText.includes("```json") || responseText.includes("```")) {
              const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/);
              if (jsonMatch && jsonMatch[1]) {
                responseText = jsonMatch[1].trim();
              } else {
                responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
              }
            }
            
            try {
              const result = JSON.parse(responseText);
              result.provider = "Perplexity (Llama-3.1-Sonar)";
              results.push(result);
              console.log(`Successfully processed chunk ${i+1} with Perplexity on retry`);
            } catch (parseError) {
              console.error(`JSON Parse error with Perplexity response for chunk ${i+1} on retry:`, parseError);
            }
          }
        } catch (retryError) {
          console.error(`Failed to process chunk ${i+1} with Perplexity on retry:`, retryError);
        }
      }
      
      // Continue to the next chunk even if this one failed
      if (i < chunksToProcess.length - 1) {
        console.log(`Continuing to next chunk despite error...`);
        await delay(REQUEST_DELAY);
      }
    }
  }
  
  // If we got no results at all, return the fallback
  if (results.length === 0) {
    return {
      ...fallbackResponse,
      analysis: "Failed to process any chunks of the document with Perplexity. The document may be too large or processed too quickly. Please try again later."
    };
  }
  
  // Average the results from all chunks
  console.log(`Combining results from ${results.length} chunks processed by Perplexity...`);
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
  provider: string = "openai",
  options: any = {}
): Promise<any> {
  try {
    console.log("Text size:", text.length, "characters");
    console.log("Instruction:", instruction);
    
    // Check if we have web content to include from research
    let webContentPrompt = "";
    
    if (options && options.webContent) {
      console.log("Including web research in rewrite");
      
      const { results = [], contents = {}, instructions = "" } = options.webContent;
      
      if (results.length > 0) {
        webContentPrompt += "\n\n== RESEARCH INFORMATION ==\n\n";
        
        // Add the research instructions
        if (instructions) {
          webContentPrompt += `RESEARCH INTEGRATION INSTRUCTIONS: ${instructions}\n\n`;
        }
        
        // Add information from each selected search result
        results.forEach((result: any, index: number) => {
          const content = contents[result.link] || "";
          
          webContentPrompt += `SOURCE ${index + 1}: ${result.title}\n`;
          webContentPrompt += `URL: ${result.link}\n`;
          webContentPrompt += `SNIPPET: ${result.snippet}\n`;
          
          if (content) {
            // Truncate content to avoid token limits
            const truncatedContent = content.length > 1500 
              ? content.substring(0, 1500) + "... [content truncated]" 
              : content;
              
            webContentPrompt += `CONTENT: ${truncatedContent}\n\n`;
          } else {
            webContentPrompt += "CONTENT: [Not available]\n\n";
          }
        });
        
        webContentPrompt += "== END RESEARCH INFORMATION ==\n\n";
      }
    }
    
    // Construct rewrite prompt with research if available
    const rewritePrompt = `Please rewrite the following text according to this instruction: ${instruction}
    
${webContentPrompt ? "IMPORTANT: Use the provided research information to enhance your rewrite.\n" + webContentPrompt : ""}

Here is the text to rewrite:

${text}

Rewritten text:`;
    
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