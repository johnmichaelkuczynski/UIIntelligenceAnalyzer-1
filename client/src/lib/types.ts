export interface DocumentInput {
  content: string;
  filename?: string;
  mimeType?: string;
}

export type AnalysisMode = 'single' | 'compare';

export type DimensionRating = 'Strong' | 'Moderate' | 'Weak';

export interface AnalysisDimension {
  name: string;
  rating: DimensionRating;
  description: string;
  quote: string;
}

export interface DocumentAnalysis {
  summary: string;
  overallScore: number;
  overallAssessment: string;
  dimensions: {
    definitionCoherence: AnalysisDimension;
    claimFormation: AnalysisDimension;
    inferentialContinuity: AnalysisDimension;
    semanticLoad: AnalysisDimension;
    jargonDetection: AnalysisDimension;
    surfaceComplexity: AnalysisDimension;
    deepComplexity: AnalysisDimension;
  };
  aiDetection?: {
    isAI: boolean;
    probability: number;
  };
}

export interface DocumentComparison {
  documentA: {
    score: number;
    strengths: string[];
    style: string[];
  };
  documentB: {
    score: number;
    strengths: string[];
    style: string[];
  };
  comparisonTable: {
    dimension: string;
    documentA: DimensionRating;
    documentB: DimensionRating;
  }[];
  finalJudgment: string;
}

export interface AIDetectionResult {
  isAI: boolean;
  probability: number;
}
