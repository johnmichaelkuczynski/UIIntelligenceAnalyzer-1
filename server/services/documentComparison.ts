import { directOpenAIRequest } from '../api/directModelRequest';

/**
 * Compare two documents using the Intelligence Profiling approach
 * This is a direct pass-through to OpenAI with no custom processing
 */
export async function compareDocuments(documentA: string, documentB: string): Promise<any> {
  console.log("DIRECT OPENAI PASSTHROUGH FOR DOCUMENT COMPARISON - COGNITIVE PROFILING");
  
  // Create comparison prompt focusing on cognitive profiling, not grading
  const comparisonPrompt = `
COMPARATIVE INTELLIGENCE PROFILING

Analyze the cognitive fingerprints of the authors behind these two texts.

TEXT A:
"""
${documentA}
"""

TEXT B:
"""
${documentB}
"""

For each text, evaluate the structure and quality of thought that produced it.
This is not a writing evaluation or content grading exercise. You are profiling the cognitive force behind each text.

For each text:
1. Estimate the author's intelligence on a scale from 1 to 100.
2. Analyze what kind of mind the text reveals (analytical, synthetic, imitative, derivative, creative, visionary).
3. Note whether it introduces new ideas, patterns, or conceptual structures.
4. Evaluate cognitive density, depth, and originality.

Then compare the cognitive profiles:
- Which text reveals a higher level of intelligence?
- How do their cognitive strengths differ?
- What might each author learn from the other's cognitive approach?

Remember: This is not a writing comparison. It is a comparative intelligence profile.
`;

  try {
    const result = await directOpenAIRequest(comparisonPrompt);
    return {
      comparisonResult: result.content,
      provider: result.provider
    };
  } catch (error) {
    console.error("Error in cognitive profile comparison:", error);
    throw error;
  }
}