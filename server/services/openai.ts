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

// Scoring configuration (adjusted to focus on conceptual depth)
const scoringConfig = {
  surfaceWeight: 0.20, // 20% weight for surface features (reduced from 35%)
  deepWeight: 0.80,    // 80% weight for deep features (increased from 65%)
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
  
  // ========== ANTI-SUPERFICIALITY RULE ==========
  // A text must not receive a high intelligence score (>85) solely on the basis of surface structure
  // High intelligence scoring requires demonstrated inferential compression, original concept-definition, 
  // and mechanical progression of thought
  
  // Check if the weighted score would be high but critical deep metrics are low
  const criticalDeepMetrics = [
    detailedEvaluation.deep.inferentialContinuity,
    detailedEvaluation.deep.conceptualDepth,
    detailedEvaluation.deep.semanticCompression,
    detailedEvaluation.deep.originality
  ];
  
  // Calculate average of critical deep metrics
  const avgCriticalDeep = criticalDeepMetrics.reduce((sum, val) => sum + val, 0) / criticalDeepMetrics.length;
  let appliedSuperficialityRule = false;
  
  // More aggressive anti-superficiality rule: higher threshold (85) and stronger penalties
  if (weightedScore > 80 && avgCriticalDeep < 85) {
    const penaltyFactor = Math.min(1, avgCriticalDeep / 85);
    const highScorePortion = weightedScore - 80;
    const penaltyAmount = highScorePortion * (1 - penaltyFactor) * 1.5; // 1.5x stronger penalty
    
    weightedScore = weightedScore - penaltyAmount;
    appliedSuperficialityRule = true;
    console.log(`Anti-superficiality rule applied: Score reduced from ${Math.round(weightedScore + penaltyAmount)} to ${Math.round(weightedScore)}`);
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
    calibrationAdjusted: !!customConfig || appliedSuperficialityRule
  };
}

/**
 * Generate a detailed semantic analysis of the text using GPT-4
 * This becomes part of the assessment shown to the user
 */
async function generateSemanticAnalysis(text: string): Promise<string> {
  try {
    const prompt = `You are an archaeologist examining an ancient manuscript fragment - NOT grading a complete essay.

    CRITICAL: This app is NOT a paper grader. You do not score for completeness, polish, surface formality, or topic prestige.
    
    CRITICAL: Judge ONLY the conceptual properties of the text, however fragmentary it is.
    
    KEY COGNITIVE METRICS (FOCUS EXCLUSIVELY ON THESE):
    
    1. SEMANTIC COMPRESSION: How much deep meaning is compressed into a small amount of language?
    2. ORIGINAL CONCEPT FORMATION: Does the text introduce real conceptual innovations?
    3. INFERENTIAL CONTINUITY: Does each idea logically depend on the prior idea?
    4. DENSITY OF MEANING: How tight is the web of relations between claims?
    
    EXPLICITLY FORBIDDEN SCORING FACTORS:
    - DO NOT score based on "topic prestige" (e.g., just because it's about philosophy)
    - DO NOT score based on "how finished" or "how complete" the text is
    - DO NOT score based on "standard essay structure"
    - DO NOT inflate scores based on superficial indicators like mentioning philosophers or using technical terms
    - DO NOT deflate scores because a text does not fully "resolve" every question it raises
    
    ANTI-SUPERFICIALITY RULE: A text must not receive a high intelligence score (>85) solely on the basis of surface structure (grammar, paragraph flow, technical vocabulary). High intelligence scoring requires demonstrated conceptual compression and original thinking.
    
    Provide an honest, critical assessment (150-200 words) that evaluates the cognitive strength reflected in the writing.
    
    IMPORTANT CALIBRATION REFERENCE:
    - Generic content with limited conceptual innovation scores around 40/100
    - Sophisticated analysis with strong conceptual innovation scores around 95/100
    - Writing with fancy vocabulary but no conceptual depth scores 65-75 maximum
    
    Focus exclusively on cognitive power, not completeness or polish.
    
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
    
    const prompt = `You are an archaeologist examining an ancient manuscript fragment. Analyze this writing sample and score it ONLY on its conceptual sophistication, however fragmentary it is.
    
    For each dimension, provide a score from 0-100 where:
    - 0-20: Critically deficient (extremely poor, incoherent, simplistic)
    - 21-40: Basic (rudimentary, shallow, limited)
    - 41-60: Moderate (average, serviceable but unremarkable)
    - 61-80: Strong (well-developed, clear, coherent)
    - 81-95: Very strong (sophisticated, nuanced, insightful)
    - 96-100: Exceptional (rare, elite-level thinking)
    
    CRITICAL: This is NOT a paper grader. You are NOT scoring for completeness, polish, or how "finished" the text is.
    
    MANDATORY SCORING RULES:
    1. Judge ONLY the conceptual sophistication of the text, not its completeness
    2. Ignore whether the text is "complete" - partial fragments are expected and normal
    3. Score ONLY based on conceptual compression, originality, inferential continuity, and structural density
    4. DO NOT inflate scores based on superficial indicators like mentioning philosophers or using technical terms
    5. DO NOT deflate scores because a text does not fully "resolve" every question it raises
    
    EXPLICITLY FORBIDDEN SCORING FACTORS:
    - DO NOT score based on "topic prestige" (e.g., just because it's about philosophy)
    - DO NOT score based on "how finished" or "how complete" the text is
    - DO NOT score based on "standard essay structure"
    
    CALIBRATION REFERENCE:
    - Generic content with limited conceptual innovation scores around 40/100
    - Sophisticated analysis with strong conceptual innovation scores around 95/100
    - Writing with fancy vocabulary but no conceptual depth scores 65-75 maximum
    
    TEXT TO ANALYZE:
    ${truncatedText}
    
    Score the following dimensions and USE THE FULL RANGE (0-100):
    
    SURFACE FEATURES (20% of total weight - less important):
    1. Grammar and Mechanics (correctness of grammar, spelling, punctuation)
    2. Structure and Organization (logical flow, paragraph organization)
    3. Jargon Usage (appropriate use of technical terms when needed)
    4. Surface Fluency (basic sentence formation, readability)
    
    DEEP FEATURES (80% of total weight - critically important):
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