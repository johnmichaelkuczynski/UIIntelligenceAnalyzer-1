import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// Initialize API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ComparisonResult {
  provider: string;
  report: string;
  timestamp: Date;
}

/**
 * Compare two documents using AI analysis
 * @param documentA First document to compare
 * @param documentB Second document to compare 
 * @param provider AI provider to use (openai, anthropic, perplexity)
 * @returns Comparison analysis result
 */
export async function compareDocuments(documentA: any, documentB: any, provider: string): Promise<ComparisonResult> {
  const textA = documentA.content || '';
  const textB = documentB.content || '';
  
  const comparisonPrompt = `
    I need you to compare two documents and provide a detailed comparative analysis.
    
    Please analyze:
    1. Cognitive complexity differences
    2. Structural differences in reasoning
    3. Semantic depth comparison
    4. Logical rigor comparison
    5. Overall intelligence level comparison

    DOCUMENT A:
    ${textA.substring(0, 5000)}
    
    DOCUMENT B:
    ${textB.substring(0, 5000)}
    
    Provide a structured comparison focusing on differences in cognitive patterns, inferential structure, and logical control.
    
    Start with "Intelligence Comparison Report" and include a rough estimate of the relative cognitive capacities demonstrated in each document.
  `;
  
  let result: ComparisonResult;
  
  switch (provider.toLowerCase()) {
    case 'anthropic':
      result = await compareWithAnthropic(comparisonPrompt);
      break;
      
    case 'perplexity':
      result = await compareWithPerplexity(comparisonPrompt);
      break;
      
    case 'openai':
    default:
      result = await compareWithOpenAI(comparisonPrompt);
      break;
  }
  
  return result;
}

/**
 * Compare documents using OpenAI
 */
async function compareWithOpenAI(prompt: string): Promise<ComparisonResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a document comparison expert focusing on cognitive patterns." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });
    
    return {
      provider: "OpenAI (GPT-4o)",
      report: response.choices[0].message.content || "Unable to generate comparison report",
      timestamp: new Date()
    };
  } catch (error: any) {
    console.error("Error comparing with OpenAI:", error);
    return {
      provider: "OpenAI (Error)",
      report: `Error comparing documents: ${error.message}`,
      timestamp: new Date()
    };
  }
}

/**
 * Compare documents using Anthropic Claude
 */
async function compareWithAnthropic(prompt: string): Promise<ComparisonResult> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      temperature: 0.2,
      system: "You are a document comparison expert focusing on cognitive patterns and intelligence levels.",
      messages: [
        { role: "user", content: prompt }
      ]
    });
    
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    return {
      provider: "Anthropic (Claude)",
      report: content || "Unable to generate comparison report",
      timestamp: new Date()
    };
  } catch (error: any) {
    console.error("Error comparing with Anthropic:", error);
    return {
      provider: "Anthropic (Error)",
      report: `Error comparing documents: ${error.message}`,
      timestamp: new Date()
    };
  }
}

/**
 * Compare documents using Perplexity
 */
async function compareWithPerplexity(prompt: string): Promise<ComparisonResult> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY not found in environment variables");
    }
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { 
            role: "system", 
            content: "You are a document comparison expert focusing on cognitive patterns and intelligence levels." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 3000
      })
    });
    
    const data = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(data?.error?.message || "Perplexity API error");
    }
    
    return {
      provider: "Perplexity (Llama 3.1)",
      report: data.choices[0].message.content || "Unable to generate comparison report",
      timestamp: new Date()
    };
  } catch (error: any) {
    console.error("Error comparing with Perplexity:", error);
    return {
      provider: "Perplexity (Error)",
      report: `Error comparing documents: ${error.message}`,
      timestamp: new Date()
    };
  }
}

export default {
  compareDocuments
};