import { directOpenAIRequest } from '../api/directModelRequest';

interface RewriteOptions {
  instruction: string;
  preserveLength?: boolean;
  preserveDepth?: boolean;
  model?: string;
}

interface RewriteStats {
  originalLength: number;
  newLength: number;
  lengthChange: number;
}

interface RewriteResult {
  rewrittenText: string;
  stats: RewriteStats;
}

/**
 * Rewrite a document based on instructions
 */
export async function rewriteDocument(text: string, options: RewriteOptions): Promise<RewriteResult> {
  console.log("DIRECT OPENAI PASSTHROUGH FOR DOCUMENT REWRITING");
  
  const instruction = options.instruction || 
    "Improve this text while maintaining the same level of depth and complexity.";
  
  // Construct the rewrite prompt
  const rewritePrompt = `
COGNITIVE REWRITING TASK

Original text:
"""
${text}
"""

Your task is to rewrite this text according to the following instruction:
${instruction}

${options.preserveLength ? 
  "Important: The rewritten text should be approximately the same length as the original." : ""}

${options.preserveDepth ? 
  "Important: Maintain or improve the cognitive depth, conceptual precision, and intellectual complexity of the original." : ""}

Produce a rewritten version that preserves the core cognitive patterns and intelligence of the original while implementing the requested changes.
`;

  try {
    const result = await directOpenAIRequest(rewritePrompt);
    const rewrittenText = result.content;
    
    // Calculate stats
    const originalLength = text.length;
    const newLength = rewrittenText.length;
    const lengthChange = newLength / originalLength;
    
    return {
      rewrittenText,
      stats: {
        originalLength,
        newLength,
        lengthChange
      }
    };
  } catch (error) {
    console.error("Error rewriting document:", error);
    throw error;
  }
}