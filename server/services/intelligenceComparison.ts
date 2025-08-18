import { parseCleanIntelligenceResponse, CleanAnalysis } from './cleanResponseParser';

type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

// Frontend expects DocumentAnalysis structure
interface DocumentAnalysis {
  id: number;
  documentId: number;
  provider: string;
  formattedReport: string;
  overallScore: number;
  surface: {
    grammar: number;
    structure: number;
    jargonUsage: number;
    surfaceFluency: number;
  };
  deep: {
    score: number;
  };
}

interface DocumentComparison {
  winnerDocument: 'A' | 'B';
  summary: string;
  detailedAnalysis: string;
}

export interface IntelligenceComparisonResult {
  analysisA: DocumentAnalysis;
  analysisB: DocumentAnalysis;
  comparison: DocumentComparison;
}

const INTELLIGENCE_COMPARISON_PROMPT = `INTELLIGENCE ASSESSMENT COMPARISON

You are comparing the intelligence levels demonstrated by two different authors based on their writing samples. Your task is to assess the cognitive capacity of each author and determine which demonstrates superior intellectual capability.

SCORING INTERPRETATION:
- Score represents percentile ranking: how many people out of 100 the author outperforms intellectually
- 96-98/100: Doctoral-level theoretical work, systematic framework construction
- 90-95/100: Advanced academic analysis with original insights
- 80-89/100: Competent scholarly work within established boundaries
- 70-79/100: Basic academic competence without depth
- 40-69/100: Average to below-average cognitive demonstration
- 30-39/100: Pseudo-intellectual simulation without substance

For each document, provide a clear intelligence assessment using real evaluation methods:

DOCUMENT [A/B] INTELLIGENCE ASSESSMENT:
🧠 Final Intelligence Score: [X]/100

PERCENTILE INTERPRETATION: This author is intellectually superior to approximately [X]% of the general population.

ASSESSMENT JUSTIFICATION: [Detailed explanation of the intelligence evaluation based on genuine cognitive abilities demonstrated in the text]

EXECUTIVE SUMMARY: [200-word assessment of author's intellectual profile based on real intelligence indicators]

COMPARATIVE INTELLIGENCE PLACEMENT: [How this author compares to undergraduates, graduates, journal authors, canonical thinkers]

Then provide:

WINNER: Document [A/B]
COMPARATIVE ANALYSIS: [Detailed explanation of why one author demonstrates superior cognitive capacity]

Focus on measuring actual intelligence markers, not writing quality or style.`;

export async function performIntelligenceComparison(
  documentA: string,
  documentB: string,
  provider: LLMProvider
): Promise<IntelligenceComparisonResult> {
  
  let response: string;
  
  const prompt = INTELLIGENCE_COMPARISON_PROMPT + 
    `\n\nPlease assess and compare the intelligence levels of these two authors:\n\nDOCUMENT A:\n${documentA}\n\nDOCUMENT B:\n${documentB}`;
  
  try {
    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      });
      
      response = completion.choices[0]?.message?.content || '';
    } else if (provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      });
      
      response = completion.content[0]?.type === 'text' ? completion.content[0].text : '';
    } else if (provider === 'perplexity') {
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      });
      
      const data = await perplexityResponse.json();
      response = data.choices[0]?.message?.content || '';
    } else if (provider === 'deepseek') {
      const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 4000
        })
      });
      
      const data = await deepseekResponse.json();
      response = data.choices[0]?.message?.content || '';
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error calling ${provider}:`, error);
    throw error;
  }

  return parseIntelligenceComparisonResponse(response, provider, documentA, documentB);
}

function parseIntelligenceComparisonResponse(
  response: string,
  provider: string,
  documentA: string,
  documentB: string
): IntelligenceComparisonResult {
  
  // Split response into document analyses
  const docAStart = response.indexOf('DOCUMENT A INTELLIGENCE ASSESSMENT:');
  const docBStart = response.indexOf('DOCUMENT B INTELLIGENCE ASSESSMENT:');
  const winnerStart = response.indexOf('WINNER:');
  const comparisonStart = response.indexOf('COMPARATIVE ANALYSIS:');
  
  let analysisAText = '';
  let analysisBText = '';
  let comparisonText = '';
  
  if (docAStart !== -1 && docBStart !== -1) {
    analysisAText = response.substring(docAStart, docBStart).trim();
    
    const endBPos = winnerStart !== -1 ? winnerStart : response.length;
    analysisBText = response.substring(docBStart, endBPos).trim();
  }
  
  if (comparisonStart !== -1) {
    comparisonText = response.substring(comparisonStart + 20).trim();
  }
  
  // Parse individual analyses
  const cleanAnalysisA = parseCleanIntelligenceResponse(analysisAText, provider, documentA);
  const cleanAnalysisB = parseCleanIntelligenceResponse(analysisBText, provider, documentB);
  
  // Convert CleanAnalysis to DocumentAnalysis format
  const analysisA: DocumentAnalysis = {
    id: 0,
    documentId: 0,
    provider: cleanAnalysisA.provider,
    formattedReport: cleanAnalysisA.formattedReport,
    overallScore: cleanAnalysisA.overallScore,
    surface: {
      grammar: Math.max(0, cleanAnalysisA.overallScore - 10),
      structure: Math.max(0, cleanAnalysisA.overallScore - 5),
      jargonUsage: Math.min(100, cleanAnalysisA.overallScore + 5),
      surfaceFluency: cleanAnalysisA.overallScore
    },
    deep: {
      score: cleanAnalysisA.overallScore
    }
  };
  
  const analysisB: DocumentAnalysis = {
    id: 1,
    documentId: 1,
    provider: cleanAnalysisB.provider,
    formattedReport: cleanAnalysisB.formattedReport,
    overallScore: cleanAnalysisB.overallScore,
    surface: {
      grammar: Math.max(0, cleanAnalysisB.overallScore - 10),
      structure: Math.max(0, cleanAnalysisB.overallScore - 5),
      jargonUsage: Math.min(100, cleanAnalysisB.overallScore + 5),
      surfaceFluency: cleanAnalysisB.overallScore
    },
    deep: {
      score: cleanAnalysisB.overallScore
    }
  };
  
  // Determine winner
  let winnerDocument: 'A' | 'B' = 'A';
  const winnerMatch = response.match(/WINNER:\s*Document\s*([AB])/i);
  if (winnerMatch) {
    winnerDocument = winnerMatch[1].toUpperCase() as 'A' | 'B';
  } else {
    // Fallback to score comparison
    winnerDocument = analysisA.overallScore >= analysisB.overallScore ? 'A' : 'B';
  }
  
  return {
    analysisA,
    analysisB,
    comparison: {
      winnerDocument,
      summary: `Document ${winnerDocument} demonstrates superior cognitive capacity`,
      detailedAnalysis: comparisonText || response
    }
  };
}