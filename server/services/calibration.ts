import fs from 'fs';
import path from 'path';
import { extractTextFromFile } from '../api/documentParser';
import { evaluateIntelligence } from './openai';
import { DocumentInput } from '../../client/src/lib/types';

// Sample documents for calibration with expected scores
interface CalibrationSample {
  name: string;
  filePath: string;
  expectedScore: number;
  reason: string;
}

// These are the calibration samples with expected scores based on the image provided
const calibrationSamples: CalibrationSample[] = [
  {
    name: "AI-Written Personal Identity Text",
    filePath: "attached_assets/AI Text.docx",
    expectedScore: 40,
    reason: "Vacuous, superficial; shows low intelligence."
  },
  {
    name: "Numbers as Ordered Pairs",
    filePath: "attached_assets/Numbers as Ordered Pairs.docx",
    expectedScore: 97,
    reason: "Abstract compression of advanced logical issues; almost pure model of cognitive strength."
  },
  {
    name: "Reverse Brain Engineering",
    filePath: "attached_assets/reverse brain engineering ideas.docx",
    expectedScore: 95,
    reason: "Sophisticated theory-formation, empirical philosophical strategy; strong blueprint mind."
  },
  {
    name: "Pragmatism Paper (Metaphysics posing as Epistemology)",
    filePath: "attached_assets/Pragmatism Paper Metaphysics Posing as Epistemology.docx",
    expectedScore: 95,
    reason: "High inferential layering, critique of pragmatism's core; very high intellectual profile."
  }
];

/**
 * Test the intelligence evaluation on the calibration samples
 */
export async function testCalibrationSamples(): Promise<{
  sample: string;
  actualScore: number;
  expectedScore: number;
  difference: number;
  evaluation: any;
}[]> {
  console.log("Starting calibration test...");
  const results = [];

  for (const sample of calibrationSamples) {
    console.log(`Testing sample: ${sample.name}`);
    try {
      // Read the file content
      const filePath = path.resolve(sample.filePath);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        continue;
      }

      // Convert the file content to a text string
      const fileBuffer = fs.readFileSync(filePath);
      const mockFile = {
        buffer: fileBuffer,
        originalname: path.basename(filePath),
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      } as Express.Multer.File;

      const documentInput = await extractTextFromFile(mockFile);
      
      // Evaluate the document
      const evaluation = await evaluateIntelligence(documentInput.content);
      
      // Get the actual score and compare with expected
      const actualScore = evaluation.overallScore;
      const difference = actualScore - sample.expectedScore;
      
      results.push({
        sample: sample.name,
        actualScore,
        expectedScore: sample.expectedScore,
        difference,
        evaluation
      });
      
      console.log(`${sample.name}: Expected ${sample.expectedScore}, Actual ${actualScore}, Diff ${difference}`);
    } catch (error) {
      console.error(`Error testing calibration sample ${sample.name}:`, error);
    }
  }
  
  console.log("Calibration test complete");
  return results;
}

/**
 * Adjust the scoring algorithm based on calibration results
 * @returns Adjustment factors for scoring algorithm
 */
export function calculateScoringAdjustments(calibrationResults: any[]): {
  surfaceWeight: number;
  deepWeight: number;
  baselineAdjustment: number;
} {
  // Default weights
  let surfaceWeight = 0.4;
  let deepWeight = 0.6;
  let baselineAdjustment = 0;

  // If we have calibration results, use them to adjust weights
  if (calibrationResults.length > 0) {
    // Calculate average error
    const avgError = calibrationResults.reduce((sum, result) => 
      sum + Math.abs(result.difference), 0) / calibrationResults.length;
    
    // Calculate error direction (are we scoring too high or too low?)
    const avgDirection = calibrationResults.reduce((sum, result) => 
      sum + result.difference, 0) / calibrationResults.length;
    
    // Fine-tune weights based on calibration results
    if (Math.abs(avgDirection) > 5) {
      // If our scores are too high on average, decrease weights
      // If too low, increase weights
      baselineAdjustment = -avgDirection;
      
      // Adjust the weights to emphasize deeper analysis for better differentiation
      if (avgError > 10) {
        // If error is large, shift slightly more weight to deep analysis
        surfaceWeight = Math.max(0.3, Math.min(0.5, surfaceWeight - 0.05));
        deepWeight = 1 - surfaceWeight;
      }
    }
  }
  
  return { surfaceWeight, deepWeight, baselineAdjustment };
}