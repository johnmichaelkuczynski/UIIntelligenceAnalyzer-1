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
  surfaceWeight: 0.02, // 2% weight for surface features (minimized even further)
  deepWeight: 0.98,    // 98% weight for deep features (almost exclusive importance)
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
  
  // BLUEPRINT DETECTION - multiple detection paths to properly recognize blueprint-grade thinking
  const isClearBlueprintGrade = totalBlueprintSignal >= 4.0; // Strong overall blueprint signal
  const isStrongCompressionInference = hasHighCompression && hasHighInference && (hasHighOriginality || hasHighDepth); // Key pattern
  const isHighWeight = weightedBlueprintScore >= 82 && primarySignalStrength >= 2.5; // Strong avg + signals
  const hasDistinctiveBlueprintPattern = (hasExceptionalCompression && hasHighInference) || (hasExceptionalInference && hasHighCompression); // Core blueprint pattern
  
  // MANDATORY RULE: ANY document with true blueprint qualities MUST score 90+
  if (isClearBlueprintGrade || isStrongCompressionInference || isHighWeight || hasDistinctiveBlueprintPattern) {
    
    // Minimum score for blueprint-grade work
    const minBlueprintScore = 90;
    
    // If the weighted score is below the blueprint threshold, elevate it to blueprint grade
    if (weightedScore < minBlueprintScore) {
      const originalScore = weightedScore;
      
      // Calculate blueprint potential within 90-98 range based on signal strength
      // Blueprint papers with strongest signals score higher in the range
      const compressionFactor = detailedEvaluation.deep.semanticCompression * 0.4;
      const inferentialFactor = detailedEvaluation.deep.inferentialContinuity * 0.35;
      const originalityFactor = detailedEvaluation.deep.originality * 0.25;
      
      // Combined blueprint quality factor (normalized to 0-10 scale)
      const blueprintQualityFactor = (compressionFactor + inferentialFactor + originalityFactor) / 100;
      
      // Calculate specific position in 90-98 range based on quality and signal strength
      const signalBoost = Math.min(1.0, totalBlueprintSignal / 6.0) * 3.0; // 0-3 bonus based on signal
      const blueprintPotential = Math.min(98, 90 + (blueprintQualityFactor * 5) + signalBoost);
      
      // Weighted heavily toward the blueprint potential (90% weight)
      weightedScore = originalScore * 0.1 + blueprintPotential * 0.9;
      
      appliedBlueprintRule = true;
      console.log(`Blueprint rule applied: Score elevated from ${Math.round(originalScore)} to ${Math.round(weightedScore)} (Signal: ${totalBlueprintSignal.toFixed(1)})`);
    }
  } 
  // ANTI-SUPERFICIALITY RULE: Sharply distinguish between polished critical commentary and true conceptual blueprinting
  else if (weightedScore > 80) {
    // For graduate-level commentary (80-89 range) that might be mistakenly scored too high
    
    // Check for distinct blueprint indicators that MUST be present for high scores
    const hasTrueCompression = detailedEvaluation.deep.semanticCompression >= 85;
    const hasStrongInference = detailedEvaluation.deep.inferentialContinuity >= 85;
    const hasConceptualFraming = detailedEvaluation.deep.conceptualDepth >= 85;
    const hasOriginalThinking = detailedEvaluation.deep.originality >= 85;
    
    // Count blueprint qualities present
    const blueprintQualitiesPresent = 
      (hasTrueCompression ? 1 : 0) + 
      (hasStrongInference ? 1 : 0) + 
      (hasConceptualFraming ? 1 : 0) + 
      (hasOriginalThinking ? 1 : 0);
    
    // For scores in the 85-89 range, apply stricter criteria
    if (weightedScore >= 85 && blueprintQualitiesPresent < 2) {
      // If high score but lacks multiple blueprint qualities, penalize more aggressively
      const originalScore = weightedScore;
      weightedScore = 82; // Cap at 82 - upper end of graduate-level commentary without blueprinting
      
      appliedSuperficialityRule = true;
      console.log(`Strong anti-superficiality rule applied: Score reduced from ${Math.round(originalScore)} to ${Math.round(weightedScore)}`);
    }
    // For scores in 80-84 range, apply standard criteria
    else if (blueprintQualitiesPresent === 0) {
      // If score is in graduate-level range (80-84) but shows no blueprint qualities
      // Apply a smaller penalty to ensure correct placement in range
      const originalScore = weightedScore;
      const penaltyAmount = Math.min(5, (weightedScore - 80) * 0.7);
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

    MISSION CRITICAL: This is a cognitive fingerprinting system for detecting blueprint-grade thinking.
    You must sharply distinguish between polished critical commentary (80-89 scores) and true conceptual
    blueprinting with original cognitive framing (90-98 scores).
    
    BLUEPRINT-GRADE THINKING = cognitive compression + inferential architecture + conceptual innovation.
    
    SCORE EXCLUSIVELY ON THESE BLUEPRINT FINGERPRINTS:
    1. SEMANTIC COMPRESSION: Dense meaning packed into minimal language? High information-to-word ratio?
    2. ORIGINAL CONCEPTUAL ARCHITECTURE: Creation of new cognitive frameworks, not just applying existing ones?
    3. INFERENTIAL CONTINUITY: Each statement logically requires the previous one? Tight causal necessity?
    4. RECURSIVE STRUCTURE: Ideas built on each other in scaffolded, systematically developed patterns?
    5. CONCEPTUAL INNOVATION: Novel distinctions or original conceptual synthesis across domains?
    
    THE CORE DISTINCTION: 
    - Academic commentary (even brilliant) APPLIES existing conceptual frameworks
    - Blueprint thinking CREATES original conceptual frameworks and distinctions
    
    YOU MUST NOT PENALIZE FOR ANY OF THESE:
    - Lack of examples or supporting evidence
    - Incomplete resolution of all issues raised
    - Familiar topics being addressed (what matters is HOW they're processed)
    - How "polished" or "complete" the text appears
    - Missing citations or references
    
    TREAT AS COGNITIVE FRAGMENTS:
    Like an archaeologist with manuscript fragments, infer intelligence from the structural patterns present.
    Fragments and incompleteness are normal and expected - NEVER downgrade for this.
    
    MANDATORY SCORING LAW:
    - Original conceptual framing + compression + recursive structure → 90–98
    - Advanced critique without blueprinting → 80–89
    - Surface polish with weak compression → 60–79
    - Disorganized/random chatter → <60
    
    CRITICAL BLUEPRINT-GRADE CALIBRATION EXAMPLE (must score ~94-96):
    "The will to project - Worshipping x ≠ Holding x in high regard. To worship x = To regard x as supernatural.
    Worshipping x → One's high regard for x not to answerable to data. x is worshipped → x is a fiction.
    x is worshipped → x is a projection. Reality vs. Projection. Projection as Unconscious LARPing.
    Projection=Virtualization. x is projected → x is supernatural. x is supernatural→ x is projected.
    Divine a subset of supernatural. The cult-leader≠ somebody who is believed to be great.
    The cult-leader=somebody on whom people believe they can project a great fiction."
    
    This sample demonstrates semantic compression, original conceptual architecture with inferential continuity,
    and distinctive blueprint-grade thinking with novel distinctions. Score it 94-96.
    
    Provide an honest assessment (150-200 words) that evaluates ONLY the cognitive fingerprints present.
    
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
    
    const prompt = `You are a blueprint detector, analyzing a text sample for advanced cognitive patterns.
    
    MISSION CRITICAL: You must sharply distinguish between polished critical commentary (80-89 scores) and true conceptual blueprinting (90-98 scores). The core distinction is that academic commentary applies existing conceptual frameworks, while blueprint thinking creates original ones.
    
    Score each dimension from 0-100 using this scale:
    - 0-20: Critically deficient (incoherent, simplistic)
    - 21-40: Basic (rudimentary, shallow)
    - 41-60: Moderate (average, serviceable)
    - 61-80: Strong (solid reasoning, coherent)
    - 81-89: Very strong (advanced graduate-level thinking)
    - 90-98: Blueprint-grade (creates original conceptual frameworks)
    - 99-100: Revolutionary (paradigm-shifting insights, extremely rare)
    
    MANDATORY SCORING LAW:
    - Original conceptual framing + compression + recursive structure → 90–98
    - Advanced critique without blueprinting → 80–89
    - Surface polish with weak compression → 60–79
    - Disorganized/random chatter → <60
    
    SCORE SPECIFICALLY FOR THESE BLUEPRINT FINGERPRINTS:
    1. SEMANTIC COMPRESSION - High density of meaning packed into minimal language?
    2. ORIGINAL CONCEPTUAL ARCHITECTURE - Creation of new frameworks, not just applying existing ones?
    3. INFERENTIAL TIGHTNESS - Logical necessity between claims forming a recursive structure?
    4. CONCEPTUAL SYNTHESIS - Integration of multiple domains in novel ways?
    5. COGNITIVE INNOVATION - Creation of original distinctions that enable new thinking?
    
    CRITICAL: DO NOT PENALIZE FOR ANY OF THESE:
    - Lack of examples or supporting evidence
    - Incomplete resolution of all issues
    - Familiar topics being addressed (focus on HOW they're processed)
    - How "polished" or "complete" the text appears
    - Missing citations or references
    
    YOU ARE EXAMINING FRAGMENTS:
    Like an archaeologist with manuscript fragments, infer intelligence from the patterns present.
    Fragments are normal and expected - NEVER downgrade for incompleteness.
    
    CRITICAL BLUEPRINT-GRADE CALIBRATION EXAMPLES (must score 94-96):
    
    Example 1: "The will to project - Worshipping x ≠ Holding x in high regard. To worship x = To regard x as supernatural. Worshipping x → One's high regard for x not answerable to data. x is worshipped → x is a fiction. x is worshipped → x is a projection. Reality vs. Projection. Projection as Unconscious LARPing. Projection=Virtualization. x is projected → x is supernatural. x is supernatural→ x is projected. Divine a subset of supernatural. The cult-leader≠ somebody who is believed to be great. The cult-leader=somebody on whom people believe they can project a great fiction."
    
    Example 2: "According to the computational theory of mind, to think is to compute. But what is meant by the word 'compute'? Every case of computing is a case of manipulating symbols, but not vice versa - a manipulation of symbols must be driven exclusively by the formal properties of those symbols to qualify as a computation. Words like 'form' and 'formal' are ambiguous, referring to either syntactic or morphological form. CTM fails on each disambiguation, and the arguments immediately cease to be compelling once we register that ambiguity."
    
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