import { perform4PhaseEvaluation } from './fourPhaseEvaluation';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

interface RewriteResult {
  originalText: string;
  rewrittenText: string;
  originalScore: number;
  rewrittenScore: number;
  improvementScore: number;
  rewriteReasoning: string;
}

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Call the appropriate LLM for rewriting
 */
async function callRewriteLLM(provider: LLMProvider, prompt: string): Promise<string> {
  switch (provider) {
    case "openai":
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      });
      return openaiResponse.choices[0]?.message?.content || "";

    case "anthropic":
      const anthropicResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      });
      return anthropicResponse.content[0]?.type === 'text' ? anthropicResponse.content[0].text : "";

    case "deepseek":
      const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      });
      const deepseekData: any = await deepseekResponse.json();
      return deepseekData.choices?.[0]?.message?.content || "";

    case "perplexity":
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      });
      const perplexityData: any = await perplexityResponse.json();
      return perplexityData.choices?.[0]?.message?.content || "";

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Perform intelligent rewrite using the 4-phase evaluation protocol
 */
export async function performIntelligentRewrite(
  originalText: string,
  customInstructions: string = "",
  provider: LLMProvider = "deepseek"
): Promise<RewriteResult> {
  console.log(`Starting intelligent rewrite with ${provider}`);

  // Step 1: Evaluate original text using 4-phase protocol
  console.log("Evaluating original text...");
  const originalEvaluation = await perform4PhaseEvaluation(originalText, provider);
  console.log(`Original text score: ${originalEvaluation.finalScore}/100`);

  // Step 2: Create rewrite prompt based on conditions
  const defaultInstructions = `REWRITE IN SUCH A WAY THAT (A) THE REWRITE SCORES SIGNIFICANTLY HIGHER RELATIVE TO THE OPERATIVE INTELLIGENCE EVALUATION PROTOCOL WHILE (B) PRESERVING EXISTING CONTENT AS MUCH AS CONDITION (A) ALLOWS.

CONDITION A MEANS: RIGHTSIZE THE PASSAGE WITH RESPECT TO THE OPERATIVE EVALUATION LOGIC.
CONDITION B MEANS: IF YOU CAN RIGHTSIZE THE PASSAGE WITHOUT CHANGING THE CONTENT, THEN DO THAT; AND IF YOU HAVE TO CHANGE OR SUPPLEMENT THE PASSAGE TO GET THE REWRITE TO BE ON THE RIGHT SIZE OF THE EVALUATION LOGIC, THEN MAKE THOSE CHANGES--AS LONG AS THEY DO NOT TOTALLY ALTER THE MEANING OF THE PASSAGE.`;

  const instructions = customInstructions.trim() 
    ? `${defaultInstructions}

ADDITIONAL CUSTOM INSTRUCTIONS: ${customInstructions}

If it is difficult to both follow the custom instructions and fulfill Conditions A and B, weight the custom instructions more heavily, but try to strike a balance.`
    : defaultInstructions;

  const rewritePrompt = `You are tasked with rewriting the following text according to specific instructions. The rewrite will be evaluated using a rigorous 4-phase intelligence evaluation protocol that assesses:

- Insightfulness and fresh perspectives
- Point development and hierarchical organization  
- Skillful use of logic and reasoning
- Organic, natural flow of ideas
- Opening new domains of inquiry
- Authentic intelligence vs. presumed intelligence
- Complex, coherent internal logic
- Strong conceptual governance
- System-level control over ideas
- Direct, non-evasive writing
- Clear, unambiguous statements
- Development based on logical entailment rather than citation chains

The evaluation protocol uses these standards:
- 95-100/100: Unignorable insight. Either genius or so correct it breaks scales.
- 80-94/100: Strong but with friction (e.g., clumsy expression, minor gaps).
- <80/100: Degrees of mediocrity or failure.

The current text scored ${originalEvaluation.finalScore}/100. Your goal is to significantly improve this score.

INSTRUCTIONS:
${instructions}

ORIGINAL TEXT:
${originalText}

Provide your rewrite below. Focus on maximizing the intelligence evaluation criteria while following the specified conditions.`;

  // Step 3: Generate rewrite
  console.log("Generating rewrite...");
  const rewrittenText = await callRewriteLLM(provider, rewritePrompt);

  // Step 4: Evaluate rewritten text using 4-phase protocol
  console.log("Evaluating rewritten text...");
  const rewrittenEvaluation = await perform4PhaseEvaluation(rewrittenText, provider);
  console.log(`Rewritten text score: ${rewrittenEvaluation.finalScore}/100`);

  // Step 5: Generate improvement analysis
  const improvementScore = rewrittenEvaluation.finalScore - originalEvaluation.finalScore;
  
  const reasoningPrompt = `Analyze the rewrite improvement:

ORIGINAL TEXT (${originalEvaluation.finalScore}/100):
${originalText}

REWRITTEN TEXT (${rewrittenEvaluation.finalScore}/100):
${rewrittenText}

IMPROVEMENT: ${improvementScore > 0 ? '+' : ''}${improvementScore} points

Explain:
1. What specific changes were made to improve the intelligence evaluation score?
2. How did the rewrite address the key evaluation criteria (insight, development, logic, etc.)?
3. What content was preserved vs. what was changed and why?
4. How does the rewrite score higher on the 4-phase protocol?

Provide a concise analysis of the improvement strategy.`;

  const rewriteReasoning = await callRewriteLLM(provider, reasoningPrompt);

  return {
    originalText,
    rewrittenText,
    originalScore: originalEvaluation.finalScore,
    rewrittenScore: rewrittenEvaluation.finalScore,
    improvementScore,
    rewriteReasoning
  };
}