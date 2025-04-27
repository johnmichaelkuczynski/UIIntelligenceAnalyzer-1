import OpenAI from "openai";

// Initialize the OpenAI client with API key from environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types for semantic evaluation
export interface SurfaceAnalysis {
  grammar: number; // 0-100
  structure: number; // 0-100
  jargonUsage: number; // 0-100
  surfaceFluency: number; // 0-100
}

export interface DeepAnalysis {
  conceptualDepth: number; // 0-100
  inferentialContinuity: number; // 0-100
  claimNecessity: number; // 0-100
  semanticCompression: number; // 0-100
  logicalLaddering: number; // 0-100
  depthFluency: number; // 0-100
  originality: number; // 0-100
}

export interface IntelligenceEvaluation {
  surface: SurfaceAnalysis;
  deep: DeepAnalysis;
  overallScore: number;
  analysis: string;
}

/**
 * Evaluate writing sample for intelligence using GPT-4
 * Applies both surface and deep semantic analysis
 */
export async function evaluateIntelligence(text: string): Promise<IntelligenceEvaluation> {
  // First, generate a semantic analysis using GPT-4
  const semanticAnalysis = await generateSemanticAnalysis(text);
  
  // Then, get detailed evaluation of specific dimensions
  const detailedEvaluation = await evaluateDimensions(text);
  
  // Calculate overall score - weighting surface vs. deep features
  // 40% surface, 60% deep meaning
  const surfaceScore = (
    detailedEvaluation.surface.grammar +
    detailedEvaluation.surface.structure + 
    detailedEvaluation.surface.jargonUsage +
    detailedEvaluation.surface.surfaceFluency
  ) / 4;
  
  const deepScore = (
    detailedEvaluation.deep.conceptualDepth +
    detailedEvaluation.deep.inferentialContinuity +
    detailedEvaluation.deep.claimNecessity +
    detailedEvaluation.deep.semanticCompression +
    detailedEvaluation.deep.logicalLaddering +
    detailedEvaluation.deep.depthFluency +
    detailedEvaluation.deep.originality
  ) / 7;
  
  // Weighted final score
  const overallScore = Math.round(surfaceScore * 0.4 + deepScore * 0.6);
  
  return {
    surface: detailedEvaluation.surface,
    deep: detailedEvaluation.deep,
    overallScore,
    analysis: semanticAnalysis
  };
}

/**
 * Generate a short semantic analysis of the text using GPT-4
 * This is not shown to the user but used for internal scoring
 */
async function generateSemanticAnalysis(text: string): Promise<string> {
  try {
    const prompt = `Analyze the following text for its semantic qualities. Focus on meaning, complexity, coherence, and originality. 
    Provide a concise analysis (about 100 words) that evaluates the intelligence reflected in the writing:
    
    TEXT TO ANALYZE:
    ${text.substring(0, 8000)} ${text.length > 8000 ? '... [text truncated due to length]' : ''}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });
    
    return response.choices[0].message.content || "Analysis could not be generated";
  } catch (error) {
    console.error("Error generating semantic analysis:", error);
    return "Error generating analysis. Please try again.";
  }
}

/**
 * Evaluate specific dimensions of the text for intelligence assessment
 */
async function evaluateDimensions(text: string): Promise<{
  surface: SurfaceAnalysis, 
  deep: DeepAnalysis
}> {
  try {
    const truncatedText = text.substring(0, 8000) + (text.length > 8000 ? '... [text truncated due to length]' : '');
    
    const prompt = `Analyze this writing sample and score it on several dimensions of intelligence.
    For each dimension, provide a score from 0-100, where 0 is extremely poor and 100 is exceptional.
    Use the full range of scores (0-100) based on the quality, avoiding clustering all scores in a narrow range.
    Don't be afraid to give very low or very high scores when deserved.
    
    TEXT TO ANALYZE:
    ${truncatedText}
    
    Score the following dimensions:
    
    SURFACE FEATURES (40% of total weight):
    1. Grammar and Mechanics (correctness of grammar, spelling, punctuation)
    2. Structure and Organization (logical flow, paragraph organization)
    3. Jargon Usage (appropriate use of technical terms when needed)
    4. Surface Fluency (basic sentence formation, readability)
    
    DEEP FEATURES (60% of total weight):
    5. Conceptual Depth (sophistication of ideas, complexity of thought)
    6. Inferential Continuity (logical connections between ideas)
    7. Claim-to-Claim Necessity (each claim builds coherently on previous claims)
    8. Semantic Compression (density of meaning, efficiency of expression)
    9. Logical Laddering (progressive development of ideas)
    10. Depth Fluency (subtlety of argument structure)
    11. Originality (avoidance of clichés, fresh perspectives)
    
    Response must be in valid JSON format with this exact structure:
    {
      "surface": {
        "grammar": (score 0-100),
        "structure": (score 0-100),
        "jargonUsage": (score 0-100),
        "surfaceFluency": (score 0-100)
      },
      "deep": {
        "conceptualDepth": (score 0-100),
        "inferentialContinuity": (score 0-100),
        "claimNecessity": (score 0-100),
        "semanticCompression": (score 0-100),
        "logicalLaddering": (score 0-100),
        "depthFluency": (score 0-100),
        "originality": (score 0-100)
      }
    }`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.2, // Lower temperature for more consistent scoring
    });
    
    const content = response.choices[0].message.content || "{}";
    const results = JSON.parse(content);
    
    // Ensure all expected properties exist with fallback values
    const defaultSurface: SurfaceAnalysis = {
      grammar: 50,
      structure: 50,
      jargonUsage: 50,
      surfaceFluency: 50
    };
    
    const defaultDeep: DeepAnalysis = {
      conceptualDepth: 50,
      inferentialContinuity: 50,
      claimNecessity: 50,
      semanticCompression: 50,
      logicalLaddering: 50,
      depthFluency: 50,
      originality: 50
    };
    
    return {
      surface: { ...defaultSurface, ...results.surface },
      deep: { ...defaultDeep, ...results.deep }
    };
  } catch (error) {
    console.error("Error evaluating dimensions:", error);
    
    // Return default values if there's an error
    return {
      surface: {
        grammar: 50,
        structure: 50,
        jargonUsage: 50,
        surfaceFluency: 50
      },
      deep: {
        conceptualDepth: 50,
        inferentialContinuity: 50,
        claimNecessity: 50,
        semanticCompression: 50,
        logicalLaddering: 50,
        depthFluency: 50,
        originality: 50
      }
    };
  }
}