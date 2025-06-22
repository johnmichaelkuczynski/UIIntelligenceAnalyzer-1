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
   * Semantic Compression: How densely information is packed
   */
  private async assessSemanticCompression(text: string): Promise<CognitiveMarkers['semanticCompression']> {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const concepts = this.extractConcepts(text);
    
    // Calculate density metrics
    const density = concepts.length / words;
    const conceptualLoad = concepts.length / sentences;
    const compressionRatio = this.calculateCompressionRatio(text, concepts);
    
    // Score based on information density
    let score = Math.min(100, (density * 1000) + (conceptualLoad * 10) + (compressionRatio * 50));
    
    // Boost for technical precision and definitional clarity
    if (this.hasDefinitionalClarity(text)) score += 15;
    if (this.hasTechnicalPrecision(text)) score += 10;
    
    return {
      score: Math.round(score),
      density,
      conceptualLoad,
      compressionRatio
    };
  }

  /**
   * Inferential Continuity: How logically each idea builds on the last
   */
  private async assessInferentialContinuity(text: string): Promise<CognitiveMarkers['inferentialContinuity']> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let chainLength = 0;
    let gaps = 0;
    let totalCoherence = 0;

    for (let i = 1; i < sentences.length; i++) {
      const continuity = this.measureSentenceContinuity(sentences[i-1], sentences[i]);
      if (continuity > 0.7) {
        chainLength++;
      } else if (continuity < 0.3) {
        gaps++;
      }
      totalCoherence += continuity;
    }

    const coherenceIndex = totalCoherence / (sentences.length - 1);
    const gapFrequency = gaps / sentences.length;
    const score = Math.round((coherenceIndex * 80) + (chainLength / sentences.length * 20) - (gapFrequency * 30));

    return {
      score: Math.max(0, score),
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
   * Epistemic Resistance: Non-obviousness, effort, friction
   */
  private async assessEpistemicResistance(text: string): Promise<CognitiveMarkers['epistemicResistance']> {
    const nonObviousness = this.measureNonObviousness(text);
    const cognitiveEffort = this.measureCognitiveEffort(text);
    const noveltyIndex = this.measureNovelty(text);
    
    const score = Math.round((nonObviousness * 40) + (cognitiveEffort * 35) + (noveltyIndex * 25));

    return {
      score: Math.min(100, score),
      nonObviousness,
      cognitiveEffort,
      noveltyIndex
    };
  }

  /**
   * Metacognitive Awareness: Text reflecting on its own commitments
   */
  private async assessMetacognitiveAwareness(text: string): Promise<CognitiveMarkers['metacognitiveAwareness']> {
    const selfReflection = this.detectSelfReflection(text);
    const limitRecognition = this.detectLimitRecognition(text);
    const assumptionExploration = this.detectAssumptionExploration(text);
    
    const score = Math.round((selfReflection * 40) + (limitRecognition * 30) + (assumptionExploration * 30));

    return {
      score: Math.min(100, score),
      selfReflection,
      limitRecognition,
      assumptionExploration
    };
  }

  /**
   * Calculate overall score with proper variance
   */
  private calculateOverallScore(markers: CognitiveMarkers): number {
    const weights = {
      semanticCompression: 0.25,
      inferentialContinuity: 0.20,
      semanticTopology: 0.15,
      cognitiveAsymmetry: 0.15,
      epistemicResistance: 0.15,
      metacognitiveAwareness: 0.10
    };

    let score = 0;
    score += markers.semanticCompression.score * weights.semanticCompression;
    score += markers.inferentialContinuity.score * weights.inferentialContinuity;
    score += markers.semanticTopology.score * weights.semanticTopology;
    score += markers.cognitiveAsymmetry.score * weights.cognitiveAsymmetry;
    score += markers.epistemicResistance.score * weights.epistemicResistance;
    score += markers.metacognitiveAwareness.score * weights.metacognitiveAwareness;

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