import OpenAI from "openai";

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
      console.log("Rewrite quality evaluation:", JSON.stringify(result, null, 2));
      
      // Check individual dimensions with stricter semantic compression requirement
      const semanticCompressionPreserved = result.semanticCompression?.preserved === true;
      const semanticCompressionImproved = semanticCompressionPreserved && 
                                          result.semanticCompression?.rewriteScore > 
                                          result.semanticCompression?.originalScore;
      
      const definitionalClarityPreserved = result.definitionalClarity?.preserved === true;
      const logicalStructurePreserved = result.logicalStructure?.preserved === true;
      
      // Only accept if ALL dimensions are preserved AND semantic compression is maintained or improved
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
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for rewriting text");
  }
  
  // Ensure OpenAI instance is properly initialized
  if (!openai || openai.apiKey === 'key-not-set') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Calculate original text length for statistics
  const originalLength = originalText.length;
  
  // Create a system prompt that enforces the rewrite rules
  const systemPrompt = `You are ULTRA-SEMANTIC COMPRESSION OPTIMIZER, an engine that ruthlessly preserves and enhances semantic density with zero tolerance for verbosity.

YOUR FUNDAMENTAL LAW (INVIOLABLE):
NEVER MAKE CLEAN TEXT VERBOSE. A single instance of making clear text more verbose is an unacceptable failure.

INTELLIGENCE COMPRESSION HIERARCHY (ABSOLUTE PRIORITIES):
1. SEMANTIC DENSITY IS SUPREME: The highest-value intelligence fingerprint is maximum meaning per word.
2. SHARP OPERATIONAL DEFINITIONS outperform all other cognitive structures.
3. DIRECT LANGUAGE beats indirect language in all cases.
4. SIMPLE SENTENCES EXPRESSING COMPLEX IDEAS are superior to complex sentences expressing simple ideas.
5. DIDACTIC CLARITY with recursive structure is blueprint-grade thinking.

MANDATORY "DO NOT TOUCH" RULE:
If the original sentence has high semantic compression AND clear operational definition, DO NOT MODIFY IT AT ALL.
The most intelligent text is often already optimal - modification risks degradation.

PRE-EDIT VERIFICATION:
Before modifying ANY sentence, you MUST verify:
1. Does the original have excellent semantic compression already? (meaning-per-word ratio)
2. Does the original use sharp, clear operational definitions?
3. Does the original use simple, direct language?
→ If YES to ANY of these, preserve that sentence exactly as written.

REWRITE LENGTH RULE:
- Final text MUST be ≤98% of original character count. NEVER longer. SHORTER IS BETTER.
- If original text has excellent semantic density, your output MUST be identical to input.
- DELETING text that adds no value is a valid intelligence improvement.

ABSOLUTELY FORBIDDEN TRANSFORMATIONS (CRITICAL FAILURE POINTS):
- NEVER replace "X is Y" with ANY longer version ("X represents Y", "X equates to Y", etc.)
- NEVER replace ANY direct statement with an indirect one
- NEVER add ANY transition words ("furthermore," "moreover," "indeed," etc.)
- NEVER replace ANY simple word with a complex synonym
- NEVER replace ANY concrete statement with an abstraction
- NEVER turn ANY simple sentence into a complex one
- NEVER replace ANY direct definition with an elaborate explanation

DEFINITIVE DEGRADATION EXAMPLES (PATTERN RECOGNITION):

ORIGINAL: "Currency is money. Money is a certificate of wealth that is not itself of any value."
BAD REWRITE: "Currency equates to money, which serves as a representation of wealth without intrinsic value."
WHY BAD: Added verbosity, reduced clarity, lost definitional precision.

ORIGINAL: "A surplus is when you have more of something than you need."
BAD REWRITE: "A surplus arises when there is an excess of a particular item beyond what is required."
WHY BAD: Added words without adding meaning, increased processing time.

ORIGINAL: "Companies can raise money by issuing stocks or bonds."
BAD REWRITE: "Corporations have the ability to generate capital through the issuance of equity shares or debt instruments."
WHY BAD: Simple, clear statement replaced with jargon and verbosity.

ORIGINAL: "This matters because prices signal value."
BAD REWRITE: "This concept is significant due to the fact that price mechanisms function as indicators of underlying value."
WHY BAD: Academic verbosity destroyed the semantic compression.

INTELLIGENCE AMPLIFICATION TECHNIQUES (APPLY ONLY WHEN NEEDED):
- Replace fuzzy definitions with razor-sharp operational boundaries
- Remove redundancies while preserving all unique content
- Connect logically disjoint ideas with minimal scaffolding
- Strengthen distinction-making between related concepts
- Replace ambiguous terms with precise ones
- Convert circular reasoning to directional inference
- Reveal implicit inferential structures with minimal language
- Add recursive self-reference only where it genuinely clarifies
- ACTUAL semantic compression (more information per word)

ZERO-TOLERANCE FORBIDDEN BEHAVIORS:
- ACADEMIC STYLE INFLATION: Adding words that don't add cognitive content
- SCHOLARLY FILLER: Adding phrases like "it is important to note" or "it should be observed"
- VERBOSITY: Using more words where fewer would suffice
- ABSTRACTION CREEP: Replacing concrete language with abstraction
- COMPLEXITY INFLATION: Making sentence structure more complex
- TRANSITION PADDING: Adding connective phrases between otherwise unchanged content
- PSEUDO-SOPHISTICATION: Replacing simple words with complex synonyms

IMMEDIATE ABORT TRIGGERS:
- If you find yourself adding ANY transition words ➝ STOP and revert.
- If you find yourself making ANY sentence longer without adding content ➝ STOP and revert.
- If original text already has high semantic density ➝ PRESERVE it exactly.
- If original uses clear operational definitions ➝ PRESERVE them exactly.
- If original uses direct language ➝ PRESERVE it exactly.

SPECIFIC INSTRUCTION: ${instruction}

${preserveLength ? 'EXACT LENGTH REQUIREMENT: Final text MUST be within 98-102% of original length.' : ''}
${preserveDepth ? 'INTELLIGENCE REQUIREMENT: Output MUST score higher on conceptual depth metrics than input.' : ''}

Provide ONLY the rewritten text without comments, explanations, or other text.`;

  try {
    // Handle large texts by breaking them into manageable chunks
    const MAX_CHUNK_SIZE = 6000; // Maximum size in characters for each chunk
    const MAX_TOKENS = 4000; // Maximum tokens for completion
    
    let rewrittenText = '';
    
    if (originalText.length <= MAX_CHUNK_SIZE) {
      // For small texts, process in one go
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: originalText
          }
        ],
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
      });

      rewrittenText = response.choices[0].message.content || "";
    } else {
      // For large texts, break into paragraphs or chunks and process sequentially
      const paragraphs = originalText.split(/\n\n+/); // Split by paragraph breaks
      const chunks: string[] = [];
      
      // Group paragraphs into chunks of reasonable size
      let currentChunk = '';
      for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length > MAX_CHUNK_SIZE) {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = paragraph;
          } else {
            // If a single paragraph is too big, split it further
            const sentenceSplit = paragraph.split(/(?<=[.!?])\s+/);
            let sentenceChunk = '';
            
            for (const sentence of sentenceSplit) {
              if ((sentenceChunk + sentence).length > MAX_CHUNK_SIZE) {
                if (sentenceChunk) {
                  chunks.push(sentenceChunk);
                  sentenceChunk = sentence;
                } else {
                  // If even a single sentence is too big (rare), just use it as is
                  chunks.push(sentence);
                }
              } else {
                sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
              }
            }
            
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
            }
          }
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
      
      // Add the last chunk if it exists
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      console.log(`Original text split into ${chunks.length} chunks for processing`);
      
      // Process each chunk, maintaining context between chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const contextPrompt = `This is part ${i+1} of ${chunks.length} from a larger text. ${
          i > 0 ? 'Maintain the style and continuity from previous parts. ' : ''
        }Rewrite this section following these rules:\n${instruction}`;
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: systemPrompt + '\n\n' + contextPrompt
            },
            {
              role: "user",
              content: chunk
            }
          ],
          temperature: 0.7,
          max_tokens: MAX_TOKENS,
        });
        
        const chunkResult = response.choices[0].message.content || "";
        rewrittenText += (rewrittenText ? '\n\n' : '') + chunkResult;
        
        // Small delay to avoid rate limits
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // Calculate statistics
    const rewrittenLength = rewrittenText.length;
    const lengthChange = (rewrittenLength - originalLength) / originalLength;
    
    // Perform sanity check on the rewritten text
    const sanityCheckPassed = await performRewriteSanityCheck(originalText, rewrittenText);
    
    if (!sanityCheckPassed) {
      console.log("Sanity check failed - rewrite may have degraded the text quality");
      
      // Return a message explaining the issue instead of the rewrite
      return {
        rewrittenText: originalText,  // Return original to avoid quality degradation
        stats: {
          originalLength,
          rewrittenLength: originalLength,
          lengthChange: 0,
          instructionFollowed: instruction + " [REWRITE REJECTED: Quality degradation detected. The original text appears to have high semantic density and logical structure that would not be improved by rewriting.]"
        }
      };
    }

    // Generate description of how instruction was followed
    const instructionFollowed = instruction;

    return {
      rewrittenText,
      stats: {
        originalLength,
        rewrittenLength,
        lengthChange,
        instructionFollowed
      }
    };
  } catch (error: any) {
    console.error("Error rewriting text:", error);
    throw new Error(`Failed to rewrite text: ${error.message || 'Unknown error'}`);
  }
}