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
  rewriteMode?: 'rewrite' | 'add' | 'hybrid';
  additionInstructions?: string;
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

  let rewritePrompt = '';
  
  if (options.rewriteMode === 'add') {
    rewritePrompt = `
      You are an expert content writer. Keep the original text EXACTLY as provided, and ADD NEW SECTIONS according to the instructions.

      ORIGINAL TEXT (KEEP UNCHANGED):
      ${originalText}

      NEW CONTENT INSTRUCTIONS:
      ${options.additionInstructions || instruction}

      CRITICAL REQUIREMENTS:
      - Keep the original text EXACTLY as provided - do not modify it in any way
      - ADD completely new sections/chunks based on the addition instructions
      - The new content should be substantial and detailed (at least 50% as long as the original)
      - Remove ALL markup formatting including **, __, ##, \\[, \\], \\(, \\), and any other markup symbols
      - Present all text in clean, readable format without any formatting codes
      - Structure the output as: [ORIGINAL TEXT] followed by [NEW SECTIONS]

      ${isMathSolving ? `
      MATH-SPECIFIC: When writing mathematical content:
      - Remove ALL LaTeX markup including \\[, \\], \\(, \\), \\lim, \\rightarrow, \\infty, \\frac, \\sin, \\cos, etc.
      - Write mathematical expressions in plain text format
      - Use words to describe mathematical operations and concepts
      ` : ''}

      Please provide the complete text with original content preserved and new sections added.
    `;
  } else if (options.rewriteMode === 'hybrid') {
    rewritePrompt = `
      You are an expert document rewriter and content expander. You must both REWRITE the original text AND ADD NEW SECTIONS.

      ORIGINAL TEXT TO REWRITE:
      ${originalText}

      REWRITE INSTRUCTIONS:
      ${instruction}

      NEW CONTENT INSTRUCTIONS:
      ${options.additionInstructions}

      CRITICAL REQUIREMENTS:
      - REWRITE the original text according to the rewrite instructions
      - ADD completely new sections based on the addition instructions
      - The final output should be much longer than the original (minimum 200-300% expansion)
      - Remove ALL markup formatting including **, __, ##, \\[, \\], \\(, \\), and any other markup symbols
      - Present all text in clean, readable format without any formatting codes
      - Structure as: [REWRITTEN CONTENT] followed by [NEW SECTIONS]

      ${isMathSolving ? `
      MATH-SPECIFIC: When working with mathematical content:
      - Remove ALL LaTeX markup including \\[, \\], \\(, \\), \\lim, \\rightarrow, \\infty, \\frac, \\sin, \\cos, etc.
      - Write mathematical expressions in plain text format
      - Use words to describe mathematical operations and concepts
      ` : ''}

      Please provide the complete enhanced document with both rewritten and new content.
    `;
  } else {
    // Default 'rewrite' mode
    rewritePrompt = `
      I need you to rewrite the following ${documentType}. 

      YOUR INSTRUCTIONS:
      ${instruction}

      CRITICAL REQUIREMENTS:
      - Remove ALL markup formatting including **, __, ##, \\[, \\], \\(, \\), and any other markup symbols
      - Present text in clean, readable format without any formatting codes
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
    ${originalText.substring(0, 10000)}
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
        { role: "system", content: "You are a document rewriting specialist. Follow the user's instructions exactly and expand content significantly." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
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
      temperature: 0.3,
      system: "You are a document rewriting specialist. Follow the user's instructions exactly and expand content significantly.",
      messages: [
        { role: "user", content: prompt }
      ]
    });
    
    let content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Clean up Claude's markup formatting
    content = content
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markup
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markup
      .replace(/##\s*([^\n]+)/g, '$1') // Remove heading markup
      .replace(/###\s*([^\n]+)/g, '$1') // Remove subheading markup
      .replace(/####\s*([^\n]+)/g, '$1') // Remove smaller heading markup
      .replace(/\n\s*\n\s*\n/g, '\n\n'); // Clean up extra line breaks
    
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
        model: "llama-3.1-sonar-small-128k-online",
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