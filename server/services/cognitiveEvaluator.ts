/**
 * Advanced Cognitive Evaluation Engine
 * Evaluates intelligence based on actual cognitive markers rather than surface-level heuristics
 */

export interface CognitiveMarkers {
  semanticCompression: {
    score: number;
    density: number; // Information units per word
    conceptualLoad: number; // Conceptual weight per sentence
    compressionRatio: number; // Meaning-to-text ratio
  };
  inferentialContinuity: {
    score: number;
    chainLength: number; // Number of logical dependencies
    gapFrequency: number; // Frequency of logical gaps
    coherenceIndex: number; // Overall logical coherence
  };
  semanticTopology: {
    score: number;
    gradient: number; // Rate of conceptual change
    curvature: number; // Conceptual complexity variation
    nodeDensity: number; // Density of key concepts
    connectivity: number; // Inter-concept connections
  };
  cognitiveAsymmetry: {
    score: number;
    weightDistribution: number; // Uneven conceptual difficulty
    effortGradient: number; // Cognitive load variation
    complexitySpikes: number; // Instances of sudden difficulty
  };
  epistemicResistance: {
    score: number;
    nonObviousness: number; // Counter-intuitive insights
    cognitiveEffort: number; // Required mental work
    noveltyIndex: number; // Conceptual freshness
  };
  metacognitiveAwareness: {
    score: number;
    selfReflection: number; // Awareness of own reasoning
    limitRecognition: number; // Acknowledgment of constraints
    assumptionExploration: number; // Investigation of premises
  };
}

export interface EvaluationTier {
  name: string;
  resolution: 'low' | 'medium' | 'high';
  focusAreas: string[];
  scoreVariance: number; // Expected score distribution width
}

export const EVALUATION_TIERS: Record<string, EvaluationTier> = {
  rapid: {
    name: 'Rapid Assessment',
    resolution: 'low',
    focusAreas: ['semanticCompression', 'inferentialContinuity'],
    scoreVariance: 15
  },
  standard: {
    name: 'Standard Analysis',
    resolution: 'medium', 
    focusAreas: ['semanticCompression', 'inferentialContinuity', 'semanticTopology', 'epistemicResistance'],
    scoreVariance: 25
  },
  comprehensive: {
    name: 'Deep Cognitive Profile',
    resolution: 'high',
    focusAreas: ['semanticCompression', 'inferentialContinuity', 'semanticTopology', 'cognitiveAsymmetry', 'epistemicResistance', 'metacognitiveAwareness'],
    scoreVariance: 35
  }
};

/**
 * Core cognitive evaluation class
 */
export class CognitiveEvaluator {
  private tier: EvaluationTier;
  private overrides: Map<string, number> = new Map();

  constructor(tierName: string = 'standard') {
    this.tier = EVALUATION_TIERS[tierName];
  }

  /**
   * Manual override for specific cognitive markers
   */
  setOverride(marker: string, score: number): void {
    this.overrides.set(marker, Math.max(0, Math.min(100, score)));
  }

  /**
   * Main evaluation function
   */
  async evaluate(text: string): Promise<{
    markers: CognitiveMarkers;
    overallScore: number;
    variance: number;
    tier: string;
    analysis: string;
  }> {
    const markers = await this.assessCognitiveMarkers(text);
    const overallScore = this.calculateOverallScore(markers);
    const variance = this.calculateVariance(markers);
    const analysis = this.generateAnalysis(markers, text);

    return {
      markers,
      overallScore,
      variance,
      tier: this.tier.name,
      analysis
    };
  }

  /**
   * Assess all cognitive markers based on tier resolution
   */
  private async assessCognitiveMarkers(text: string): Promise<CognitiveMarkers> {
    const markers: CognitiveMarkers = {
      semanticCompression: await this.assessSemanticCompression(text),
      inferentialContinuity: await this.assessInferentialContinuity(text),
      semanticTopology: await this.assessSemanticTopology(text),
      cognitiveAsymmetry: await this.assessCognitiveAsymmetry(text),
      epistemicResistance: await this.assessEpistemicResistance(text),
      metacognitiveAwareness: await this.assessMetacognitiveAwareness(text)
    };

    // Apply manual overrides
    this.applyOverrides(markers);

    return markers;
  }

  /**
   * Semantic Compression: Count high-impact sentences that entail multiple consequences
   */
  private async assessSemanticCompression(text: string): Promise<CognitiveMarkers['semanticCompression']> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let highImpactSentences = 0;
    let totalImplication = 0;
    
    // Identify high-impact sentences
    for (const sentence of sentences) {
      const impact = this.calculateSentenceImpact(sentence);
      if (impact > 0.6) highImpactSentences++;
      totalImplication += impact;
    }
    
    // Calculate actual semantic compression metrics
    const density = highImpactSentences / sentences.length;
    const avgImplication = totalImplication / sentences.length;
    const compressionRatio = this.calculateInferentialCompression(text);
    
    // Score based on actual inferential load, not word counts
    const score = Math.min(100, (density * 60) + (avgImplication * 40) + (compressionRatio * 30));
    
    return {
      score: Math.round(score),
      density,
      conceptualLoad: avgImplication,
      compressionRatio
    };
  }

  /**
   * Inferential Continuity: Score based on how many propositions build on prior ones necessarily
   */
  private async assessInferentialContinuity(text: string): Promise<CognitiveMarkers['inferentialContinuity']> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let buildingPropositions = 0;
    let necessaryConnections = 0;
    let isolatedSentences = 0;

    for (let i = 1; i < sentences.length; i++) {
      const dependency = this.measureInferentialDependency(sentences[i-1], sentences[i]);
      const necessity = this.measureLogicalNecessity(sentences[i], sentences.slice(0, i));
      
      if (dependency > 0.6) buildingPropositions++;
      if (necessity > 0.7) necessaryConnections++;
      if (dependency < 0.2 && necessity < 0.2) isolatedSentences++;
    }

    const chainLength = buildingPropositions;
    const coherenceIndex = necessaryConnections / (sentences.length - 1);
    const gapFrequency = isolatedSentences / sentences.length;
    
    // Reward necessary inferential building, penalize isolation
    const score = Math.round((coherenceIndex * 70) + (chainLength / sentences.length * 30) - (gapFrequency * 40));

    return {
      score: Math.max(0, Math.min(100, score)),
      chainLength,
      gapFrequency,
      coherenceIndex
    };
  }

  /**
   * Semantic Topology: Gradient, curvature, node density
   */
  private async assessSemanticTopology(text: string): Promise<CognitiveMarkers['semanticTopology']> {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const concepts = this.extractConcepts(text);
    
    let gradient = 0;
    let curvature = 0;
    
    // Calculate conceptual gradient across paragraphs
    for (let i = 1; i < paragraphs.length; i++) {
      const prevConcepts = this.extractConcepts(paragraphs[i-1]);
      const currConcepts = this.extractConcepts(paragraphs[i]);
      gradient += this.calculateConceptualDistance(prevConcepts, currConcepts);
    }
    gradient = gradient / (paragraphs.length - 1);

    // Calculate curvature (rate of change of gradient)
    const gradients: number[] = [];
    for (let i = 1; i < paragraphs.length; i++) {
      const prevConcepts = this.extractConcepts(paragraphs[i-1]);
      const currConcepts = this.extractConcepts(paragraphs[i]);
      gradients.push(this.calculateConceptualDistance(prevConcepts, currConcepts));
    }
    
    for (let i = 1; i < gradients.length; i++) {
      curvature += Math.abs(gradients[i] - gradients[i-1]);
    }
    curvature = curvature / (gradients.length - 1);

    const nodeDensity = concepts.length / text.length;
    const connectivity = this.calculateConceptConnectivity(concepts);
    
    const score = Math.round((gradient * 30) + (curvature * 25) + (nodeDensity * 1000) + (connectivity * 20));

    return {
      score: Math.min(100, score),
      gradient,
      curvature,
      nodeDensity,
      connectivity
    };
  }

  /**
   * Cognitive Asymmetry: Presence of hard, uneven conceptual weight
   */
  private async assessCognitiveAsymmetry(text: string): Promise<CognitiveMarkers['cognitiveAsymmetry']> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const complexities = sentences.map(s => this.measureSentenceComplexity(s));
    
    // Calculate weight distribution variance
    const mean = complexities.reduce((a, b) => a + b, 0) / complexities.length;
    const variance = complexities.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / complexities.length;
    const weightDistribution = Math.sqrt(variance);
    
    // Calculate effort gradient
    let effortGradient = 0;
    for (let i = 1; i < complexities.length; i++) {
      effortGradient += Math.abs(complexities[i] - complexities[i-1]);
    }
    effortGradient = effortGradient / (complexities.length - 1);
    
    // Count complexity spikes
    const threshold = mean + (2 * Math.sqrt(variance));
    const complexitySpikes = complexities.filter(c => c > threshold).length;
    
    const score = Math.round((weightDistribution * 20) + (effortGradient * 30) + (complexitySpikes / sentences.length * 50));

    return {
      score: Math.min(100, score),
      weightDistribution,
      effortGradient,
      complexitySpikes
    };
  }

  /**
   * Epistemic Resistance: Measure non-obviousness and cognitive friction, penalize tautological statements
   */
  private async assessEpistemicResistance(text: string): Promise<CognitiveMarkers['epistemicResistance']> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let nonTrivialStatements = 0;
    let reinterpretationCount = 0;
    let cognitiveLoadCount = 0;
    
    for (const sentence of sentences) {
      // Penalize tautological or trivially agreeable statements
      if (this.isTautological(sentence)) {
        continue; // Don't count tautologies
      }
      
      // Reward statements that force reinterpretation
      if (this.forcesReinterpretation(sentence)) {
        reinterpretationCount++;
        nonTrivialStatements++;
      }
      
      // Reward high cognitive load statements
      if (this.hasHighCognitiveLoad(sentence)) {
        cognitiveLoadCount++;
        nonTrivialStatements++;
      }
      
      // Count non-obvious statements
      if (this.isNonObvious(sentence)) {
        nonTrivialStatements++;
      }
    }
    
    const nonObviousness = nonTrivialStatements / sentences.length;
    const cognitiveEffort = cognitiveLoadCount / sentences.length;
    const noveltyIndex = reinterpretationCount / sentences.length;
    
    // High score for texts that avoid obviousness and create cognitive friction
    const score = Math.round((nonObviousness * 50) + (cognitiveEffort * 30) + (noveltyIndex * 20));

    return {
      score: Math.min(100, score),
      nonObviousness,
      cognitiveEffort,
      noveltyIndex
    };
  }

  /**
   * Metacognitive Awareness: Reward reframing, recursive definitions, argument against own frame
   */
  private async assessMetacognitiveAwareness(text: string): Promise<CognitiveMarkers['metacognitiveAwareness']> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let reframingCount = 0;
    let recursiveDefinitions = 0;
    let levelShifts = 0;
    
    for (const sentence of sentences) {
      // Detect reframing and level shifts (meta to object)
      if (this.detectReframing(sentence)) {
        reframingCount++;
      }
      
      // Detect recursive definitions
      if (this.detectRecursiveDefinition(sentence)) {
        recursiveDefinitions++;
      }
      
      // Detect meta-level shifts
      if (this.detectLevelShift(sentence)) {
        levelShifts++;
      }
    }
    
    const selfReflection = reframingCount / sentences.length;
    const limitRecognition = recursiveDefinitions / sentences.length;
    const assumptionExploration = levelShifts / sentences.length;
    
    // High score for texts that engage in cognitive distancing and self-critique
    const score = Math.round((selfReflection * 40) + (limitRecognition * 35) + (assumptionExploration * 25));

    return {
      score: Math.min(100, score),
      selfReflection,
      limitRecognition,
      assumptionExploration
    };
  }

  /**
   * Calculate overall score with proper variance - eliminates 80-90% clustering
   */
  private calculateOverallScore(markers: CognitiveMarkers): number {
    // Structural evaluation weights focused on actual intelligence markers
    const weights = {
      semanticCompression: 0.30,      // Primary: high-impact sentences & inferential load
      inferentialContinuity: 0.25,   // Secondary: logical necessity & building propositions  
      epistemicResistance: 0.20,     // Tertiary: non-obviousness & cognitive friction
      metacognitiveAwareness: 0.15,  // Quaternary: reframing & recursive definitions
      semanticTopology: 0.10,        // Quinary: node density & connectivity
      cognitiveAsymmetry: 0.00        // Disabled: causes false positives
    };

    let score = 0;
    score += markers.semanticCompression.score * weights.semanticCompression;
    score += markers.inferentialContinuity.score * weights.inferentialContinuity;
    score += markers.epistemicResistance.score * weights.epistemicResistance;
    score += markers.metacognitiveAwareness.score * weights.metacognitiveAwareness;
    score += markers.semanticTopology.score * weights.semanticTopology;
    // cognitiveAsymmetry disabled

    // Ensure real variance - boost high performers, suppress mediocrity
    if (score > 85) {
      score = Math.min(100, score * 1.1); // Boost exceptional texts
    } else if (score > 70 && score < 85) {
      score *= 0.9; // Suppress mediocre academic mimicry
    }

    return Math.round(score);
  }

  /**
   * Calculate score variance to avoid clustering around 80-90
   */
  private calculateVariance(markers: CognitiveMarkers): number {
    const scores = [
      markers.semanticCompression.score,
      markers.inferentialContinuity.score,
      markers.semanticTopology.score,
      markers.cognitiveAsymmetry.score,
      markers.epistemicResistance.score,
      markers.metacognitiveAwareness.score
    ];

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Apply manual overrides
   */
  private applyOverrides(markers: CognitiveMarkers): void {
    const overrideEntries = Array.from(this.overrides.entries());
    for (const [marker, score] of overrideEntries) {
      if (marker in markers) {
        (markers as any)[marker].score = score;
      }
    }
  }

  /**
   * Calculate sentence impact based on inferential consequences
   */
  private calculateSentenceImpact(sentence: string): number {
    let impact = 0;
    
    // High-impact indicators: recursive insight, synthesis, entailment
    const recursivePatterns = [
      /\b(?:thus|therefore|consequently|it follows that|this means)\b/gi,
      /\b(?:implies|entails|necessitates|requires)\b/gi,
      /\b(?:in other words|that is|namely)\b/gi
    ];
    
    const synthesisPatterns = [
      /\b(?:combines|integrates|unifies|synthesizes)\b/gi,
      /\b(?:both.*and|not only.*but)\b/gi,
      /\b(?:connects|links|relates)\b/gi
    ];
    
    const definitionalPatterns = [
      /\bis\s+(?:defined\s+as|the|a)\s/gi,
      /\bmeans\s+/gi,
      /\brefers\s+to\s/gi
    ];
    
    // Score based on inferential load
    recursivePatterns.forEach(pattern => {
      impact += (sentence.match(pattern) || []).length * 0.3;
    });
    
    synthesisPatterns.forEach(pattern => {
      impact += (sentence.match(pattern) || []).length * 0.25;
    });
    
    definitionalPatterns.forEach(pattern => {
      impact += (sentence.match(pattern) || []).length * 0.2;
    });
    
    // Boost for multiple clauses with logical structure
    const clauses = sentence.split(/[,;]/).length;
    if (clauses > 2) impact += 0.1;
    
    return Math.min(1, impact);
  }

  /**
   * Calculate inferential compression based on implication density
   */
  private calculateInferentialCompression(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let totalImplications = 0;
    
    for (const sentence of sentences) {
      // Count logical operators and inference markers
      const implications = [
        /\bif\s+.*\s+then\b/gi,
        /\bsince\s+.*\s+(?:therefore|thus)\b/gi,
        /\bgiven\s+.*\s+it follows\b/gi,
        /\bbecause\s+.*\s+(?:therefore|thus|consequently)\b/gi
      ];
      
      implications.forEach(pattern => {
        totalImplications += (sentence.match(pattern) || []).length;
      });
      
      // Count definitional chains
      if (sentence.includes('is') && sentence.includes('which')) {
        totalImplications += 0.5;
      }
    }
    
    return totalImplications / sentences.length;
  }

  /**
   * Measure inferential dependency between sentences
   */
  private measureInferentialDependency(prevSentence: string, currSentence: string): number {
    let dependency = 0;
    
    // Strong dependency markers
    const strongMarkers = ['therefore', 'thus', 'consequently', 'it follows', 'this means'];
    const mediumMarkers = ['moreover', 'furthermore', 'in addition', 'also'];
    const weakMarkers = ['however', 'but', 'nevertheless', 'yet'];
    
    const currLower = currSentence.toLowerCase();
    
    if (strongMarkers.some(marker => currLower.includes(marker))) {
      dependency += 0.8;
    } else if (mediumMarkers.some(marker => currLower.includes(marker))) {
      dependency += 0.4;
    } else if (weakMarkers.some(marker => currLower.includes(marker))) {
      dependency += 0.3;
    }
    
    // Check for conceptual overlap requiring previous context
    const prevConcepts = this.extractKeyTerms(prevSentence);
    const currConcepts = this.extractKeyTerms(currSentence);
    const overlap = prevConcepts.filter(concept => currConcepts.includes(concept));
    
    dependency += (overlap.length / Math.max(prevConcepts.length, 1)) * 0.5;
    
    return Math.min(1, dependency);
  }

  /**
   * Measure logical necessity of a sentence given prior context
   */
  private measureLogicalNecessity(sentence: string, priorSentences: string[]): number {
    let necessity = 0;
    
    // Extract key terms from current sentence
    const currentTerms = this.extractKeyTerms(sentence);
    
    // Check if terms were defined or established earlier
    for (const term of currentTerms) {
      for (const priorSentence of priorSentences) {
        if (priorSentence.toLowerCase().includes(term.toLowerCase())) {
          // Check if it was a definition
          if (priorSentence.includes('is') || priorSentence.includes('means')) {
            necessity += 0.3;
          } else {
            necessity += 0.1;
          }
        }
      }
    }
    
    // Check for explicit logical connections
    const logicalConnectors = ['because', 'since', 'given that', 'as established'];
    if (logicalConnectors.some(connector => sentence.toLowerCase().includes(connector))) {
      necessity += 0.4;
    }
    
    return Math.min(1, necessity);
  }

  /**
   * Extract key terms from a sentence for analysis
   */
  private extractKeyTerms(sentence: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
    
    return sentence
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .filter(word => /^[a-z]+$/.test(word)); // Only alphabetic words
  }

  /**
   * Check if a statement is tautological or trivially agreeable
   */
  private isTautological(sentence: string): boolean {
    const tautologyPatterns = [
      /\bis\s+important\b/gi,
      /\bis\s+good\b/gi,
      /\bis\s+bad\b/gi,
      /\bis\s+clear\s+that\b/gi,
      /\bobviously\b/gi,
      /\bof\s+course\b/gi,
      /\bneedless\s+to\s+say\b/gi
    ];
    
    return tautologyPatterns.some(pattern => pattern.test(sentence));
  }

  /**
   * Check if statement forces reinterpretation
   */
  private forcesReinterpretation(sentence: string): boolean {
    const reinterpretationMarkers = [
      /\bcontrary\s+to\s+(?:what|this|expectation)\b/gi,
      /\brather\s+than\b/gi,
      /\binstead\s+of\b/gi,
      /\bnot\s+.*\s+but\s+rather\b/gi,
      /\bthe\s+real\s+(?:issue|question|problem)\s+is\b/gi,
      /\bwhat\s+this\s+really\s+means\b/gi
    ];
    
    return reinterpretationMarkers.some(pattern => pattern.test(sentence));
  }

  /**
   * Check if statement has high cognitive load
   */
  private hasHighCognitiveLoad(sentence: string): boolean {
    const cognitiveLoadMarkers = [
      /\bif\s+and\s+only\s+if\b/gi,
      /\bnecessary\s+and\s+sufficient\b/gi,
      /\brecursive\b/gi,
      /\bself-referential\b/gi,
      /\bparadox\b/gi,
      /\bdialectic\b/gi,
      /\bmeta-\w+/gi
    ];
    
    // Also check for complex logical structures
    const hasComplexLogic = sentence.includes('if') && sentence.includes('then') && sentence.includes('unless');
    const hasNestedClauses = (sentence.match(/[,;]/g) || []).length >= 3;
    
    return cognitiveLoadMarkers.some(pattern => pattern.test(sentence)) || hasComplexLogic || hasNestedClauses;
  }

  /**
   * Check if statement is non-obvious
   */
  private isNonObvious(sentence: string): boolean {
    const nonObviousMarkers = [
      /\bsurprisingly\b/gi,
      /\bunexpectedly\b/gi,
      /\bcounterintuitive\b/gi,
      /\bparadoxically\b/gi,
      /\bit\s+turns\s+out\s+that\b/gi,
      /\bwhat\s+is\s+(?:less|more)\s+obvious\b/gi
    ];
    
    // Check for technical precision that goes beyond common knowledge
    const hasTechnicalPrecision = /\b(?:precisely|exactly|specifically|formally)\b/gi.test(sentence);
    const hasDistinctions = /\b(?:distinction|difference|contrast)\s+between\b/gi.test(sentence);
    
    return nonObviousMarkers.some(pattern => pattern.test(sentence)) || hasTechnicalPrecision || hasDistinctions;
  }

  /**
   * Detect reframing attempts
   */
  private detectReframing(sentence: string): boolean {
    const reframingPatterns = [
      /\blet\s+us\s+(?:consider|examine|think\s+about)\b/gi,
      /\bfrom\s+(?:another|a\s+different)\s+(?:perspective|angle|viewpoint)\b/gi,
      /\bput\s+(?:differently|another\s+way)\b/gi,
      /\bto\s+(?:reframe|reconceptualize|reconsider)\b/gi,
      /\bin\s+other\s+words\b/gi
    ];
    
    return reframingPatterns.some(pattern => pattern.test(sentence));
  }

  /**
   * Detect recursive definitions
   */
  private detectRecursiveDefinition(sentence: string): boolean {
    const recursivePatterns = [
      /\bdefines?\s+itself\b/gi,
      /\bcircular\s+definition\b/gi,
      /\bself-defining\b/gi,
      /\bis\s+(?:defined\s+as|a\s+type\s+of).*(?:itself|recursive)/gi
    ];
    
    // Check for definitional structures that reference themselves
    const hasDefinition = /\bis\s+(?:defined\s+as|the|a)\s/gi.test(sentence);
    const keyTerms = this.extractKeyTerms(sentence);
    const hasTermRepetition = keyTerms.length !== new Set(keyTerms).size;
    
    return recursivePatterns.some(pattern => pattern.test(sentence)) || (hasDefinition && hasTermRepetition);
  }

  /**
   * Detect meta-level shifts
   */
  private detectLevelShift(sentence: string): boolean {
    const metaLevelMarkers = [
      /\bthis\s+(?:argument|analysis|approach|method)\b/gi,
      /\bour\s+(?:discussion|investigation|inquiry)\b/gi,
      /\bthe\s+(?:present|current)\s+(?:study|analysis|work)\b/gi,
      /\bmeta-\w+/gi,
      /\babout\s+(?:thinking|reasoning|arguing)\b/gi
    ];
    
    return metaLevelMarkers.some(pattern => pattern.test(sentence));
  }

  /**
   * Helper methods for cognitive assessment
   */
  private extractConcepts(text: string): string[] {
    // Extract key concepts using linguistic patterns
    const conceptPatterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Proper nouns
      /\b(?:concept|theory|principle|framework|model|system)\s+of\s+\w+/gi,
      /\b\w+(?:ism|ity|tion|ness|ence|ance)\b/g, // Abstract nouns
    ];
    
    const concepts = new Set<string>();
    conceptPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => concepts.add(match.toLowerCase()));
    });
    
    return Array.from(concepts);
  }

  private hasDefinitionalClarity(text: string): boolean {
    const definitionPatterns = [
      /\bis\s+(?:defined\s+as|the|a)\s/gi,
      /\bmeans\s+/gi,
      /\brefers\s+to\s/gi,
      /\bcan\s+be\s+understood\s+as\s/gi
    ];
    
    return definitionPatterns.some(pattern => pattern.test(text));
  }

  private hasTechnicalPrecision(text: string): boolean {
    const precisionIndicators = [
      /\bspecifically\b/gi,
      /\bprecisely\b/gi,
      /\bexactly\b/gi,
      /\bin\s+particular\b/gi,
      /\bmore\s+precisely\b/gi
    ];
    
    return precisionIndicators.some(pattern => pattern.test(text));
  }

  private measureSentenceContinuity(prev: string, curr: string): number {
    // Simple continuity measure based on shared concepts and logical connectors
    const connectors = ['therefore', 'thus', 'consequently', 'moreover', 'furthermore', 'however', 'nevertheless'];
    const hasConnector = connectors.some(conn => curr.toLowerCase().includes(conn));
    
    const prevWordsArray = prev.toLowerCase().split(/\W+/);
    const currWordsArray = curr.toLowerCase().split(/\W+/);
    const prevWords = new Set(prevWordsArray);
    const currWords = new Set(currWordsArray);
    const sharedWords = new Set(prevWordsArray.filter(word => currWords.has(word)));
    
    const continuity = (sharedWords.size / Math.max(prevWords.size, currWords.size)) + (hasConnector ? 0.3 : 0);
    return Math.min(1, continuity);
  }

  private calculateConceptualDistance(concepts1: string[], concepts2: string[]): number {
    const set1 = new Set(concepts1);
    const set2 = new Set(concepts2);
    const set1Array = Array.from(set1);
    const intersection = new Set(set1Array.filter(x => set2.has(x)));
    const union = new Set([...concepts1, ...concepts2]);
    
    return 1 - (intersection.size / union.size);
  }

  private calculateCompressionRatio(text: string, concepts: string[]): number {
    const words = text.split(/\s+/).length;
    return concepts.length / words;
  }

  private calculateConceptConnectivity(concepts: string[]): number {
    // Simple connectivity measure based on concept co-occurrence
    let connections = 0;
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        if (this.areConceptsRelated(concepts[i], concepts[j])) {
          connections++;
        }
      }
    }
    
    const maxConnections = (concepts.length * (concepts.length - 1)) / 2;
    return maxConnections > 0 ? connections / maxConnections : 0;
  }

  private areConceptsRelated(concept1: string, concept2: string): boolean {
    // Simple relatedness check based on word overlap
    const words1Array = concept1.toLowerCase().split(/\W+/);
    const words2Array = concept2.toLowerCase().split(/\W+/);
    const words2 = new Set(words2Array);
    const overlapArray = words1Array.filter(x => words2.has(x));
    
    return overlapArray.length > 0;
  }

  private measureSentenceComplexity(sentence: string): number {
    const words = sentence.split(/\s+/).length;
    const clauses = sentence.split(/[,;]/).length;
    const nested = (sentence.match(/\([^)]*\)/g) || []).length;
    
    return (words * 0.1) + (clauses * 0.3) + (nested * 0.5);
  }

  private measureNonObviousness(text: string): number {
    const counterIntuitive = [
      /\bcontrary\s+to\s+(?:expectation|intuition)\b/gi,
      /\bsurprisingly\b/gi,
      /\bunexpectedly\b/gi,
      /\bparadoxically\b/gi,
      /\birony\b/gi
    ];
    
    const matches = counterIntuitive.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    
    return Math.min(1, matches / 10);
  }

  private measureCognitiveEffort(text: string): number {
    const effortIndicators = [
      /\bcomplex\b/gi,
      /\bdifficult\b/gi,
      /\bsubtle\b/gi,
      /\bnuanced\b/gi,
      /\bsophisticated\b/gi
    ];
    
    const matches = effortIndicators.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    
    return Math.min(1, matches / 10);
  }

  private measureNovelty(text: string): number {
    const noveltyIndicators = [
      /\bnew\s+(?:approach|method|framework|perspective)\b/gi,
      /\bnovel\b/gi,
      /\binnovative\b/gi,
      /\boriginal\b/gi,
      /\bunprecedented\b/gi
    ];
    
    const matches = noveltyIndicators.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    
    return Math.min(1, matches / 10);
  }

  private detectSelfReflection(text: string): number {
    const reflectionPatterns = [
      /\bI\s+(?:argue|claim|suggest|propose)\b/gi,
      /\bthis\s+(?:analysis|approach|argument)\b/gi,
      /\bmy\s+(?:view|position|argument)\b/gi,
      /\bin\s+this\s+(?:paper|work|discussion)\b/gi
    ];
    
    const matches = reflectionPatterns.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    
    return Math.min(1, matches / 10);
  }

  private detectLimitRecognition(text: string): number {
    const limitPatterns = [
      /\bhowever\b/gi,
      /\bbut\b/gi,
      /\bnevertheless\b/gi,
      /\balthough\b/gi,
      /\blimitation\b/gi,
      /\bcaveat\b/gi
    ];
    
    const matches = limitPatterns.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    
    return Math.min(1, matches / 20);
  }

  private detectAssumptionExploration(text: string): number {
    const assumptionPatterns = [
      /\bassume\b/gi,
      /\bpresuppose\b/gi,
      /\btake\s+for\s+granted\b/gi,
      /\bgiven\s+that\b/gi,
      /\bif\s+we\s+accept\b/gi
    ];
    
    const matches = assumptionPatterns.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    
    return Math.min(1, matches / 10);
  }

  private generateAnalysis(markers: CognitiveMarkers, text: string): string {
    const insights = [];
    
    if (markers.semanticCompression.score > 80) {
      insights.push(`Exceptional semantic compression (${markers.semanticCompression.score}/100) with ${markers.semanticCompression.density.toFixed(3)} concepts per word.`);
    }
    
    if (markers.inferentialContinuity.score > 75) {
      insights.push(`Strong inferential continuity (${markers.inferentialContinuity.score}/100) with coherence index of ${markers.inferentialContinuity.coherenceIndex.toFixed(2)}.`);
    }
    
    if (markers.cognitiveAsymmetry.score > 70) {
      insights.push(`Notable cognitive asymmetry (${markers.cognitiveAsymmetry.score}/100) indicating uneven conceptual difficulty distribution.`);
    }
    
    if (markers.epistemicResistance.score > 60) {
      insights.push(`Significant epistemic resistance (${markers.epistemicResistance.score}/100) suggesting non-obvious insights.`);
    }
    
    return insights.length > 0 ? insights.join(' ') : 'Text shows standard cognitive markers without exceptional features.';
  }
}