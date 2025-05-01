import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { llmRouter } from "./llmRouter";

// Initialize Anthropic client if API key is present
const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY || 'key-not-set'
});

// Initialize OpenAI with a fallback for missing API key
// The API key can be provided later through environment variables
let openai: OpenAI;

try {
  openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY || 'key-not-set'
  });
} catch (error) {
  console.error("OpenAI initialization error:", error);
}

/**
 * Calculate the Levenshtein distance between two strings
 * This measures the minimum number of single-character edits required to change one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize the first row and column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate the similarity percentage between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 100 (identical)
 */
export function calculateSimilarityPercentage(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Performs a sanity check to verify the rewritten text doesn't degrade the quality of the original
 * Evaluates various dimensions like semantic density, logical structure, and definitional clarity
 */
/**
 * Performs stringent quality verification to ensure the rewritten text preserves or enhances
 * the semantic compression, definitional clarity, and logical structure of the original text.
 * REJECTS any rewrite that degrades semantic density or definitional precision.
 */
async function performRewriteSanityCheck(originalText: string, rewrittenText: string): Promise<boolean> {
  try {
    // Basic checks first - reject obviously bad rewrites
    
    // STRICT LENGTH CHECK: Reject if rewrite is longer at all - absolutely no bloat allowed
    if (rewrittenText.length > originalText.length * 1.005) { // Reduced from 1.02 to 1.005 (0.5% tolerance)
      console.warn("SANITY CHECK FAILED: Rewrite is longer than original - no bloat permitted");
      return false;
    }
    
    // Check for academic verbosity patterns - automatic rejection for these
    const academicVerbosityPatterns = [
      "it is important to note that",
      "it should be noted that",
      "it is worth mentioning that", 
      "it is interesting to observe",
      "it can be observed that",
      "as previously mentioned",
      "as stated earlier",
      "furthermore",
      "moreover",
      "additionally",
      "consequently",
      "subsequently",
      "nevertheless",
      "notwithstanding",
      "hence"
    ];
    
    // Reject if any academic verbosity patterns were added that weren't in the original
    for (const pattern of academicVerbosityPatterns) {
      if (!originalText.toLowerCase().includes(pattern.toLowerCase()) && 
          rewrittenText.toLowerCase().includes(pattern.toLowerCase())) {
        console.warn(`SANITY CHECK FAILED: Added academic verbosity pattern "${pattern}"`);
        return false;
      }
    }
    
    // Reject if rewrite has significantly more commas (indicator of clause complexity)
    const originalCommaCount = (originalText.match(/,/g) || []).length;
    const rewriteCommaCount = (rewrittenText.match(/,/g) || []).length;
    if (rewriteCommaCount > originalCommaCount * 1.2) { // 20% more commas is suspicious
      console.warn(`SANITY CHECK FAILED: Rewrite has ${rewriteCommaCount} commas vs original ${originalCommaCount} - likely increased clause complexity`);
      return false;
    }
    
    // Simple degradation patterns check - immediate rejection for clear violations
    // MASSIVELY EXPANDED pattern set to catch even subtle degradations
    const degradationPatterns = [
      // Simple verb padding (critical violations)
      { original: "is", rewrite: "equates to" },
      { original: "is", rewrite: "serves as" },
      { original: "is", rewrite: "functions as" },
      { original: "is", rewrite: "represents" },
      { original: "is", rewrite: "constitutes" },
      { original: "is", rewrite: "can be considered" },
      { original: "is", rewrite: "may be viewed as" },
      { original: "is", rewrite: "is defined as" },
      { original: "is", rewrite: "is characterized as" },
      { original: "is", rewrite: "is understood to be" },
      { original: "is", rewrite: "is recognized as" },
      { original: "is", rewrite: "manifests as" },
      
      // Wordiness expansions
      { original: "when", rewrite: "arises when" },
      { original: "when", rewrite: "in cases where" },
      { original: "when", rewrite: "in situations where" },
      { original: "when", rewrite: "at times when" },
      { original: "when", rewrite: "during periods when" },
      { original: "when", rewrite: "in instances where" },
      
      // Category bloat
      { original: "are", rewrite: "can be categorized as" },
      { original: "are", rewrite: "may be classified as" },
      { original: "are", rewrite: "can be understood as" },
      { original: "are", rewrite: "might be considered as" },
      { original: "are", rewrite: "function primarily as" },
      
      // Definition inflation
      { original: "means", rewrite: "signifies" },
      { original: "means", rewrite: "indicates" },
      { original: "means", rewrite: "denotes" },
      { original: "means", rewrite: "connotes" },
      { original: "means", rewrite: "implies" },
      { original: "means", rewrite: "suggests" },
      { original: "means", rewrite: "represents" },
      
      // Verb complexity
      { original: "uses", rewrite: "utilizes" },
      { original: "uses", rewrite: "employs" },
      { original: "uses", rewrite: "leverages" },
      { original: "uses", rewrite: "makes use of" },
      { original: "uses", rewrite: "takes advantage of" },
      { original: "use", rewrite: "employ" },
      { original: "use", rewrite: "utilize" },
      { original: "use", rewrite: "make use of" },
      
      // Demonstration bloat
      { original: "shows", rewrite: "demonstrates" },
      { original: "shows", rewrite: "illustrates" },
      { original: "shows", rewrite: "indicates" },
      { original: "shows", rewrite: "reveals" },
      { original: "shows", rewrite: "makes evident" },
      { original: "shows", rewrite: "serves to demonstrate" },
      
      // Assistance complexity
      { original: "helps", rewrite: "facilitates" },
      { original: "helps", rewrite: "enables" },
      { original: "helps", rewrite: "assists in" },
      { original: "helps", rewrite: "contributes to" },
      { original: "helps", rewrite: "plays a role in" },
      { original: "helps", rewrite: "aids in the process of" },
      
      // Preposition complexity
      { original: "about", rewrite: "regarding" },
      { original: "about", rewrite: "concerning" },
      { original: "about", rewrite: "in relation to" },
      { original: "about", rewrite: "with respect to" },
      { original: "about", rewrite: "pertaining to" },
      
      // Example complexity
      { original: "like", rewrite: "such as" },
      { original: "like", rewrite: "for example" },
      { original: "like", rewrite: "for instance" },
      { original: "like", rewrite: "similar to" },
      { original: "like", rewrite: "comparable to" },
      
      // Necessity complexity
      { original: "need", rewrite: "require" },
      { original: "need", rewrite: "necessitate" },
      { original: "need", rewrite: "have a requirement for" },
      { original: "need", rewrite: "depend upon" },
      
      // Creation complexity
      { original: "make", rewrite: "construct" },
      { original: "make", rewrite: "create" },
      { original: "make", rewrite: "formulate" },
      { original: "make", rewrite: "develop" },
      { original: "make", rewrite: "generate" },
      { original: "make", rewrite: "produce" },
      
      // Additional common transformations
      { original: "if", rewrite: "in the event that" },
      { original: "if", rewrite: "under circumstances where" },
      { original: "if", rewrite: "assuming that" },
      { original: "if", rewrite: "on the condition that" },
      
      { original: "gets", rewrite: "acquires" },
      { original: "gets", rewrite: "obtains" },
      { original: "gets", rewrite: "procures" },
      
      { original: "has", rewrite: "possesses" },
      { original: "has", rewrite: "maintains" },
      { original: "has", rewrite: "is characterized by" },
      
      { original: "lets", rewrite: "enables" },
      { original: "lets", rewrite: "permits" },
      { original: "lets", rewrite: "facilitates" },
      
      { original: "seems", rewrite: "appears to be" },
      { original: "seems", rewrite: "gives the impression of" },
      { original: "seems", rewrite: "is perceived as" }
    ];
    
    // Check if simple modifications that reduce precision were made
    let foundDegradation = false;
    let degradationExample = "";
    for (const pattern of degradationPatterns) {
      // Use regex to find whole word matches only
      const originalRegex = new RegExp(`\\b${pattern.original}\\b`, 'g');
      const rewriteRegex = new RegExp(`\\b${pattern.rewrite}\\b`, 'g');
      
      // If the original used the simple form and the rewrite replaced it with the complex form
      if (originalText.match(originalRegex) && 
          !originalText.match(rewriteRegex) && 
          rewrittenText.match(rewriteRegex)) {
        foundDegradation = true;
        degradationExample = `Original used "${pattern.original}" but rewrite replaced with "${pattern.rewrite}"`;
        break;
      }
    }
    
    if (foundDegradation) {
      console.warn(`SANITY CHECK FAILED: Degradation pattern detected. ${degradationExample}`);
      return false;
    }
    
    // Limit input size for the AI check
    const maxChars = 2500;
    const truncatedOriginal = originalText.length > maxChars ? originalText.substring(0, maxChars) : originalText;
    const truncatedRewrite = rewrittenText.length > maxChars ? rewrittenText.substring(0, maxChars) : rewrittenText;
    
    // Get API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is missing for sanity check");
      return originalText === rewrittenText; // If no changes were made, accept it
    }
    
    // Ensure OpenAI instance is properly initialized
    if (!openai || openai.apiKey === 'key-not-set') {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    // Check if we're using multi-model approach with Anthropic
    const useMultiModel = !!process.env.ANTHROPIC_API_KEY;
    if (useMultiModel) {
      console.log("Using multi-model enhanced sanity check with OpenAI and Anthropic Claude.");
    } else {
      console.log("Using OpenAI-only sanity check. For better results, add ANTHROPIC_API_KEY.");
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are SIGMA (Semantic Intelligence Grading and Measurement Analyzer), a stringent quality control system that detects ANY deterioration in semantic compression between versions of text.

PRIMARY MISSION: Detect and reject ANY decrease in semantic compression ratio or definitional clarity, with ZERO TOLERANCE for verbosity increases.

EVALUATION HIERARCHY (WEIGHTED METRICS):
1. SEMANTIC COMPRESSION RATIO (70%): Information divided by word count - THE CRITICAL METRIC
2. DEFINITIONAL PRECISION (25%): Clarity and specificity of key concepts - ESSENTIAL
3. LOGICAL FLOW (5%): Inferential necessity between adjacent claims - SECONDARY CONCERN

ABSOLUTE REJECTION RULES (ZERO EXCEPTIONS):
- ANY decrease in semantic compression ratio (even slight)
- ANY transformation of "X is Y" into longer formulations
- ANY addition of academic padding words (even a single instance)
- ANY increase in sentence complexity without proportional information gain
- ANY decrease in definitional precision
- ANY addition of transition phrases or linking words 
- ANY shift from direct to indirect language

COMPREHENSIVE DEGRADATION PATTERNS TO DETECT:
- Critical: "X is Y" → ANY longer version ("equates to", "serves as", "functions as", etc.)
- Critical: "When X" → ANY longer version ("in situations where", "in cases where", etc.)
- Critical: Addition of ANY academic padding ("moreover", "furthermore", "consequently")
- Critical: Plain verbs → fancy synonyms ("use" → "utilize", "show" → "demonstrate")
- Critical: Simple prepositions → complex phrases ("about" → "regarding", "with" → "by means of")
- Critical: Replacing concrete language with abstractions
- Critical: Making terse, clear sentences into elaborate explanations

SPECIAL DIDACTIC TEXT PROTECTION:
Texts with high didactic value that use precise operational definitions MUST be preserved exactly as written. These texts are especially sensitive to verbosity damage. Even minor "improvements" often degrade their intelligence value.

When evaluating, examine EACH SENTENCE for information density. Even a SINGLE instance of reduced semantic compression is grounds for rejection. Be EXCEEDINGLY STRICT - better to reject a rewrite than to allow ANY quality degradation.

Respond with a JSON object that looks EXACTLY like this:
{
  "semanticCompression": {
    "originalScore": <1-10>,
    "rewriteScore": <1-10>,
    "preserved": <true|false>,
    "reason": "<explanation focusing on info-per-word ratio>"
  },
  "definitionalClarity": {
    "originalScore": <1-10>,
    "rewriteScore": <1-10>,
    "preserved": <true|false>,
    "reason": "<explanation focusing on concept definition precision>"
  },
  "logicalStructure": {
    "originalScore": <1-10>,
    "rewriteScore": <1-10>,
    "preserved": <true|false>,
    "reason": "<explanation focusing on inference quality>"
  },
  "overallVerdict": <true if quality preserved/improved, false if degraded>,
  "explanation": "<brief explanation of verdict>"
}`
        },
        {
          role: "user",
          content: `ORIGINAL TEXT:
${truncatedOriginal}

REWRITTEN TEXT:
${truncatedRewrite}

Evaluate whether the rewrite preserves or improves the cognitive qualities of the original text with specific attention to semantic compression (meaning-per-word ratio).`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more consistent evaluation
    });
    
    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Log detailed evaluation results
      console.log("OpenAI rewrite quality evaluation:", JSON.stringify(result, null, 2));
      
      // Get a second opinion from Claude if available for high-quality texts
      let claudeVerdict = { 
        semanticCompression: { preserved: true },
        definitionalClarity: { preserved: true }
      };
      
      if (useMultiModel && result.semanticCompression?.originalScore >= 7) {
        try {
          console.log("Getting second opinion from Claude for high-quality text...");
          const claudeResponse = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
            max_tokens: 1000,
            system: `You are a critical evaluator specialized in detecting ANY deterioration in semantic density or logical structure in rewritten text.
            
            MISSION: Evaluate whether a rewrite preserves or improves the semantic compression ratio, definitional clarity, and logical structure of the original text.
            
            FOCUS SPECIFICALLY ON:
            1. Semantic Compression: Information-per-word ratio (HIGHEST PRIORITY)
            2. Definitional Precision: Clarity and specificity of concept definitions
            
            When evaluating, be EXTREMELY STRICT. For high-level philosophical or theoretical texts, even minor degradations in semantic density are unacceptable.
            
            Respond with a JSON object containing only two fields:
            {
              "semanticCompressionPreserved": true|false,
              "definitionalClarityPreserved": true|false
            }`,
            messages: [
              {
                role: "user",
                content: `ORIGINAL TEXT:
              ${truncatedOriginal}
              
              REWRITTEN TEXT:
              ${truncatedRewrite}
              
              Evaluate whether the rewrite preserves or improves the semantic compression ratio and definitional clarity of the original text. Respond with JSON.`
              }
            ],
            temperature: 0.2,
          });
          
          // Extract text from Claude response safely
          const firstContent = claudeResponse.content[0];
          if (firstContent && 'type' in firstContent && firstContent.type === 'text' && 'text' in firstContent) {
            claudeVerdict = JSON.parse(firstContent.text);
            console.log("Claude second opinion received:", claudeVerdict);
          }
        } catch (claudeError) {
          console.warn("Claude evaluation failed, continuing with OpenAI only:", claudeError);
        }
      }
      
      // Check individual dimensions with stricter semantic compression requirement
      const semanticCompressionPreserved = result.semanticCompression?.preserved === true &&
                                          (useMultiModel ? claudeVerdict.semanticCompression?.preserved !== false : true);
      
      const semanticCompressionImproved = semanticCompressionPreserved && 
                                          result.semanticCompression?.rewriteScore > 
                                          result.semanticCompression?.originalScore;
      
      const definitionalClarityPreserved = result.definitionalClarity?.preserved === true &&
                                         (useMultiModel ? claudeVerdict.definitionalClarity?.preserved !== false : true);
      
      const logicalStructurePreserved = result.logicalStructure?.preserved === true;
      
      // Only accept if ALL dimensions are preserved AND semantic compression is maintained or improved
      // Both models must agree on preservation for enhanced reliability
      const verdict = semanticCompressionPreserved && 
                     definitionalClarityPreserved && 
                     logicalStructurePreserved &&
                     result.overallVerdict === true;
      
      // EXTREME ENFORCEMENT: If semantic compression is even slightly worse, automatic rejection
      if (!semanticCompressionPreserved) {
        console.warn("SANITY CHECK FAILED: Semantic compression degraded - absolute dealbreaker");
        return false;
      }
      
      // STRICT IMPROVEMENT REQUIREMENT: If original scores are already high (7+ on semantic compression), 
      // rewrite MUST improve or be rejected. Lowered threshold from 8 to 7 to capture more high-quality texts.
      if (result.semanticCompression?.originalScore >= 7 && !semanticCompressionImproved) {
        console.warn("SANITY CHECK FAILED: Original has high semantic compression (7+) but rewrite didn't improve it");
        return false;
      }
      
      // DIDACTIC TEXT PROTECTION: Special protection for educational texts with clear definitions
      // If original has high definitional clarity, rewrite must improve this specific dimension
      if (result.definitionalClarity?.originalScore >= 8 && 
          result.definitionalClarity?.rewriteScore <= result.definitionalClarity?.originalScore) {
        console.warn("SANITY CHECK FAILED: Original has excellent definitional clarity (8+) but rewrite didn't improve it");
        return false;
      }
      
      // ENFORCE MINIMUM IMPROVEMENT: Reject marginal improvements as not worth the risk
      // If rewrite only slightly improves semantic compression, reject it to be safe
      if (semanticCompressionImproved && 
          result.semanticCompression?.rewriteScore <= result.semanticCompression?.originalScore + 0.5) {
        console.warn("SANITY CHECK FAILED: Improvement in semantic compression too minimal to justify risk");
        return false;
      }
      
      // If we've passed all the strict checks, apply the final verdict
      return verdict;
      
    } catch (error) {
      console.error("Error parsing sanity check response:", error);
      // Default to REJECTING the rewrite if parsing fails - safer
      return false;
    }
    
  } catch (error) {
    console.error("Error in rewrite sanity check:", error);
    // Default to REJECTING the rewrite if check fails - safer
    return false;
  }
}

/**
 * Rewrite text to enhance intelligence without dumbing down or bloating
 * Adheres to strict rules for maintaining or increasing conceptual depth
 */
export async function rewriteText(
  originalText: string,
  instruction: string,
  preserveLength: boolean = true,
  preserveDepth: boolean = true
): Promise<{
  rewrittenText: string;
  stats: {
    originalLength: number;
    rewrittenLength: number;
    lengthChange: number;
    instructionFollowed: string;
  };
}> {
  // Check if API key is available for at least one of our AI providers
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for rewriting text");
  }
  
  // Ensure OpenAI instance is properly initialized (fallback only)
  if (!openai || openai.apiKey === 'key-not-set') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  try {
    console.log(`Rewriting text of length ${originalText.length} with instruction: ${instruction}`);
    
    // Use the multi-model LLM router for optimal rewriting
    // This leverages Claude's structural rewriting abilities when available
    // and GPT-4o's semantic compression capabilities
    const result = await llmRouter.rewriteText(
      originalText,
      instruction,
      preserveLength
    );
    
    // Calculate similarity percentage between original and rewritten text
    const similarityPercentage = calculateSimilarityPercentage(originalText, result.rewrittenText);
    console.log(`Similarity between original and rewritten text: ${similarityPercentage}%`);
    
    // Reject if the rewritten text is too similar to the original (implement strict check)
    const MAX_ALLOWED_SIMILARITY = 95; // 95% similarity threshold - configurable
    
    if (similarityPercentage > MAX_ALLOWED_SIMILARITY) {
      console.log(`REWRITE REJECTED: Output is ${similarityPercentage}% similar to input (threshold: ${MAX_ALLOWED_SIMILARITY}%)`);
      
      return {
        rewrittenText: originalText, // Return original text
        stats: {
          originalLength: originalText.length,
          rewrittenLength: originalText.length,
          lengthChange: 0,
          instructionFollowed: instruction + ` [REWRITE REJECTED: Output is ${similarityPercentage}% similar to input. This does not qualify as a valid rewrite. Please attempt a substantive rearticulation.]`
        }
      };
    }
    
    // Perform sanity check on the rewritten text
    const sanityCheckPassed = await performRewriteSanityCheck(originalText, result.rewrittenText);
    
    if (!sanityCheckPassed) {
      console.log("Sanity check failed - rewrite may have degraded the text quality");
      
      // Return a message explaining the issue instead of the rewrite
      return {
        rewrittenText: originalText,  // Return original to avoid quality degradation
        stats: {
          originalLength: originalText.length,
          rewrittenLength: originalText.length,
          lengthChange: 0,
          instructionFollowed: instruction + " [REWRITE REJECTED: Quality degradation detected. The original text appears to have high semantic density and logical structure that would not be improved by rewriting.]"
        }
      };
    }

    return {
      rewrittenText: result.rewrittenText,
      stats: {
        originalLength: result.stats.originalLength,
        rewrittenLength: result.stats.rewrittenLength,
        lengthChange: result.stats.lengthChange,
        instructionFollowed: instruction + (result.stats.instructionFollowed ? ` (${result.stats.instructionFollowed})` : "")
      }
    };
  } catch (error: any) {
    console.error("Error rewriting text:", error);
    throw new Error(`Failed to rewrite text: ${error.message || 'Unknown error'}`);
  }
}