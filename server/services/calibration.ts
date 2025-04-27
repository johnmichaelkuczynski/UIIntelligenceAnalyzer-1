import fs from 'fs';
import path from 'path';
import { evaluateIntelligence } from './openai';

interface CalibrationSample {
  name: string;
  filePath: string;
  expectedScore: number;
  reason: string;
  sampleText: string; // Sample text for testing
}

// Define calibration samples with expected intelligence scores
const calibrationSamples: CalibrationSample[] = [
  {
    name: "Philosophical Analysis (High)",
    filePath: "../attached_assets/Numbers as Ordered Pairs.docx",
    expectedScore: 92,
    reason: "Deep conceptual analysis with exceptional inferential continuity and semantic compression",
    sampleText: `Numbers as Ordered Pairs
A number of analyses of numbers have been offered. For example, Frege took numbers to be extensions of concepts. This analysis, however, has the disadvantage of leaving numbers vulnerable to Russell's paradox. Other analyses include the set-theoretic approaches of Russell, Zermelo, and Von Neumann. On these approaches, each natural number is identified with a particular set. These analyses are prima facie incompatible with each other, given that Kn≠Kpn, for n>0. In the present paper it is shown that these analyses are in fact compatible.
Let us say that a system is a set S, together with a designated 0 element and a successor function. We assume the Peano Postulates, though of course we don't need the Postulate which identifies the numbers with a specific series of sets.`
  },
  {
    name: "Pragmatism Paper (High)",
    filePath: "../attached_assets/Pragmatism Paper Metaphysics Posing as Epistemology.docx",
    expectedScore: 94,
    reason: "Strong philosophical reasoning, exceptional arguments, high semantic load",
    sampleText: `Metaphysics Posing as Epistemology: The Central Defect in Pragmatism
Pragmatism as a philosophical approach contains an unresolved tension between its epistemological claims and its metaphysical commitments. While ostensibly offering a theory of knowledge that privileges practical consequences over abstract truth, pragmatism subtly transforms epistemological claims into metaphysical assertions about the nature of reality itself. This paper argues that this conversion—from claims about how we know to claims about what exists—constitutes the central defect in pragmatist philosophy.
The Peircean formulation that we should consider the "practical bearings" of our conceptions neglects the possibility that practical bearings themselves can only be identified relative to pre-existing theoretical frameworks. The application of practical consequences as a criterion for meaning presupposes a framework for determining what constitutes a "practical consequence" in the first place.`
  },
  {
    name: "AI-Generated Text (Low)",
    filePath: "../attached_assets/AI Text.docx",
    expectedScore: 42,
    reason: "Generic content with low semantic density, poor inferential continuity",
    sampleText: `Artificial intelligence (AI) has become an increasingly important topic in today's technological landscape. It refers to the simulation of human intelligence in machines that are programmed to think and learn like humans. The concept of AI encompasses various technologies such as machine learning, natural language processing, and computer vision.
In recent years, AI has made significant advancements and is now integrated into many aspects of our daily lives. From virtual assistants like Siri and Alexa to recommendation systems on streaming platforms, AI is continuously shaping how we interact with technology. These systems analyze vast amounts of data to recognize patterns and make predictions, which allows them to provide personalized experiences and improve over time.`
  },
  {
    name: "Brain Engineering Ideas (High)",
    filePath: "../attached_assets/reverse brain engineering ideas.docx",
    expectedScore: 94,
    reason: "Deep conceptual analysis with exceptional innovation and semantic density",
    sampleText: `Reverse Brain Engineering: Reconstructing Cognitive Architectures Through Functional Decomposition
The cerebral cortex's information processing mechanisms exhibit a striking efficiency in parallel computation that remains inaccessible to our current computational architectures. This paper presents a novel framework for reverse-engineering these cognitive mechanisms through a methodical functional decomposition approach. By treating cognitive capacities as emergent properties arising from the interaction of specialized subsystems, we can systematically map the functional architecture without necessitating complete neurophysiological understanding at the outset.
The standard approach to understanding brain function has typically followed bottom-up trajectories, beginning with molecular and cellular properties and attempting to extrapolate to higher cognitive functions. I propose instead a top-down functional decomposition method that identifies cognitive invariants – computational primitives that appear consistently across different cognitive domains and species. These invariants represent fundamental processing capabilities that have been evolutionarily conserved due to their computational efficiency.`
  }
];

/**
 * Test the intelligence evaluation on the calibration samples
 */
export async function testCalibrationSamples(): Promise<{
  results: Array<{
    sample: string;
    expectedScore: number;
    actualScore: number;
    difference: number;
    evaluation: any;
  }>;
  summary: {
    averageDifference: number;
    adjustments: Record<string, number>;
  };
}> {
  console.log("Starting calibration tests...");
  const results = [];
  let totalDifference = 0;

  // Test each calibration sample
  for (const sample of calibrationSamples) {
    try {
      console.log(`Testing sample: ${sample.name}`);
      
      // Instead of trying to read files which is problematic in this environment,
      // we'll use the sample text we've included directly in our sample objects
      console.log(`Testing calibration for sample: ${sample.name}`);
      
      // Use the sample text we've included with each calibration sample
      const content = sample.sampleText;
      
      // Evaluate intelligence using OpenAI
      const evaluation = await evaluateIntelligence(content);
      
      // Calculate difference between expected and actual score
      const difference = sample.expectedScore - evaluation.overallScore;
      totalDifference += Math.abs(difference);
      
      // Add result
      results.push({
        sample: sample.name,
        expectedScore: sample.expectedScore,
        actualScore: evaluation.overallScore,
        difference,
        evaluation
      });
    } catch (error: any) {
      console.error(`Error testing sample ${sample.name}:`, error);
      results.push({
        sample: sample.name,
        expectedScore: sample.expectedScore,
        actualScore: 0,
        difference: -sample.expectedScore,
        evaluation: { error: error.message || 'Unknown error' }
      });
      totalDifference += Math.abs(sample.expectedScore);
    }
  }

  // Calculate average difference
  const averageDifference = totalDifference / calibrationSamples.length;
  
  // Calculate adjustments based on results
  const adjustments = calculateScoringAdjustments(results);
  
  return {
    results,
    summary: {
      averageDifference,
      adjustments
    }
  };
}

/**
 * Adjust the scoring algorithm based on calibration results
 * @returns Adjustment factors for scoring algorithm
 */
export function calculateScoringAdjustments(calibrationResults: any[]): {
  surfaceWeight: number;
  deepWeight: number;
  lowScoreAdjustment: number;
  highScoreAdjustment: number;
} {
  // Default weights and adjustments
  let surfaceWeight = 0.35; // 35% weight for surface analysis
  let deepWeight = 0.65;    // 65% weight for deep semantic analysis
  let lowScoreAdjustment = 0.0;  // Adjustment factor for scores below 50
  let highScoreAdjustment = 0.0; // Adjustment factor for scores above 80
  
  // Analyze the calibration results to determine if adjustments are needed
  if (calibrationResults.length > 0) {
    const highSamples = calibrationResults.filter(r => r.expectedScore >= 80);
    const lowSamples = calibrationResults.filter(r => r.expectedScore <= 50);
    
    // Check if high-quality samples are consistently underscored
    if (highSamples.length > 0) {
      const highScoreAvgDiff = highSamples.reduce((sum, r) => sum + r.difference, 0) / highSamples.length;
      if (highScoreAvgDiff > 5) {
        // If high samples are underscored, increase the deep analysis weight
        highScoreAdjustment = Math.min(highScoreAvgDiff / 20, 0.1);  // Max 10% adjustment
        deepWeight = Math.min(deepWeight + 0.05, 0.75);  // Max 75% weight for deep analysis
      }
    }
    
    // Check if low-quality samples are consistently overscored
    if (lowSamples.length > 0) {
      const lowScoreAvgDiff = lowSamples.reduce((sum, r) => sum + r.difference, 0) / lowSamples.length;
      if (lowScoreAvgDiff < -5) {
        // If low samples are overscored, increase penalty for low semantic scores
        lowScoreAdjustment = Math.min(Math.abs(lowScoreAvgDiff) / 20, 0.1);  // Max 10% adjustment
      }
    }
  }
  
  return {
    surfaceWeight,
    deepWeight,
    lowScoreAdjustment,
    highScoreAdjustment
  };
}