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
  surfaceScore: number;
  deepScore: number;
  calibrationAdjusted?: boolean;
}

// Scoring configuration (can be adjusted based on calibration)
const scoringConfig = {
  surfaceWeight: 0.35, // 35% weight for surface features (lowered from 40%)
  deepWeight: 0.65,    // 65% weight for deep features (increased from 60%)
  scoreAdjustment: -5,  // Baseline adjustment to avoid clustering in 70-80 range
  maxScore: 100,       // Maximum possible score
  minScore: 0          // Minimum possible score
};

/**
 * Evaluate writing sample for intelligence using GPT-4
 * Applies both surface and deep semantic analysis with calibrated weights
 */
export async function evaluateIntelligence(
  text: string, 
  customConfig?: Partial<typeof scoringConfig>
): Promise<IntelligenceEvaluation> {
  // First, generate a semantic analysis using GPT-4
  const semanticAnalysis = await generateSemanticAnalysis(text);
  
  // Then, get detailed evaluation of specific dimensions
  const detailedEvaluation = await evaluateDimensions(text);
  
  // Calculate surface score (grammar, structure, etc.)
  const surfaceScore = (
    detailedEvaluation.surface.grammar +
    detailedEvaluation.surface.structure + 
    detailedEvaluation.surface.jargonUsage +
    detailedEvaluation.surface.surfaceFluency
  ) / 4;
  
  // Calculate deep score (conceptual depth, inferential continuity, etc.)
  const deepScore = (
    detailedEvaluation.deep.conceptualDepth +
    detailedEvaluation.deep.inferentialContinuity +
    detailedEvaluation.deep.claimNecessity +
    detailedEvaluation.deep.semanticCompression +
    detailedEvaluation.deep.logicalLaddering +
    detailedEvaluation.deep.depthFluency +
    detailedEvaluation.deep.originality
  ) / 7;
  
  // Use custom config if provided, otherwise use default
  const config = { ...scoringConfig, ...(customConfig || {}) };
  
  // Apply weights with increased emphasis on deep semantic analysis
  let weightedScore = (
    surfaceScore * config.surfaceWeight + 
    deepScore * config.deepWeight
  );
  
  // Apply baseline adjustment to avoid clustering in middle ranges
  weightedScore += config.scoreAdjustment;
  
  // Apply additional adjustment for very low scores to prevent clustering
  if (deepScore < 50) {
    // For obviously shallow content, push scores lower
    weightedScore -= Math.max(0, (50 - deepScore) * 0.3);
  }
  
  // Apply stretch adjustment for very high scores to better differentiate excellent work
  if (deepScore > 85) {
    // For exceptionally deep content, push scores higher
    weightedScore += Math.min(5, (deepScore - 85) * 0.2);
  }
  
  // Ensure final score is within valid range
  const overallScore = Math.round(
    Math.max(config.minScore, Math.min(config.maxScore, weightedScore))
  );
  
  return {
    surface: detailedEvaluation.surface,
    deep: detailedEvaluation.deep,
    surfaceScore,
    deepScore,
    overallScore,
    analysis: semanticAnalysis,
    calibrationAdjusted: !!customConfig
  };
}

/**
 * Generate a detailed semantic analysis of the text using GPT-4
 * This becomes part of the assessment shown to the user
 */
async function generateSemanticAnalysis(text: string): Promise<string> {
  try {
    const prompt = `You are an expert cognitive assessor examining the intellectual quality of writing. Analyze the following text, focusing on:

    1. CONCEPTUAL DEPTH: How sophisticated are the ideas? Is the thinking shallow, moderate, or profound?
    2. INFERENTIAL STRUCTURE: How well do logical connections flow between claims? Are there gaps in reasoning?
    3. SEMANTIC DENSITY: How much meaningful content is packed into the text? Is it semantically thin or rich?
    4. LOGICAL COHERENCE: How well-structured is the argument? Does each point build on the previous ones?
    5. ORIGINALITY: Does the writing demonstrate novel thinking or merely recycle familiar ideas?
    
    Provide an honest, critical assessment (150-200 words) that evaluates the cognitive strength reflected in the writing.
    
    IMPORTANT CALIBRATION REFERENCE:
    - Generic AI-written content demonstrates limited depth and typically scores around 40/100
    - Sophisticated philosophical analysis like "Numbers as Ordered Pairs" demonstrates exceptional conceptual complexity and scores around 95/100
    
    Be specific about cognitive strengths and weaknesses. Avoid vague generalizations.
    Include an assessment of how the text reflects the writer's intelligence level (low, moderate, high, or exceptional).
    
    TEXT TO ANALYZE:
    ${text.substring(0, 8000)} ${text.length > 8000 ? '... [text truncated due to length]' : ''}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
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
    
    const prompt = `Analyze this writing sample and score it on several dimensions of intellectual capability.
    For each dimension, provide a score from 0-100 where:
    - 0-20: Critically deficient (extremely poor, incoherent, simplistic)
    - 21-40: Basic (rudimentary, shallow, limited)
    - 41-60: Moderate (average, serviceable but unremarkable)
    - 61-80: Strong (well-developed, clear, coherent)
    - 81-95: Very strong (sophisticated, nuanced, insightful)
    - 96-100: Exceptional (rare, elite-level thinking)
    
    IMPORTANT CALIBRATION GUIDANCE:
    - AI-generated generic content should score 35-45 overall
    - Basic undergraduate writing typically scores 45-60
    - Strong graduate-level writing typically scores 65-80
    - Sophisticated academic/philosophical writing scores 80-95
    - Truly exceptional, groundbreaking analysis may score 95-99
    
    REFERENCE CALIBRATION EXAMPLES:
    1. "Personal identity is a topic that has been studied for many years by philosophers and researchers. It is about understanding what makes a person the same over time..." → Score around 40 (shallow, generic)
    2. "Numbers as ordered pairs... These analyses are prima facie incompatible with each other, given that Kn≠Kpn, for n>0. In the present paper it is shown that these analyses are in fact compatible..." → Score around 95-97 (exceptional logical complexity)
    
    TEXT TO ANALYZE:
    ${truncatedText}
    
    Score the following dimensions and USE THE FULL RANGE (0-100):
    
    SURFACE FEATURES (35% of total weight):
    1. Grammar and Mechanics (correctness of grammar, spelling, punctuation)
    2. Structure and Organization (logical flow, paragraph organization)
    3. Jargon Usage (appropriate use of technical terms when needed)
    4. Surface Fluency (basic sentence formation, readability)
    
    DEEP FEATURES (65% of total weight):
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