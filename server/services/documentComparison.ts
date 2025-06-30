type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

export interface DocumentComparisonResult {
  winnerDocument: 'A' | 'B';
  documentAScore: number;
  documentBScore: number;
  comparisonAnalysis: string;
  detailedBreakdown: string;
}

const COMPARISON_PROMPT = `DOCUMENT COMPARISON: WHICH MAKES ITS CASE BETTER?

You are comparing two documents to determine which one makes its case more effectively.

COMPARISON CRITERIA:
1. Argument Strength: Which document has stronger logical arguments?
2. Evidence Quality: Which provides better evidence for its claims?
3. Persuasiveness: Which is more convincing overall?
4. Clarity of Case: Which presents its argument more clearly?
5. Completeness: Which covers its topic more thoroughly?

SCORING SYSTEM:
- Document A Score: 0-100 (how well Document A makes its case)
- Document B Score: 0-100 (how well Document B makes its case)
- Winner: The document with the higher score

RESPONSE FORMAT (NO MARKDOWN):

WINNER: Document [A or B]

DOCUMENT A SCORE: [Score]/100
DOCUMENT B SCORE: [Score]/100

COMPARISON ANALYSIS:
[Brief explanation of which document makes its case better and why]

DETAILED BREAKDOWN:
Argument Strength: [Compare the logical strength of arguments]
Evidence Quality: [Compare the quality and relevance of evidence]
Persuasiveness: [Compare overall persuasive power]
Clarity of Case: [Compare how clearly each presents its argument]
Completeness: [Compare thoroughness of coverage]

FINAL VERDICT:
[Conclusive statement about which document makes its case better with key reasons]

DOCUMENT A:
`;

export async function compareDocuments(
  documentA: string,
  documentB: string,
  provider: LLMProvider = 'openai'
): Promise<DocumentComparisonResult> {
  const prompt = COMPARISON_PROMPT + documentA + "\n\nDOCUMENT B:\n" + documentB;
  
  // Call the LLM directly without using the analysis functions
  let response: string;
  
  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });
    
    response = completion.choices[0].message.content || "No response available";
  } else if (provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
        { role: "user", content: prompt }
      ]
    });
    
    response = completion.content[0].type === 'text' ? completion.content[0].text : "No response available";
  } else if (provider === 'deepseek') {
    const fetch = (await import('node-fetch')).default;
    
    const apiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
      })
    });
    
    const data = await apiResponse.json() as any;
    response = data.choices?.[0]?.message?.content || "No response available";
  } else if (provider === 'perplexity') {
    const fetch = (await import('node-fetch')).default;
    
    const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
      })
    });
    
    const data = await apiResponse.json() as any;
    response = data.choices?.[0]?.message?.content || "No response available";
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  
  console.log('Raw comparison response:', response.substring(0, 500) + '...');
  return parseComparisonResponse(response);
}

function parseComparisonResponse(response: string): DocumentComparisonResult {
  const cleanResponse = response.replace(/\*\*/g, '').replace(/\*/g, '').replace(/```/g, '');
  
  console.log('Parsing comparison response. Response length:', cleanResponse.length);
  console.log('First 1000 chars:', cleanResponse.substring(0, 1000));
  
  // Extract winner with multiple patterns
  let winnerDocument: 'A' | 'B' = 'A';
  const winnerPatterns = [
    /WINNER:\s*Document\s*([AB])/i,
    /Winner:\s*Document\s*([AB])/i,
    /The winner is:\s*Document\s*([AB])/i,
    /Document\s*([AB])\s*wins/i,
    /Document\s*([AB])\s*is the winner/i
  ];
  
  for (const pattern of winnerPatterns) {
    const match = cleanResponse.match(pattern);
    if (match) {
      winnerDocument = match[1].toUpperCase() as 'A' | 'B';
      console.log('Found winner:', winnerDocument, 'using pattern:', pattern);
      break;
    }
  }
  
  // Extract scores with multiple patterns
  let documentAScore = 90; // Default high score
  let documentBScore = 90; // Default high score
  
  const scorePatterns = [
    /DOCUMENT A SCORE:\s*(\d+)/i,
    /Document A:\s*(\d+)\/100/i,
    /Document A Score:\s*(\d+)/i,
    /A:\s*(\d+)\/100/i
  ];
  
  for (const pattern of scorePatterns) {
    const match = cleanResponse.match(pattern);
    if (match) {
      documentAScore = Math.min(Math.max(parseInt(match[1]), 0), 100);
      console.log('Found Document A score:', documentAScore);
      break;
    }
  }
  
  const scoreBPatterns = [
    /DOCUMENT B SCORE:\s*(\d+)/i,
    /Document B:\s*(\d+)\/100/i,
    /Document B Score:\s*(\d+)/i,
    /B:\s*(\d+)\/100/i
  ];
  
  for (const pattern of scoreBPatterns) {
    const match = cleanResponse.match(pattern);
    if (match) {
      documentBScore = Math.min(Math.max(parseInt(match[1]), 0), 100);
      console.log('Found Document B score:', documentBScore);
      break;
    }
  }
  
  // Extract analysis sections
  let comparisonAnalysis = '';
  const analysisKeywords = ['COMPARISON ANALYSIS:', 'Analysis:', 'Comparison:'];
  const breakdownKeywords = ['DETAILED BREAKDOWN:', 'Breakdown:', 'Detailed Analysis:'];
  
  let analysisStart = -1;
  let breakdownStart = -1;
  
  for (const keyword of analysisKeywords) {
    const pos = cleanResponse.indexOf(keyword);
    if (pos !== -1) {
      analysisStart = pos + keyword.length;
      break;
    }
  }
  
  for (const keyword of breakdownKeywords) {
    const pos = cleanResponse.indexOf(keyword);
    if (pos !== -1) {
      breakdownStart = pos;
      break;
    }
  }
  
  if (analysisStart !== -1) {
    const endPos = breakdownStart !== -1 ? breakdownStart : cleanResponse.length;
    comparisonAnalysis = cleanResponse.substring(analysisStart, endPos).trim();
  }
  
  let detailedBreakdown = '';
  if (breakdownStart !== -1) {
    const verdictStart = cleanResponse.indexOf('FINAL VERDICT:');
    const endPos = verdictStart !== -1 ? verdictStart : cleanResponse.length;
    detailedBreakdown = cleanResponse.substring(breakdownStart + 19, endPos).trim();
  }
  
  // If we still don't have analysis, use the entire response
  if (!comparisonAnalysis && !detailedBreakdown) {
    comparisonAnalysis = cleanResponse.trim();
  }
  
  console.log('Parsed result:', {
    winnerDocument,
    documentAScore,
    documentBScore,
    hasAnalysis: !!comparisonAnalysis,
    hasBreakdown: !!detailedBreakdown
  });
  
  return {
    winnerDocument,
    documentAScore,
    documentBScore,
    comparisonAnalysis,
    detailedBreakdown
  };
}