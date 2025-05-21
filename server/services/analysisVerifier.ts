import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import { directOpenAIAnalyze, directAnthropicAnalyze, directPerplexityAnalyze } from './directLLM';

// Initialize the API clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Constants
const MAX_RETRY_ATTEMPTS = 3;
const DELAY_BETWEEN_RETRIES = 2000; // milliseconds

/**
 * Utility function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract score from analysis text
 * @param text The analysis text
 * @returns The score or null if no score found
 */
function extractScore(text: string): number | null {
  // Try to find a score formatted as "Intelligence Score: XX/100"
  const scoreMatch = text.match(/Intelligence Score:\s*(\d+)\/100/i);
  if (scoreMatch && scoreMatch[1]) {
    return parseInt(scoreMatch[1], 10);
  }
  
  // Try to find other score formats
  const alternateScoreMatch = text.match(/score:?\s*(\d+)/i);
  if (alternateScoreMatch && alternateScoreMatch[1]) {
    return parseInt(alternateScoreMatch[1], 10);
  }
  
  return null;
}

/**
 * Check if the analysis contains grading language rather than pure assessment
 * @param text The analysis text
 * @returns True if grading language is detected
 */
function hasGradingLanguage(text: string): boolean {
  const gradingPhrases = [
    "would benefit from",
    "should include",
    "needs to",
    "lacks sufficient",
    "could improve",
    "recommend",
    "suggestion",
    "advice",
    "grade",
    "assignment",
    "paper",
    "essay",
    "writing style",
    "writing quality",
    "references needed",
    "citations"
  ];
  
  // Check for common grading phrases
  return gradingPhrases.some(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  );
}

/**
 * Check if the score is consistent with the qualitative analysis
 * @param text The analysis text
 * @param score The extracted score
 * @returns True if the score seems inconsistent with the analysis
 */
function hasScoreDiscrepancy(text: string, score: number | null): boolean {
  // If no score was found, consider it a discrepancy
  if (score === null) return true;
  
  // Extract positive and negative language from the text
  const positiveWords = [
    "intelligent",
    "sophisticated",
    "nuanced",
    "complex",
    "original",
    "insightful",
    "profound",
    "coherent",
    "logical",
    "rigorous",
    "precise",
    "clear",
    "analytical",
    "exceptional",
    "impressive",
    "strong",
    "excellent",
    "significant",
    "substantive",
    "elegant",
    "powerful",
    "adept",
    "astute",
    "cerebral",
    "erudite",
    "sagacious",
    "incisive",
    "perspicacious"
  ];
  
  const negativeWords = [
    "lacking",
    "limited",
    "simplistic",
    "confused",
    "unclear",
    "incoherent",
    "illogical",
    "superficial",
    "vague",
    "shallow",
    "poor",
    "weak",
    "basic",
    "derivative",
    "inconsistent"
  ];
  
  // Count positive and negative words
  const positiveCount = positiveWords.reduce((count, word) => {
    return count + (text.toLowerCase().match(new RegExp('\\b' + word + '\\b', 'g')) || []).length;
  }, 0);
  
  const negativeCount = negativeWords.reduce((count, word) => {
    return count + (text.toLowerCase().match(new RegExp('\\b' + word + '\\b', 'g')) || []).length;
  }, 0);
  
  // Calculate a sentiment ratio
  const totalWords = positiveCount + negativeCount;
  const positiveRatio = totalWords > 0 ? positiveCount / totalWords : 0.5;
  
  // If the score is high but the text is mostly negative
  if (score > 75 && positiveRatio < 0.4) {
    return true;
  }
  
  // If the score is low but the text is mostly positive
  if (score < 60 && positiveRatio > 0.65) {
    return true;
  }
  
  // If score is extremely high but positive language isn't overwhelming
  if (score > 90 && positiveRatio < 0.7) {
    return true;
  }
  
  return false;
}

/**
 * Generate feedback for reassessment based on detected issues
 * @param issues Object containing detected issues
 * @returns Feedback string for the AI
 */
function generateReassessmentFeedback(issues: { 
  hasGradingLanguage: boolean, 
  hasScoreDiscrepancy: boolean,
  noScore: boolean
}): string {
  const feedbacks = [];
  
  if (issues.noScore) {
    feedbacks.push("You didn't provide a numerical score out of 100 for the intelligence assessment. Please include an 'Intelligence Score: X/100' at the top of your response.");
  }
  
  if (issues.hasGradingLanguage) {
    feedbacks.push("Your analysis contains language that appears to be grading the text's quality rather than assessing the author's intelligence. Please focus exclusively on what the text reveals about the author's intelligence, not how the text itself could be improved.");
  }
  
  if (issues.hasScoreDiscrepancy) {
    feedbacks.push("There appears to be a discrepancy between your numerical score and your qualitative assessment. Please ensure your score accurately reflects your analysis of the author's intelligence.");
  }
  
  let feedback = "I need you to revise your assessment of the author's intelligence. ";
  feedback += feedbacks.join(" ");
  feedback += " Please provide a complete revised assessment addressing these issues.";
  
  return feedback;
}

/**
 * Verify and potentially request a reassessment from OpenAI
 * @param textToAnalyze The original text being analyzed
 * @param initialReport The initial analysis report
 * @returns A verified (potentially revised) analysis report
 */
async function verifyOpenAIAnalysis(textToAnalyze: string, initialReport: any): Promise<any> {
  let currentReport = initialReport;
  let attemptsRemaining = MAX_RETRY_ATTEMPTS;
  
  while (attemptsRemaining > 0) {
    const reportText = currentReport.formattedReport;
    const score = extractScore(reportText);
    
    // Check for issues
    const issues = {
      hasGradingLanguage: hasGradingLanguage(reportText),
      hasScoreDiscrepancy: hasScoreDiscrepancy(reportText, score),
      noScore: score === null
    };
    
    // If no issues, return the current report
    if (!issues.hasGradingLanguage && !issues.hasScoreDiscrepancy && !issues.noScore) {
      return currentReport;
    }
    
    // Generate feedback for reassessment
    const feedback = generateReassessmentFeedback(issues);
    
    try {
      console.log("Requesting reassessment from OpenAI due to issues in analysis...");
      
      // Request a reassessment - using more philosophical language for better analysis
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { 
            role: "system", 
            content: "You are a highly intelligent, philosophically rigorous reader with expertise in cognitive science, philosophy of mind, and analytic philosophy. Your task is to assess what the following text reveals about its author's intelligence, particularly their conceptual sophistication, logical coherence, and originality of thought. Provide a careful evaluation focusing solely on the cognitive abilities displayed in the writing. Include a numerical Intelligence Score between 0-100 that accurately reflects your assessment." 
          },
          { role: "user", content: textToAnalyze },
          { role: "assistant", content: reportText },
          { role: "user", content: feedback }
        ],
        temperature: 0.1
      });
      
      // Update current report with the reassessment
      currentReport = {
        provider: "OpenAI (GPT-4o)",
        formattedReport: response.choices[0].message.content || "No analysis available."
      };
      
      attemptsRemaining--;
      
      // If this was the last attempt, return what we have
      if (attemptsRemaining === 0) {
        return currentReport;
      }
      
      // Wait before trying again
      await delay(DELAY_BETWEEN_RETRIES);
      
    } catch (error) {
      console.error("Error requesting OpenAI reassessment:", error);
      return currentReport; // Return the last successful report if there's an error
    }
  }
  
  return currentReport;
}

/**
 * Verify and potentially request a reassessment from Anthropic
 * @param textToAnalyze The original text being analyzed
 * @param initialReport The initial analysis report
 * @returns A verified (potentially revised) analysis report
 */
async function verifyAnthropicAnalysis(textToAnalyze: string, initialReport: any): Promise<any> {
  let currentReport = initialReport;
  let attemptsRemaining = MAX_RETRY_ATTEMPTS;
  
  while (attemptsRemaining > 0) {
    const reportText = currentReport.formattedReport;
    const score = extractScore(reportText);
    
    // Check for issues
    const issues = {
      hasGradingLanguage: hasGradingLanguage(reportText),
      hasScoreDiscrepancy: hasScoreDiscrepancy(reportText, score),
      noScore: score === null
    };
    
    // If no issues, return the current report
    if (!issues.hasGradingLanguage && !issues.hasScoreDiscrepancy && !issues.noScore) {
      return currentReport;
    }
    
    // Generate feedback for reassessment
    const feedback = generateReassessmentFeedback(issues);
    
    try {
      console.log("Requesting reassessment from Anthropic due to issues in analysis...");
      
      // Request a reassessment
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        max_tokens: 4000,
        messages: [
          { role: "user", content: textToAnalyze },
          { role: "assistant", content: reportText },
          { role: "user", content: feedback }
        ]
      });
      
      // Update current report with the reassessment
      if (response.content && response.content[0] && 'text' in response.content[0]) {
        currentReport = {
          provider: "Anthropic (Claude 3 Sonnet)",
          formattedReport: response.content[0].text
        };
      }
      
      attemptsRemaining--;
      
      // If this was the last attempt, return what we have
      if (attemptsRemaining === 0) {
        return currentReport;
      }
      
      // Wait before trying again
      await delay(DELAY_BETWEEN_RETRIES);
      
    } catch (error) {
      console.error("Error requesting Anthropic reassessment:", error);
      return currentReport; // Return the last successful report if there's an error
    }
  }
  
  return currentReport;
}

/**
 * Verify and potentially request a reassessment from Perplexity
 * @param textToAnalyze The original text being analyzed
 * @param initialReport The initial analysis report
 * @returns A verified (potentially revised) analysis report
 */
async function verifyPerplexityAnalysis(textToAnalyze: string, initialReport: any): Promise<any> {
  let currentReport = initialReport;
  let attemptsRemaining = MAX_RETRY_ATTEMPTS;
  
  while (attemptsRemaining > 0) {
    const reportText = currentReport.formattedReport;
    const score = extractScore(reportText);
    
    // Check for issues
    const issues = {
      hasGradingLanguage: hasGradingLanguage(reportText),
      hasScoreDiscrepancy: hasScoreDiscrepancy(reportText, score),
      noScore: score === null
    };
    
    // If no issues, return the current report
    if (!issues.hasGradingLanguage && !issues.hasScoreDiscrepancy && !issues.noScore) {
      return currentReport;
    }
    
    // Generate feedback for reassessment
    const feedback = generateReassessmentFeedback(issues);
    
    try {
      console.log("Requesting reassessment from Perplexity due to issues in analysis...");
      
      // Request a reassessment
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "user", content: textToAnalyze },
            { role: "assistant", content: reportText },
            { role: "user", content: feedback }
          ],
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      
      // Update current report with the reassessment
      currentReport = {
        provider: "Perplexity (LLaMA 3.1)",
        formattedReport: data.choices[0].message.content
      };
      
      attemptsRemaining--;
      
      // If this was the last attempt, return what we have
      if (attemptsRemaining === 0) {
        return currentReport;
      }
      
      // Wait before trying again
      await delay(DELAY_BETWEEN_RETRIES);
      
    } catch (error) {
      console.error("Error requesting Perplexity reassessment:", error);
      return currentReport; // Return the last successful report if there's an error
    }
  }
  
  return currentReport;
}

/**
 * Analyze a text with all three AI providers, verifying and refining each assessment
 * @param textToAnalyze The text to analyze
 * @returns Object containing verified analyses from all three providers
 */
export async function analyzeWithAllProviders(textToAnalyze: string): Promise<any[]> {
  const results = [];
  
  try {
    // OpenAI Analysis
    console.log("Requesting initial OpenAI analysis...");
    const openaiInitialReport = await directOpenAIAnalyze(textToAnalyze);
    console.log("Verifying OpenAI analysis...");
    const openaiVerifiedReport = await verifyOpenAIAnalysis(textToAnalyze, openaiInitialReport);
    results.push(openaiVerifiedReport);
    
    // Anthropic Analysis
    console.log("Requesting initial Anthropic analysis...");
    const anthropicInitialReport = await directAnthropicAnalyze(textToAnalyze);
    console.log("Verifying Anthropic analysis...");
    const anthropicVerifiedReport = await verifyAnthropicAnalysis(textToAnalyze, anthropicInitialReport);
    results.push(anthropicVerifiedReport);
    
    // Perplexity Analysis
    console.log("Requesting initial Perplexity analysis...");
    const perplexityInitialReport = await directPerplexityAnalyze(textToAnalyze);
    console.log("Verifying Perplexity analysis...");
    const perplexityVerifiedReport = await verifyPerplexityAnalysis(textToAnalyze, perplexityInitialReport);
    results.push(perplexityVerifiedReport);
    
  } catch (error) {
    console.error("Error in analyzeWithAllProviders:", error);
  }
  
  return results;
}