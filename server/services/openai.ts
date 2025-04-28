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
  surfaceWeight: 0.05, // 5% weight for surface features (minimized - just for minimum readability)
  deepWeight: 0.95,    // 95% weight for deep features (dominant factor)
  scoreAdjustment: 0,  // No baseline adjustment - let the true cognitive fingerprint emerge
  maxScore: 100,       // Maximum possible score
  minScore: 0,         // Minimum possible score
  blueprintThreshold: 90 // Threshold for blueprint-capable cognitive performance
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
  
  // ========== BLUEPRINT DETECTION RULE ==========
  // Identify blueprint-grade cognitive samples that demonstrate high semantic compression,
  // original conceptual architecture, inferential continuity, and structured cognitive frameworks
  
  // Critical metrics for blueprint-grade thinking
  const blueprintMetrics = [
    detailedEvaluation.deep.conceptualDepth,
    detailedEvaluation.deep.inferentialContinuity,
    detailedEvaluation.deep.semanticCompression,
    detailedEvaluation.deep.originality
  ];
  
  // Calculate average of blueprint metrics
  const avgBlueprintScore = blueprintMetrics.reduce((sum, val) => sum + val, 0) / blueprintMetrics.length;
  
  // Track if rules were applied for debugging
  let appliedBlueprintRule = false;
  let appliedSuperficialityRule = false;

  // BLUEPRINT DETECTION: If the sample shows exceptionally high compression and originality,
  // ensure it scores in the 90-98 range (blueprint-capable cognitive performance)
  if (avgBlueprintScore >= 85 && 
      detailedEvaluation.deep.semanticCompression >= 85 && 
      detailedEvaluation.deep.inferentialContinuity >= 85) {
    
    // Determine the minimum score for blueprint-grade work
    const minBlueprintScore = 90;
    
    // If the weighted score is below the blueprint threshold, elevate it
    if (weightedScore < minBlueprintScore) {
      const originalScore = weightedScore;
      
      // Calculate elevation factor based on how strong the blueprint metrics are
      // Stronger blueprint signal = higher in the 90-98 range
      const blueprintPotential = Math.min(98, 90 + (avgBlueprintScore - 85) * 0.8);
      
      // Set score to a weighted average between current score and blueprint potential
      // This ensures we don't artificially inflate too much
      weightedScore = originalScore * 0.2 + blueprintPotential * 0.8;
      
      appliedBlueprintRule = true;
      console.log(`Blueprint rule applied: Score elevated from ${Math.round(originalScore)} to ${Math.round(weightedScore)}`);
    }
  } 
  // ANTI-SUPERFICIALITY RULE: Text must not receive high scores solely based on surface features
  else if (weightedScore > 80) {
    const minRequiredDeepScore = 85; // Minimum deep score required for high overall score
    
    if (avgBlueprintScore < minRequiredDeepScore) {
      const penaltyFactor = Math.min(1, avgBlueprintScore / minRequiredDeepScore);
      const highScorePortion = weightedScore - 80;
      
      // Stronger penalty (2x) to ensure proper separation between polished academic writing
      // and true cognitive compression/original inferential architecture
      const penaltyAmount = highScorePortion * (1 - penaltyFactor) * 2.0; 
      
      const originalScore = weightedScore;
      weightedScore = weightedScore - penaltyAmount;
      
      appliedSuperficialityRule = true;
      console.log(`Anti-superficiality rule applied: Score reduced from ${Math.round(originalScore)} to ${Math.round(weightedScore)}`);
    }
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
    const prompt = `You are an intelligence fingerprint scanner analyzing a cognitive sample - NOT a paper grader.

    MISSION CRITICAL: This is a cognitive fingerprinting system, not an essay grader. 
    We are detecting the presence of high-level thinking patterns, not evaluating polish or completeness.
    
    SCORE EXCLUSIVELY ON THESE COGNITIVE PATTERNS:
    1. SEMANTIC COMPRESSION: How much meaning is packed into minimal language? Dense concept-to-word ratio?
    2. ORIGINAL CONCEPT ARCHITECTURE: Does the text create new cognitive frameworks or merely apply existing ones?
    3. INFERENTIAL CONTINUITY: Does each statement logically require the previous one? Is there tight causal necessity?
    4. CONCEPTUAL INNOVATION: Does the thinking create novel conceptual distinctions or synthesize in original ways?
    
    YOU MUST NOT PENALIZE FOR ANY OF THESE:
    - Lack of examples or evidence
    - Lack of alternative viewpoints
    - Incomplete resolution of issues raised
    - Familiar topics (we care about HOW they're processed)
    - How "polished" or "complete" the text appears
    - Missing citations or references
    
    TREAT AS COGNITIVE FRAGMENTS:
    You are analyzing fragments of thought, like an archaeologist examining partial manuscripts. 
    What matters is the cognitive structure visible in what IS present, not what's missing.
    
    MANDATORY SCORING LAW:
    - Blueprint-capable cognitive performance (semantic compression + inferential tightness + originality) → 90–98
    - Graduate-level commentary without blueprint qualities → 80–89
    - Undergraduate structured thinking → 65–79
    - Fluent surface without inferential depth → 50–64
    - Disorganized/random language → <50
    
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
    
    const prompt = `You are a cognitive fingerprint scanner, analyzing a text sample for intelligence patterns.
    
    MISSION CRITICAL: You are NOT grading essays. You are detecting cognitive patterns.
    Focus ONLY on semantic compression, inferential precision, and conceptual architecture.
    
    Score each dimension from 0-100 using this scale:
    - 0-20: Critically deficient (incoherent, simplistic)
    - 21-40: Basic (rudimentary, shallow)
    - 41-60: Moderate (average, serviceable)
    - 61-80: Strong (solid reasoning, coherent)
    - 81-90: Very strong (advanced graduate-level thinking)
    - 91-98: Blueprint-grade (exceptional semantic compression and original frameworks)
    - 99-100: Revolutionary (paradigm-shifting insights, extremely rare)
    
    YOUR SCORING MUST FOLLOW THIS MANDATORY LAW:
    - Blueprint-grade thinking → 90-98 scores
    - Advanced graduate commentary → 80-89 scores
    - Undergraduate structured thinking → 65-79 scores
    - Fluent surface without depth → 50-64 scores
    - Disorganized chatter → <50 scores
    
    SCORE ONLY BASED ON THESE PATTERNS:
    1. SEMANTIC COMPRESSION - How much meaning packed into minimal language?
    2. CONCEPTUAL ARCHITECTURE - Creation of original cognitive frameworks?
    3. INFERENTIAL TIGHTNESS - Logical necessity between claims?
    4. COGNITIVE INNOVATION - Novel distinctions or conceptual synthesis?
    
    CRITICAL: DO NOT PENALIZE FOR ANY OF THESE:
    - Lack of examples/evidence
    - Incomplete resolution of all issues
    - Familiar topics being addressed
    - How "finished" or "complete" the text is
    - Missing citations or references
    
    YOU ARE EXAMINING FRAGMENTS:
    Like an archaeologist with manuscript fragments, infer intelligence from the structural patterns present.
    Fragments and incompleteness are expected - NEVER downgrade for this.
    
    CRITICAL CALIBRATION EXAMPLE (must score ~94):
    "According to the computational theory of mind, to think is to compute. But what is meant by the word 'compute'? Every case of computing is a case of manipulating symbols, but not vice versa - a manipulation of symbols must be driven exclusively by the formal properties of those symbols if it is qualify as a computation. Words like 'form' and 'formal' are ambiguous, as they can refer to form in either the syntactic or the morphological sense. CTM fails on each disambiguation, and the arguments for CTM immediately cease to be compelling once we register that ambiguity."
    
    TEXT TO ANALYZE:
    ${truncatedText}
    
    Score these dimensions, using the FULL RANGE (0-100) to properly distinguish levels:
    
    SURFACE FEATURES (5% weight - minimal importance):
    1. Grammar and Mechanics (basic correctness)
    2. Structure and Organization (basic organization)
    3. Jargon Usage (appropriate technical terms)
    4. Surface Fluency (basic readability)
    
    DEEP FEATURES (95% weight - dominant importance):
    5. Conceptual Depth (sophistication of ideas)
    6. Inferential Continuity (logical connections between ideas)
    7. Claim-to-Claim Necessity (coherent logical progression)
    8. Semantic Compression (density of meaning per word)
    9. Logical Laddering (scaffolded development of ideas)
    10. Depth Fluency (subtlety of argumentation)
    11. Originality (conceptual innovation)
    
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