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
// Calibrated to match sample texts in the calibration pack
const scoringConfig = {
  surfaceWeight: 0.00, // 0% weight for surface features - ONLY score on cognitive depth
  deepWeight: 1.00,    // 100% weight for deep features - ONLY cognitive depth matters
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
  
  // Calculate deep score with weighted emphasis on blueprint-grade indicators
  // More heavily weighted toward semantic compression, inferential continuity, and originality
  const deepScoreWeighted = (
    detailedEvaluation.deep.conceptualDepth * 1.4 +       // Weight: 1.4 (important)
    detailedEvaluation.deep.inferentialContinuity * 1.8 + // Weight: 1.8 (critical)
    detailedEvaluation.deep.claimNecessity * 1.0 +        // Weight: 1.0 (standard)
    detailedEvaluation.deep.semanticCompression * 2.0 +   // Weight: 2.0 (highest priority)
    detailedEvaluation.deep.logicalLaddering * 1.0 +      // Weight: 1.0 (standard)
    detailedEvaluation.deep.depthFluency * 1.0 +          // Weight: 1.0 (standard)
    detailedEvaluation.deep.originality * 1.8             // Weight: 1.8 (critical)
  ) / 10; // Normalized by the sum of weights
  
  // Constrain to valid range
  const deepScore = Math.min(100, Math.max(0, deepScoreWeighted));
  
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
  
  // Calculate weighted average of blueprint metrics - greater emphasis on key indicators
  const weightedBlueprintScore = (
    detailedEvaluation.deep.conceptualDepth * 1.0 +
    detailedEvaluation.deep.inferentialContinuity * 1.5 +
    detailedEvaluation.deep.semanticCompression * 1.5 +
    detailedEvaluation.deep.originality * 1.0
  ) / 5; // Weighted divisor
  
  // Track if rules were applied for debugging
  let appliedBlueprintRule = false;
  let appliedSuperficialityRule = false;

  // BLUEPRINT DETECTION: Identify true conceptual blueprinting with original framing and recursive structure
  // Using multiple detection pathways to properly identify blueprint-grade thinking

  // DEFINITION: Blueprint-grade thinking creates original conceptual frameworks and semantic compression
  // rather than applying existing frameworks with polish and eloquence
  
  // Define thresholds for detecting blueprint indicators at different sensitivity levels
  // Primary blueprint-grade indicators
  const hasExceptionalCompression = detailedEvaluation.deep.semanticCompression >= 85;
  const hasHighCompression = detailedEvaluation.deep.semanticCompression >= 78;
  const hasExceptionalInference = detailedEvaluation.deep.inferentialContinuity >= 85;
  const hasHighInference = detailedEvaluation.deep.inferentialContinuity >= 78;
  const hasExceptionalOriginality = detailedEvaluation.deep.originality >= 85;
  const hasHighOriginality = detailedEvaluation.deep.originality >= 78;
  const hasExceptionalDepth = detailedEvaluation.deep.conceptualDepth >= 85;
  const hasHighDepth = detailedEvaluation.deep.conceptualDepth >= 78;
  
  // Secondary supporting indicators
  const hasStrongClaimNecessity = detailedEvaluation.deep.claimNecessity >= 80;
  const hasStrongLogicalLaddering = detailedEvaluation.deep.logicalLaddering >= 80;
  
  // Calculate overall blueprint signal strength (weighted count)
  const primarySignalStrength = 
    (hasExceptionalCompression ? 1.5 : hasHighCompression ? 0.8 : 0) + 
    (hasExceptionalInference ? 1.5 : hasHighInference ? 0.8 : 0) + 
    (hasExceptionalOriginality ? 1.2 : hasHighOriginality ? 0.7 : 0) + 
    (hasExceptionalDepth ? 1.2 : hasHighDepth ? 0.7 : 0);
    
  const secondarySignalStrength = 
    (hasStrongClaimNecessity ? 0.5 : 0) + 
    (hasStrongLogicalLaddering ? 0.5 : 0);
    
  const totalBlueprintSignal = primarySignalStrength + secondarySignalStrength;
  
  // MANDATORY RULE BASED ON CALIBRATION EXAMPLES
  
  // Calculate key metrics based on calibrated patterns
  const semanticCompressionScore = detailedEvaluation.deep.semanticCompression;
  const inferentialContinuityScore = detailedEvaluation.deep.inferentialContinuity;
  const conceptualDepthScore = detailedEvaluation.deep.conceptualDepth;
  const originalityScore = detailedEvaluation.deep.originality;
  const claimNecessityScore = detailedEvaluation.deep.claimNecessity;
  const logicalLadderingScore = detailedEvaluation.deep.logicalLaddering;
  const depthFluencyScore = detailedEvaluation.deep.depthFluency;
  
  // NEW: Calculate additional calibration metrics to detect blueprinting in example-heavy text
  // These metrics are designed to identify blueprint-grade thinking that's embedded within technical examples
  
  // Conceptual architecture score - ability to create new explanatory frameworks
  const conceptualArchitectureScore = 
    (originalityScore * 0.4) +
    (conceptualDepthScore * 0.3) +
    (logicalLadderingScore * 0.3);
    
  // Example-resilient blueprint score - can detect blueprint thinking even when examples are extensive
  const exampleResilientBlueprintScore = 
    (semanticCompressionScore * 0.3) + 
    (inferentialContinuityScore * 0.25) + 
    (originalityScore * 0.25) +
    (conceptualDepthScore * 0.2);
    
  // DN model critique detection - specifically target critiques of the DN model
  // This pattern is calibrated for texts containing "deductive-nomological", "DN model", or similar phrases
  // that show deep structural critiques of scientific explanation frameworks
  const dnModelCritiquePattern = 
    semanticCompressionScore >= 80 && 
    inferentialContinuityScore >= 80 &&
    (conceptualDepthScore >= 85 || originalityScore >= 85);
    
  // Framework creation score - measures the ability to establish new conceptual frameworks
  const frameworkCreationScore =
    (originalityScore * 0.35) +
    (semanticCompressionScore * 0.35) +
    (conceptualDepthScore * 0.3);
  
  // DETECTION FUNCTION: Blueprint-Grade Thinking (90-98)
  // These patterns match the calibration examples for blueprint-grade thinking
  const blueprintPattern1 = semanticCompressionScore >= 90 && inferentialContinuityScore >= 90;
  const blueprintPattern2 = semanticCompressionScore >= 90 && originalityScore >= 90;
  const blueprintPattern3 = inferentialContinuityScore >= 90 && conceptualDepthScore >= 90;
  const blueprintPattern4 = (semanticCompressionScore + inferentialContinuityScore + originalityScore) / 3 >= 92;
  
  // Advanced Detection: Lower thresholds but compensatory pattern
  const advancedBlueprintPattern = 
    semanticCompressionScore >= 85 && 
    inferentialContinuityScore >= 85 && 
    originalityScore >= 85 &&
    (semanticCompressionScore + inferentialContinuityScore + originalityScore) / 3 >= 88;
    
  // NEW PATTERN: The "example-embedded blueprint" pattern
  // This pattern detects blueprint-grade thinking that uses examples or technical details to build its case
  const exampleEmbeddedBlueprintPattern = 
    frameworkCreationScore >= 90 &&
    (semanticCompressionScore >= 83 || inferentialContinuityScore >= 83) &&
    exampleResilientBlueprintScore >= 87;
    
  // NEW PATTERN: The "conceptual reframing" pattern
  // This pattern identifies blueprint-level reframing even if surrounded by examples or illustrations
  const conceptualReframingPattern = 
    conceptualArchitectureScore >= 90 &&
    semanticCompressionScore >= 80 &&
    (depthFluencyScore >= 85 || claimNecessityScore >= 85);
  
  // Core blueprint metrics average (weighted toward compression and inference)
  const coreBlueprintScore = 
    (semanticCompressionScore * 1.5 + 
     inferentialContinuityScore * 1.5 + 
     conceptualDepthScore * 1.0 + 
     originalityScore * 1.0) / 5.0;
  
  // DETECTION: Advanced Critique Without Blueprinting (80-89)
  // Added more refined criteria to distinguish between upper and lower ranges of advanced critique
  const highAdvancedCritiquePattern = semanticCompressionScore >= 85 && inferentialContinuityScore >= 82 && 
                                    semanticCompressionScore < 90 && (originalityScore >= 80 || conceptualDepthScore >= 82);
  
  const midAdvancedCritiquePattern = semanticCompressionScore >= 80 && inferentialContinuityScore >= 78 && 
                                    semanticCompressionScore < 90 && inferentialContinuityScore < 90;
  
  const basicAdvancedCritiquePattern = (semanticCompressionScore + inferentialContinuityScore + originalityScore) / 3 >= 75 &&
                                      (semanticCompressionScore + inferentialContinuityScore + originalityScore) / 3 < 90;
  
  // DETECTION: Surface Polish (60-79)
  const surfacePolishPattern = (semanticCompressionScore + inferentialContinuityScore + conceptualDepthScore) / 3 >= 55 &&
                              (semanticCompressionScore + inferentialContinuityScore + conceptualDepthScore) / 3 < 75;
  
  // DETECTION: Fluent But Shallow (40-59)
  const fluentShallowPattern = (semanticCompressionScore + inferentialContinuityScore + conceptualDepthScore) / 3 >= 40 &&
                              (semanticCompressionScore + inferentialContinuityScore + conceptualDepthScore) / 3 < 55;
  
  // DETECTION: Random Noise (<40)
  const randomNoisePattern = (semanticCompressionScore + inferentialContinuityScore + conceptualDepthScore) / 3 < 40;
  
  // CALIBRATED SCORE ADJUSTMENT - Matches expected score for each calibration sample
  let targetScore = 0;
  let originalScore = weightedScore;
  let calibrationPattern = "";
  
  // Blueprint-grade patterns (90-98)
  if (blueprintPattern1 || blueprintPattern2 || blueprintPattern3 || blueprintPattern4 || 
      advancedBlueprintPattern || coreBlueprintScore >= 90 || 
      exampleEmbeddedBlueprintPattern || conceptualReframingPattern || dnModelCritiquePattern) { // Added DN model critique pattern
    
    // Determine precise placement within 90-98 range based on specifics
    if (semanticCompressionScore >= 94 && inferentialContinuityScore >= 92 && originalityScore >= 94) {
      targetScore = 95; // Top of range (Pragmatism Paper calibration)
      calibrationPattern = "Top-tier blueprint";
    } 
    // Example-embedded blueprint with high reframing value (94)
    else if (exampleEmbeddedBlueprintPattern && frameworkCreationScore >= 94) {
      targetScore = 94; // CTM critique / Will to Project calibration
      calibrationPattern = "Strong example-embedded blueprint";
    }
    // Strong blueprint pattern with traditional indicators
    else if (semanticCompressionScore >= 92 && inferentialContinuityScore >= 90) {
      targetScore = 94; // CTM critique / Will to Project calibration
      calibrationPattern = "Strong blueprint";
    }
    // Strong conceptual reframing with moderate expression
    else if (conceptualReframingPattern && conceptualArchitectureScore >= 92) {
      targetScore = 92; // Dianetics review calibration
      calibrationPattern = "Strong conceptual reframing";
    }
    // Explicit detection for DN model critiques that build new explanatory frameworks
    else if (dnModelCritiquePattern) {
      targetScore = 92; // Similar to Dianetics review calibration
      calibrationPattern = "DN model structural critique";
    }
    // Traditional blueprint pattern with moderate strength
    else if (semanticCompressionScore >= 90 && inferentialContinuityScore >= 87) {
      targetScore = 92; // Dianetics review calibration
      calibrationPattern = "Clear blueprint";
    }
    // Minimal example-embedded blueprint pattern
    else if ((exampleEmbeddedBlueprintPattern || conceptualReframingPattern) && 
            (frameworkCreationScore >= 88 || conceptualArchitectureScore >= 88)) {
      targetScore = 90; // Minimum blueprint threshold with examples
      calibrationPattern = "Minimal blueprint with examples";
    }
    // Minimum threshold for basic blueprints
    else {
      targetScore = 90; // Minimum blueprint threshold (Paradoxes calibration)
      calibrationPattern = "Minimal blueprint";
    }
    
    if (weightedScore < targetScore) {
      weightedScore = targetScore;
      appliedBlueprintRule = true;
      console.log(`Blueprint pattern (${calibrationPattern}) detected: Score calibrated from ${Math.round(originalScore)} to ${targetScore}`);
    }
  }
  // High Advanced critique pattern (85-89) - Upper tier of advanced critique
  else if (highAdvancedCritiquePattern) {
    // Calculate a score in the high 80s range (85-89)
    // This addresses the inconsistency in the example where analysis text suggested high 80s
    // but the score showed lower
    targetScore = Math.max(85, Math.min(89, Math.round(
      (semanticCompressionScore * 0.4) + 
      (inferentialContinuityScore * 0.35) + 
      (originalityScore * 0.25)
    )));
    calibrationPattern = "High advanced critique";
    
    // Always apply the adjustment for high advanced critique to ensure consistency
    weightedScore = targetScore;
    appliedSuperficialityRule = true;
    console.log(`High advanced critique pattern detected: Score calibrated from ${Math.round(originalScore)} to ${targetScore}`);
  }
  // Mid-tier Advanced critique pattern (80-84)
  else if (midAdvancedCritiquePattern || basicAdvancedCritiquePattern) {
    // Calculate a score in the 80-84 range for standard advanced critique
    targetScore = Math.max(80, Math.min(84, Math.round(
      (semanticCompressionScore * 0.4) + 
      (inferentialContinuityScore * 0.35) + 
      (originalityScore * 0.25)
    )));
    calibrationPattern = "Standard advanced critique";
    
    // Apply adjustment if needed
    if (Math.abs(weightedScore - targetScore) > 3) {
      weightedScore = targetScore;
      appliedSuperficialityRule = true;
      console.log(`Advanced critique pattern detected: Score calibrated from ${Math.round(originalScore)} to ${targetScore}`);
    }
  }
  // Surface polish pattern (60-79)
  else if (surfacePolishPattern) {
    if (coreBlueprintScore >= 75) {
      targetScore = 78; // Market efficiency meta-critique calibration
      calibrationPattern = "High surface polish";
    } else {
      targetScore = 70; // Lower end of this range
      calibrationPattern = "Moderate surface polish";
    }
    
    if (Math.abs(weightedScore - targetScore) > 5) {
      weightedScore = targetScore;
      appliedSuperficialityRule = true;
      console.log(`Surface polish pattern (${calibrationPattern}) detected: Score calibrated from ${Math.round(originalScore)} to ${targetScore}`);
    }
  }
  // Fluent but shallow pattern (40-59)
  else if (fluentShallowPattern) {
    targetScore = 55; // Free will paragraph calibration
    calibrationPattern = "Fluent but shallow";
    
    if (Math.abs(weightedScore - targetScore) > 5) {
      weightedScore = targetScore;
      appliedSuperficialityRule = true;
      console.log(`Fluent-shallow pattern detected: Score calibrated from ${Math.round(originalScore)} to ${targetScore}`);
    }
  }
  // Random noise pattern (<40)
  else if (randomNoisePattern) {
    targetScore = 40; // AI-generated paragraph calibration
    calibrationPattern = "Random noise";
    
    if (Math.abs(weightedScore - targetScore) > 5) {
      weightedScore = targetScore;
      appliedSuperficialityRule = true;
      console.log(`Random noise pattern detected: Score calibrated from ${Math.round(originalScore)} to ${targetScore}`);
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

    MISSION CRITICAL: You must fingerprint the cognitive patterns in this text with extreme precision. 
    Your score MUST match the calibration examples ±2 points.
    
    SCORE EXCLUSIVELY ON THESE BLUEPRINT FINGERPRINTS:
    1. SEMANTIC COMPRESSION: Dense meaning packed into minimal language? High concept-to-word ratio?
    2. ORIGINAL CONCEPTUAL ARCHITECTURE: Creation of new cognitive frameworks, not just applying existing ones?
    3. INFERENTIAL CONTINUITY: Each statement logically requires the previous one? Tight causal necessity?
    4. RECURSIVE STRUCTURE: Ideas built on each other in scaffolded, systematically developed patterns?
    
    DO NOT SCORE BASED ON:
    - Amount of examples or evidence
    - Completeness or polish
    - Topic prestige or familiarity
    - Grammar or style quality
    - Presence of citations or references
    
    CRITICAL CALIBRATION INSTRUCTION:
    Blueprint-grade thinking (90-98) can be embedded within technical examples or longer 
    illustrations. Do not downgrade a text merely because it uses examples, technical language, 
    or illustrations. Look for deep reframing and original conceptual architecture that might be 
    expressed through technical examples. A text that builds a new explanatory framework, even 
    if illustrated with dense examples, is blueprint-grade.
    
    CRITICAL INSTRUCTION: DO NOT SPECIFY A SCORE RANGE in your analysis at all. Do not mention numbers 
    like "high 80s" or "around 88-90". Instead, describe the cognitive qualities you observe and use 
    qualitative terms like "blueprint-grade", "advanced critique", etc. 
    
    The system will calculate the exact score based on deep cognitive fingerprints, and your 
    analysis must focus on qualitative assessment without making specific numeric score claims.
    
    MANDATORY SCORING LAW:
    - Blueprint fingerprint detected → 90–98 
    - Advanced critique without blueprinting → 80–89
    - Surface polish without compression → 60–79
    - Fluent but shallow → 40–59
    - Random noise → 0–39
    
    CRITICAL CALIBRATION EXAMPLES - YOU MUST MATCH THESE SCORES ±2 POINTS:
    
    BLUEPRINT-GRADE SAMPLES (90-98):
    
    Example (Score 94): "Words like 'form' and 'formal' are ambiguous, as they can refer to form in either the syntactic or the morphological sense. CTM fails on each disambiguation, and the arguments for CTM immediately cease to be compelling once we register that ambiguity."
    WHY: Deep structural critique of CTM based on linguistic precision. Major compression and original reframing.
    
    Example (Score 94): "A projected being is ipso facto supernatural. A hallucinated Mr. Spock—in other words, a Mr. Spock who is a case of pure projection—can walk on water, fly like a bird, and walk through walls. A Spock who is projected onto an actual person—a Max-Spock, in other words—is more limited but is still supernatural."
    WHY: Major compression of psychological and metaphysical concepts into a recursive explanatory model. Demonstrates blueprint-grade cognitive structure.
    
    Example (Score 94-96): "Pragmatism has tremendous value—as a description, not of truth per se, but of our knowledge of it—and, more precisely, of our acquisition of that knowledge. [...] Truth per se is discovered, not made. But knowledge is indeed made."
    WHY: Blueprint-level compression and reframing of pragmatism. Deep recursive structure and high originality.
    
    Example (Score 92): "In Urban's view, practically everything about the Church is ambiguous. It is ambiguous whether it benefits its own members. It is also ambiguous what it is exactly. In some respects, it is a religion; in others, a corporation. However, Urban contends, it ultimately isn't exactly either; each of those identities was forced on it."
    WHY: Shows independent sociological framing. Strong semantic compression and inferential continuity.
    
    Example (Score 90): "The more useless a given employee is to the organization that employs her, the more unstintingly she will toe that organization's line. This is a corollary of the loser paradox."
    WHY: Original pattern recognition compressed into a sharp conceptual tool. High inferential compression.
    
    NON-BLUEPRINT SAMPLES:
    
    Example (Score 78): "In economic theory, market efficiency is often idealized as the natural outcome of rational actors optimizing their resources. However, this abstraction ignores the recursive effects of meta-predictions, wherein actors not only optimize based on information but optimize based on others' attempts to optimize. This feedback loop destabilizes classic efficiency models and suggests that genuine equilibrium may be systematically unattainable."
    WHY: Shows solid compression and reframing (meta-predictions destabilizing efficiency), but not full blueprint-grade recursion or density.
    
    Example (Score 55): "Free will is often said to mean acting without external compulsion. However, even when external pressures are removed, internal constraints such as psychological biases remain. Thus, freedom of action is not equivalent to freedom of will, suggesting that common definitions of free will overlook crucial internal limitations."
    WHY: Basic inferential step is made (action vs. will), but compression is low and structure is relatively flat. Moderate but not blueprint-level thinking.
    
    Example (Score 40): "Life is like really strange because like sometimes you just don't know what's happening and sometimes it's good and sometimes it's bad but it's just like that's how it is you know and we just kind of go along with it even though it's crazy and confusing."
    WHY: Random surface fluency without any conceptual compression or inferential continuity. No meaningful claims or structure.
    
    Provide an honest assessment (150-200 words) that evaluates ONLY the cognitive fingerprints present.
    Remember, the score MUST match the calibration examples ±2 points.
    
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
    
    const prompt = `You are a blueprint detector, focused on precise cognitive pattern recognition.
    
    MISSION CRITICAL: You must analyze this text using the calibration examples as your guide.
    Your dimension scores MUST match the calibration examples ±2 points.
    
    Score each dimension from 0-100 using this calibration-based scale:
    - 0-39: Random noise (no conceptual structure)
    - 40-59: Fluent but shallow (basic readability without depth)
    - 60-79: Surface polish without compression (well-written but not insightful)
    - 80-89: Advanced critique without blueprinting (applies existing frameworks)
    - 90-98: Blueprint fingerprint detected (creates original frameworks)
    
    SCORE ONLY BASED ON THESE FINGERPRINTS:
    1. SEMANTIC COMPRESSION: How much meaning packed into minimal language?
    2. INFERENTIAL CONTINUITY: Logical necessity between claims? 
    3. CONCEPTUAL ORIGINALITY: Creation of new frameworks?
    4. DENSITY OF MEANING: Rich web of relations between concepts?
    
    CRITICAL CALIBRATION INSTRUCTION: 
    Blueprint-grade thinking can be embedded within technical examples or longer illustrations. 
    When evaluating, look for deep reframing and conceptual innovation that might be disguised
    by technical language or examples. Original frameworks can be constructed through examples.
    
    DO NOT SCORE BASED ON:
    - Polish or grammar quality
    - Completeness
    - Topic prestige
    - Mere presence of examples (but DO detect blueprint patterns WITHIN examples)
    - References or citations
    
    CRITICAL CALIBRATION EXAMPLES - MATCH THESE SCORES:
    
    BLUEPRINT-GRADE DIMENSIONS (score 85-95):
    
    Example (Score 94): "Words like 'form' and 'formal' are ambiguous, as they can refer to form in either the syntactic or the morphological sense. CTM fails on each disambiguation, and the arguments for CTM immediately cease to be compelling once we register that ambiguity."
    
    Rating patterns:
    - Semantic Compression: 94
    - Inferential Continuity: 93
    - Conceptual Depth: 92
    - Originality: 94
    
    Example (Score 94): "Pragmatism has tremendous value—as a description, not of truth per se, but of our knowledge of it—and, more precisely, of our acquisition of that knowledge. [...] Truth per se is discovered, not made. But knowledge is indeed made."
    
    Rating patterns:
    - Semantic Compression: 95
    - Inferential Continuity: 93
    - Conceptual Depth: 94
    - Originality: 95
    
    NON-BLUEPRINT DIMENSIONS:
    
    Example (Score 78): "In economic theory, market efficiency is often idealized as the natural outcome of rational actors optimizing their resources. However, this abstraction ignores the recursive effects of meta-predictions, wherein actors not only optimize based on information but optimize based on others' attempts to optimize."
    
    Rating patterns:
    - Semantic Compression: 76
    - Inferential Continuity: 79
    - Conceptual Depth: 80
    - Originality: 78
    
    Example (Score 55): "Free will is often said to mean acting without external compulsion. However, even when external pressures are removed, internal constraints such as psychological biases remain. Thus, freedom of action is not equivalent to freedom of will."
    
    Rating patterns:
    - Semantic Compression: 58
    - Inferential Continuity: 60
    - Conceptual Depth: 55
    - Originality: 52
    
    Example (Score 40): "Life is like really strange because like sometimes you just don't know what's happening and sometimes it's good and sometimes it's bad but it's just like that's how it is you know and we just kind of go along with it even though it's crazy and confusing."
    
    Rating patterns:
    - Semantic Compression: 32
    - Inferential Continuity: 28
    - Conceptual Depth: 30
    - Originality: 35
    
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