import React, { useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Bot, BrainCircuit, FileType, Sparkles } from "lucide-react";

interface PhilosophicalIntelligenceReportProps {
  analysis: any;
}

export default function PhilosophicalIntelligenceReport({ analysis }: PhilosophicalIntelligenceReportProps) {
  // Parse and structure the raw report into categories based on the questions
  const formattedReport = analysis.formattedReport || "";
  
  // Define the categories corresponding to the questions asked to the LLM
  const categories = [
    {
      title: "Epistemic Novelty",
      queries: ["Did you learn anything new from this text?", "would you have learned something new"],
      positiveIndicators: ["learn", "new", "novel", "original", "innovative", "insight"],
      negativeIndicators: ["familiar", "common", "standard", "rehash", "regurgitation", "pedestrian"]
    },
    {
      title: "Inferential Integrity",
      queries: ["How well does one statement follow from the next?", "logically and inferentially tight"],
      positiveIndicators: ["follows", "coherent", "logical", "consistent", "structured", "reasoned"],
      negativeIndicators: ["disjointed", "leap", "non sequitur", "fallacy", "inconsistent", "loose"]
    },
    {
      title: "Linguistic Transparency",
      queries: ["How reliant is the text on undefined or ornamental jargon?", "precision and continuity"],
      positiveIndicators: ["clear", "precise", "defined", "transparent", "accessible", "specific"],
      negativeIndicators: ["jargon", "obscure", "ornamental", "vague", "ambiguous", "undefined"]
    },
    {
      title: "Cognitive Forthrightness",
      queries: ["Does the author confront the difficult or controversial parts", "evasive, hedged, or padded"],
      positiveIndicators: ["addresses", "confronts", "engage", "tackle", "acknowledge", "upfront"],
      negativeIndicators: ["evasive", "hedged", "padded", "avoid", "ignores", "dismisses"]
    },
    {
      title: "Theoretical Consequences",
      queries: ["Assuming what is said is true, what would follow?", "consequences for philosophy"],
      positiveIndicators: ["implications", "consequences", "leads to", "impact", "result in", "follow from"],
      negativeIndicators: ["trivial", "inconsequential", "limited impact", "no follow", "isolated", "disconnected"]
    },
    {
      title: "Originality vs. Recycling",
      queries: ["Does this seem like an original mind at work", "regurgitation of standard"],
      positiveIndicators: ["original", "creative", "fresh", "novel", "unique", "innovative"],
      negativeIndicators: ["standard", "rehashed", "common", "derivative", "recycled", "imitative"]
    },
    {
      title: "Cognitive Load & Conceptual Control",
      queries: ["Is the author dealing with complex, interlocking ideas?", "firm grasp over those ideas"],
      positiveIndicators: ["complex", "sophisticated", "nuanced", "intricate", "grasp", "command"],
      negativeIndicators: ["simplistic", "superficial", "struggling", "confused", "shallow", "basic"]
    },
    {
      title: "Model of Mind Implied",
      queries: ["what kind of mind does this text reveal", "analytical, synthetic"],
      positiveIndicators: ["analytical", "synthetic", "systematic", "critical", "rigorous", "disciplined"],
      negativeIndicators: ["confused", "mechanical", "disorganized", "imitative", "disordered", "rigid"]
    },
    {
      title: "Meta-Cognitive Clues",
      queries: ["awareness of the limits or implications", "dialectical self-checking"],
      positiveIndicators: ["aware", "self-critical", "limitations", "reflexive", "balanced", "considered"],
      negativeIndicators: ["unaware", "uncritical", "dogmatic", "overconfident", "absolutist", "unexamined"]
    },
    {
      title: "Compression vs. Diffusion",
      queries: ["Does the author say more with less", "less with more"],
      positiveIndicators: ["concise", "efficient", "precise", "compressed", "economical", "dense"],
      negativeIndicators: ["verbose", "wordy", "repetitive", "inflated", "padded", "diffuse"]
    }
  ];
  
  // Analyze text to compute intelligence score automatically
  const computedScore = useMemo(() => {
    if (!formattedReport || formattedReport.length < 100) return null;
    
    // Track positive and negative indicators for each category
    const categoryScores = categories.map(category => {
      let positiveCount = 0;
      let negativeCount = 0;
      
      // Check for positive and negative indicators in the analysis
      category.positiveIndicators.forEach(indicator => {
        const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
        const matches = formattedReport.match(regex);
        if (matches) positiveCount += matches.length;
      });
      
      category.negativeIndicators.forEach(indicator => {
        const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
        const matches = formattedReport.match(regex);
        if (matches) negativeCount += matches.length;
      });
      
      // Check if analysis contains specific phrases that indicate strong positive/negative opinions
      const textSegments = formattedReport.split(/\n\n+/);
      const categoryText = textSegments.find(segment => 
        segment.includes(category.title) || 
        category.queries.some(query => segment.includes(query))
      ) || "";
      
      // Strong positive phrases
      if (categoryText.match(/exceptional|remarkable|sophisticated|excellent|outstanding/gi)) {
        positiveCount += 3;
      }
      
      // Moderate positive phrases
      if (categoryText.match(/good|well|strong|clear|effective/gi)) {
        positiveCount += 1;
      }
      
      // Strong negative phrases
      if (categoryText.match(/lack|weak|poor|limited|fails|absence|missing/gi)) {
        negativeCount += 3;
      }
      
      // Overall sentiment calculation
      return {
        category: category.title,
        score: Math.min(10, Math.max(1, 5 + (positiveCount - negativeCount) / 2))
      };
    });
    
    // Calculate average score across all categories (1-10 scale)
    const avgScore = categoryScores.reduce((sum, item) => sum + item.score, 0) / categoryScores.length;
    
    // Convert to 0-100 scale
    return Math.round((avgScore - 1) * (100 / 9));
  }, [formattedReport]);
  
  // Use computed score instead of extracted score
  const score = computedScore;
  
  // Get score tier description based on score value
  const getScoreTier = (score: number | null) => {
    if (score === null) return "";
    if (score >= 91) return "Exceptionally Intelligent";
    if (score >= 81) return "Highly Intelligent";
    if (score >= 61) return "Above Average Intelligence";
    if (score >= 41) return "Average Intelligence";
    if (score >= 21) return "Below Average Intelligence";
    return "Limited Intelligence";
  };
  
  // Get tier color based on score
  const getTierColor = (score: number | null) => {
    if (score === null) return "bg-gray-600";
    if (score >= 91) return "bg-purple-700";
    if (score >= 81) return "bg-indigo-600";
    if (score >= 61) return "bg-blue-600"; 
    if (score >= 41) return "bg-green-600";
    if (score >= 21) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  // Extract the last paragraph as the overall impression/summary
  const paragraphs = formattedReport.split(/\n\n+/);
  const overallImpressionMatch = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1] : "";
  
  // Clean up the formatted report to remove markdown symbols
  const cleanFormattedReport = formattedReport
    .replace(/#{1,6}\s+/g, '') // Remove heading markers like ### 
    .replace(/\*\*/g, '')      // Remove bold markers **
    .replace(/\*/g, '')        // Remove italic markers *
    .replace(/^>/gm, '')       // Remove blockquote markers
    .replace(/^-\s+/gm, '• ')  // Convert list markers to bullets
    .replace(/^[0-9]+\.\s+/gm, '$&') // Keep numbered lists
    .replace(/`/g, '')         // Remove code ticks
    .replace(/\[|\]/g, '')     // Remove square brackets (often from links)
    .replace(/\(http[^)]*\)/g, ''); // Remove URLs
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-semibold">Intelligence Assessment</h2>
        {analysis.provider && (
          <Badge variant="outline" className="bg-white">
            {analysis.provider.includes("OpenAI") ? (
              <Sparkles className="h-3.5 w-3.5 text-green-600 mr-1.5" />
            ) : analysis.provider.includes("Anthropic") ? (
              <BrainCircuit className="h-3.5 w-3.5 text-purple-600 mr-1.5" />
            ) : analysis.provider.includes("Perplexity") ? (
              <Bot className="h-3.5 w-3.5 text-blue-600 mr-1.5" />
            ) : (
              <FileType className="h-3.5 w-3.5 text-gray-600 mr-1.5" />
            )}
            {analysis.provider}
          </Badge>
        )}
      </div>
      
      {score !== null && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-col mb-2">
            <span className="text-sm text-gray-500">Intelligence Score</span>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-gray-800">{score}</span>
              <span className="text-xl text-gray-400 ml-1">/100</span>
              <span className={`ml-3 px-3 py-1 text-xs text-white rounded-full ${getTierColor(score)}`}>
                {getScoreTier(score)}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
            <div 
              className={`h-2.5 rounded-full ${getTierColor(score)}`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>
      )}
      
      {overallImpressionMatch && (
        <div className="bg-blue-50 p-4 rounded-md mb-4">
          <h3 className="font-medium mb-2">Overall Impression</h3>
          <p className="text-gray-700">{overallImpressionMatch}</p>
        </div>
      )}
      
      {/* Show the cleaned, formatted output directly */}
      <div className="w-full overflow-auto border border-gray-200 rounded-md p-4 bg-white font-mono text-sm whitespace-pre-wrap">
        {cleanFormattedReport}
      </div>
    </div>
  );
}