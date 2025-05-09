export interface DocumentInput {
  content: string;
  filename?: string;
  mimeType?: string;
  metadata?: {
    pageCount?: number;
    info?: Record<string, any>;
    version?: string;
    [key: string]: any;
  };
}

export type AnalysisMode = 'single' | 'compare';

// Rewrite related types
export interface RewriteOptions {
  instruction: string; // User's specific instruction for the rewrite
  preserveLength?: boolean; // Keep within 100-110% of original length
  preserveDepth?: boolean; // Maintain or increase conceptual depth
}

export interface RewriteRequest {
  originalText: string;
  options: RewriteOptions;
  provider?: string;
}

export interface RewriteResult {
  originalText: string;
  rewrittenText: string;
  stats: {
    originalLength: number;
    rewrittenLength: number;
    lengthChange: number; // Percentage change
    instructionFollowed: string; // Description of how the instruction was applied
  };
}

export type DimensionRating = 'Exceptional' | 'Very Strong' | 'Strong' | 'Moderate' | 'Basic' | 'Weak' | 'Very Weak' | 'Critically Deficient';

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

export interface ShareViaEmailRequest {
  recipientEmail: string;
  senderEmail?: string;
  senderName?: string;
  subject: string;
  documentType: 'single' | 'comparison' | 'rewrite';
  analysisA: DocumentAnalysis;
  analysisB?: DocumentAnalysis;
  comparison?: DocumentComparison;
  rewrittenAnalysis?: DocumentAnalysis;
}

// Translation related types
export interface TranslationOptions {
  sourceLanguage: string;
  targetLanguage: string;
  model?: string;
  useDeepL?: boolean;
}

export interface TranslationProgress {
  currentChunk: number;
  totalChunks: number;
  status: 'processing' | 'completed' | 'failed';
  translatedContent?: string;
  error?: string;
}

export interface TranslationResult {
  success: boolean;
  translatedContent: string;
  error?: string;
}

export interface TranslationRequest {
  content: string;
  filename?: string;
  options: TranslationOptions;
  provider?: string;
}
