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

// Scoring configuration for pure cognitive fingerprinting
const scoringConfig = {
  surfaceWeight: 0.10, // 10% weight for surface features (minimized - just for basic readability)
  deepWeight: 0.90,    // 90% weight for deep features (now dominant factor)
  scoreAdjustment: 0,  // No baseline adjustment - let the true cognitive fingerprint emerge
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
  
  // Apply stronger delineation for very low scores (shallow content)
  if (deepScore < 50) {
    // For obviously shallow content, push scores significantly lower
    weightedScore -= Math.max(0, (50 - deepScore) * 0.5);
  }
  
  // Apply stretch adjustment for high scores to properly reward conceptual power
  if (deepScore > 80) {
    // For conceptually dense content, push scores higher
    // This creates clearer separation between "good writing" and "true conceptual innovation"
    const elevationFactor = Math.min(15, (deepScore - 80) * 0.3); 
    weightedScore += elevationFactor;
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
    const prompt = `You are an intelligence fingerprint reader analyzing a cognitive sample - NOT grading a paper.

    FUNDAMENTAL PRINCIPLE: This is an intelligence fingerprint reader, not a paper grader.
    
    SCORE EXCLUSIVELY ON INTERNAL COGNITIVE FEATURES:
    1. SEMANTIC COMPRESSION: How much deep meaning is compressed into a small amount of language?
    2. ORIGINAL CONCEPT FORMATION: Does the text introduce real conceptual innovations?
    3. INFERENTIAL CONTINUITY: Does each idea logically depend on the prior idea?
    4. DENSITY OF MEANING: How tight is the web of relations between claims?
    
    CRITICALLY IMPORTANT - DO NOT PENALIZE FOR:
    - Lack of examples
    - Lack of alternative theories
    - Incomplete resolution of all issues raised
    - Familiar topics being addressed
    - How "finished" or "complete" the text is
    
    TREAT EACH TEXT AS A COGNITIVE SAMPLE:
    You are an archaeologist examining fragments of a manuscript, inferring intelligence from conceptual structure.
    Fragments are normal and expected - never downgrade scores for incompleteness.
    
    MANDATORY SCORING MODEL:
    - Deep compression + tight inferential work + originality → 90–100 range
    - Good organization but no deep compression → 70–89 range
    - Fluent surface but shallow structure → 50–69 range
    - Randomness, superficial chatter → <50 range
    
    ANTI-SUPERFICIALITY RULE: A text must not receive a high intelligence score (>85) solely on the basis of surface structure (grammar, vocabulary, references to philosophers). High intelligence scoring requires demonstrated conceptual compression and original thinking.
    
    CRITICAL CALIBRATION EXAMPLE (must score ~94):
    "According to the computational theory of mind, to think is to compute. But what is meant by the word 'compute'? Every case of computing is a case of manipulating symbols, but not vice versa - a manipulation of symbols must be driven exclusively by the formal properties of those symbols if it is qualify as a computation. Words like 'form' and 'formal' are ambiguous, as they can refer to form in either the syntactic or the morphological sense. CTM fails on each disambiguation, and the arguments for CTM immediately cease to be compelling once we register that ambiguity."
    
    Provide an honest, critical assessment (150-200 words) that evaluates ONLY the cognitive strength reflected in the writing.
    
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
    
    const prompt = `You are an intelligence fingerprint reader, analyzing a cognitive sample.
    
    FUNDAMENTAL PRINCIPLE: You are NOT a paper grader. This is a cognitive fingerprint reader.
    
    For each dimension, provide a score from 0-100 where:
    - 0-20: Critically deficient (extremely poor, incoherent, simplistic)
    - 21-40: Basic (rudimentary, shallow, limited)
    - 41-60: Moderate (average, serviceable but unremarkable)
    - 61-80: Strong (well-developed, clear, coherent)
    - 81-95: Very strong (sophisticated, nuanced, insightful)
    - 96-100: Exceptional (rare, elite-level thinking)
    
    MANDATORY SCORING CRITERIA - ONLY SCORE BASED ON:
    1. SEMANTIC COMPRESSION - density of meaning packed into language
    2. CONCEPTUAL ORIGINALITY - novel thinking, not just rehashing
    3. INFERENTIAL CONTINUITY - logical progression between ideas
    4. MEANING-DENSITY - richness of the web of relations between claims
    
    CRITICALLY IMPORTANT - YOU MUST NOT PENALIZE FOR:
    - Lack of examples
    - Lack of alternative theories
    - Incomplete resolution of all issues
    - Familiar topics being addressed
    - How "finished" or "complete" the text is
    
    TREAT EACH TEXT AS A COGNITIVE SAMPLE:
    You are examining fragments, just as an archaeologist infers intelligence from a broken manuscript.
    Fragments are normal and expected - NEVER downgrade scores for incompleteness.
    
    MANDATORY SCORING MODEL:
    - Deep compression + tight inferential work + originality → 90–100 range
    - Good organization but no deep compression → 70–89 range
    - Fluent surface but shallow structure → 50–69 range
    - Randomness, superficial chatter → <50 range
    
    CRITICAL CALIBRATION EXAMPLE (must score ~94):
    "According to the computational theory of mind, to think is to compute. But what is meant by the word 'compute'? Every case of computing is a case of manipulating symbols, but not vice versa - a manipulation of symbols must be driven exclusively by the formal properties of those symbols if it is qualify as a computation. Words like 'form' and 'formal' are ambiguous, as they can refer to form in either the syntactic or the morphological sense. CTM fails on each disambiguation, and the arguments for CTM immediately cease to be compelling once we register that ambiguity."
    
    TEXT TO ANALYZE:
    ${truncatedText}
    
    Score the following dimensions and USE THE FULL RANGE (0-100):
    
    SURFACE FEATURES (10% of total weight - minimal importance):
    1. Grammar and Mechanics (correctness of grammar, spelling, punctuation)
    2. Structure and Organization (logical flow, paragraph organization)
    3. Jargon Usage (appropriate use of technical terms when needed)
    4. Surface Fluency (basic sentence formation, readability)
    
    DEEP FEATURES (90% of total weight - dominant importance):
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