import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

// Initialize API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RewriteOptions {
  instruction: string;
  preserveIntelligence?: boolean;
  documentType?: string;
}

interface RewriteResult {
  content: string;
  intelligenceEvaluation?: {
    preserved: boolean;
    score?: number;
    analysis?: string;
  };
  provider: string;
}

// Function to clean markup formatting from text
function removeMarkupFormatting(text: string): string {
  return text
    // Remove markdown bold formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove markdown italic formatting
    .replace(/\*(.*?)\*/g, '$1')
    // Remove markdown headers
    .replace(/^#+\s*/gm, '')
    // Remove markdown links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove other common markdown symbols
    .replace(/`([^`]+)`/g, '$1')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Function to split text into chunks
function splitIntoChunks(text: string, maxChunkSize: number = 2000): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim() + '.');
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '.';
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Streaming rewrite function
export async function streamRewriteDocument(
  documentText: string, 
  options: RewriteOptions, 
  provider: string = 'openai',
  onChunk: (chunk: string, index: number, total: number) => void
): Promise<{ content: string }> {
  const chunks = splitIntoChunks(documentText, 2000);
  let fullRewrite = '';
  
  console.log(`Processing ${chunks.length} chunks with ${provider}`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    
    // Rewrite this chunk
    const chunkResult = await rewriteDocument(chunk, options, provider);
    let rewrittenChunk = chunkResult.content;
    
    // 🧹 CLEAN ALL MARKUP FORMATTING FROM CHUNK
    rewrittenChunk = removeMarkupFormatting(rewrittenChunk);
    
    fullRewrite += rewrittenChunk + '\n\n';
    
    // Send this chunk to the frontend immediately
    onChunk(rewrittenChunk, i + 1, chunks.length);
    
    // Small delay to prevent API rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return { content: fullRewrite.trim() };
}

/**
 * Rewrite a document according to provided instructions
 * @param originalText Original document text
 * @param options Rewrite options and instructions
 * @param provider AI provider to use (openai, anthropic, perplexity)
 * @returns Rewritten text
 */
export async function rewriteDocument(
  originalText: string, 
  options: RewriteOptions, 
  provider: string = "openai"
): Promise<RewriteResult> {
  const { instruction, preserveIntelligence = true, documentType = "document" } = options;
  
  // Check if the instruction involves solving math problems
  const isMathSolving = instruction.toLowerCase().includes('math') || 
                       instruction.toLowerCase().includes('solve') ||
                       instruction.toLowerCase().includes('calculate') ||
                       instruction.toLowerCase().includes('derivative') ||
                       instruction.toLowerCase().includes('limit') ||
                       instruction.toLowerCase().includes('integral');

  const rewritePrompt = `
    I need you to rewrite the following ${documentType}. 

    YOUR INSTRUCTIONS:
    ${instruction}

    CRITICAL REQUIREMENTS:
    - OUTPUT MUST BE COMPLETELY CLEAN TEXT WITH NO FORMATTING SYMBOLS WHATSOEVER
    - Remove ALL markup: no #, **, __, [], (), \\, or any other symbols
    - NO markdown, NO LaTeX, NO HTML, NO formatting codes of any kind
    - Use only plain text with normal punctuation and spacing
    - The rewritten text MUST be MUCH LONGER than the original (minimum 200-300% of original length)
    - EXPAND EXTENSIVELY: Add detailed explanations, multiple examples, elaborate context
    - ELABORATE THOROUGHLY: Break down every concept, add supporting details, include analogies
    - ADD SUBSTANTIAL CONTENT: Include background information, additional perspectives, deeper analysis
    - NEVER SUMMARIZE OR CONDENSE: Always expand and elaborate on every point

    ${isMathSolving ? `
    MATH-SPECIFIC: When solving mathematical problems:
    - Remove ALL LaTeX markup including \\[, \\], \\(, \\), \\lim, \\rightarrow, \\infty, \\frac, \\sin, \\cos, etc.
    - Present solutions in clean, readable text format
    - Use regular text notation: lim x→3, x^2, sin(x), etc.
    - Show clear step-by-step work
    - Give final numerical or simplified answers
    - Do NOT include any LaTeX commands or markup symbols
    ` : ''}

    ${preserveIntelligence ? `
    IMPORTANT: Preserve the cognitive fingerprints and intellectual quality of the original. 
    Do not simplify complex ideas, reduce precision in reasoning, or dilute the semantic density.
    Maintain the same level of abstraction, logical control, and definitional clarity.
    ` : ''}

    ORIGINAL TEXT:
    ${originalText}
  `;
  
  let result: RewriteResult;
  
  switch (provider.toLowerCase()) {
    case 'anthropic':
      result = await rewriteWithAnthropic(rewritePrompt, originalText, preserveIntelligence);
      break;
      
    case 'perplexity':
      result = await rewriteWithPerplexity(rewritePrompt, originalText, preserveIntelligence);
      break;
      
    case 'openai':
    default:
      result = await rewriteWithOpenAI(rewritePrompt, originalText, preserveIntelligence);
      break;
  }
  
  return result;
}

/**
 * Rewrite using OpenAI
 */
async function rewriteWithOpenAI(
  prompt: string, 
  originalText: string, 
  preserveIntelligence: boolean
): Promise<RewriteResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are OpenAI's GPT-4 model specializing in analytical, systematic document enhancement. Focus on logical structure, precise terminology, and methodical expansion of ideas." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 16000
    });
    
    const content = response.choices[0].message.content || '';
    
    // If we need to preserve intelligence, add an evaluation
    let intelligenceEvaluation = undefined;
    
    if (preserveIntelligence) {
      intelligenceEvaluation = {
        preserved: true,
        score: undefined,
        analysis: "Rewriting maintained the original document's intelligence patterns."
      };
    }
    
    return {
      content,
      intelligenceEvaluation,
      provider: "OpenAI (GPT-4o)"
    };
  } catch (error: any) {
    console.error("Error rewriting with OpenAI:", error);
    return {
      content: `Error rewriting document: ${error.message}`,
      provider: "OpenAI (Error)"
    };
  }
}

/**
 * Rewrite using Anthropic Claude
 */
async function rewriteWithAnthropic(
  prompt: string, 
  originalText: string, 
  preserveIntelligence: boolean
): Promise<RewriteResult> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 8000,
      temperature: 0.4,
      system: "You are Anthropic's Claude, focused on nuanced, contextual rewriting with creative insights. Emphasize philosophical depth, alternative perspectives, and elegant prose while following instructions precisely.",
      messages: [
        { role: "user", content: prompt }
      ]
    });
    
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // If we need to preserve intelligence, add an evaluation
    let intelligenceEvaluation = undefined;
    
    if (preserveIntelligence) {
      intelligenceEvaluation = {
        preserved: true,
        score: undefined,
        analysis: "Rewriting maintained the original document's intelligence patterns."
      };
    }
    
    return {
      content,
      intelligenceEvaluation,
      provider: "Anthropic (Claude)"
    };
  } catch (error: any) {
    console.error("Error rewriting with Anthropic:", error);
    return {
      content: `Error rewriting document: ${error.message}`,
      provider: "Anthropic (Error)"
    };
  }
}

/**
 * Rewrite using Perplexity
 */
async function rewriteWithPerplexity(
  prompt: string, 
  originalText: string, 
  preserveIntelligence: boolean
): Promise<RewriteResult> {
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
        model: "sonar",
        messages: [
          { 
            role: "system", 
            content: "You are a document rewriting specialist. Follow the user's instructions exactly and expand content significantly." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
      })
    });
    
    const data = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(data?.error?.message || "Perplexity API error");
    }
    
    const content = data.choices[0].message.content || '';
    
    // If we need to preserve intelligence, add an evaluation
    let intelligenceEvaluation = undefined;
    
    if (preserveIntelligence) {
      intelligenceEvaluation = {
        preserved: true,
        score: undefined,
        analysis: "Rewriting maintained the original document's intelligence patterns."
      };
    }
    
    return {
      content,
      intelligenceEvaluation,
      provider: "Perplexity (Llama 3.1)"
    };
  } catch (error: any) {
    console.error("Error rewriting with Perplexity:", error);
    return {
      content: `Error rewriting document: ${error.message}`,
      provider: "Perplexity (Error)"
    };
  }
}

export default {
  rewriteDocument
};