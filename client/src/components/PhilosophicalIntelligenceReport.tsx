import React from 'react';
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
      queries: ["Did you learn anything new from this text?", "would you have learned something new"]
    },
    {
      title: "Inferential Integrity",
      queries: ["How well does one statement follow from the next?", "logically and inferentially tight"]
    },
    {
      title: "Linguistic Transparency",
      queries: ["How reliant is the text on undefined or ornamental jargon?", "precision and continuity"]
    },
    {
      title: "Cognitive Forthrightness",
      queries: ["Does the author confront the difficult or controversial parts", "evasive, hedged, or padded"]
    },
    {
      title: "Theoretical Consequences",
      queries: ["Assuming what is said is true, what would follow?", "consequences for philosophy"]
    },
    {
      title: "Originality vs. Recycling",
      queries: ["Does this seem like an original mind at work", "regurgitation of standard"]
    },
    {
      title: "Cognitive Load & Conceptual Control",
      queries: ["Is the author dealing with complex, interlocking ideas?", "firm grasp over those ideas"]
    },
    {
      title: "Model of Mind Implied",
      queries: ["what kind of mind does this text reveal", "analytical, synthetic"]
    },
    {
      title: "Meta-Cognitive Clues",
      queries: ["awareness of the limits or implications", "dialectical self-checking"]
    },
    {
      title: "Compression vs. Diffusion",
      queries: ["Does the author say more with less", "less with more"]
    }
  ];
  
  // Extract section for scoring (optional)
  const scoreMatch = formattedReport.match(/(\d+)\s*\/\s*100/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
  
  // Overall assessment/impression extraction (look for the first few sentences)
  const overallImpressionMatch = formattedReport.split(/\.\s+/g).slice(0, 3).join(". ");
  
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
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1">
            <div className="h-2 w-full bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-blue-600 rounded-full" 
                style={{ width: `${score}%` }}
              ></div>
            </div>
          </div>
          <span className="text-lg font-semibold text-blue-800">
            {score}/100
          </span>
        </div>
      )}
      
      {overallImpressionMatch && (
        <div className="bg-blue-50 p-4 rounded-md mb-4">
          <h3 className="font-medium mb-2">Overall Impression</h3>
          <p className="text-gray-700">{overallImpressionMatch}</p>
        </div>
      )}
      
      {/* Just show the raw, complete output directly */}
      <div className="w-full overflow-auto border border-gray-200 rounded-md p-4 bg-white font-mono text-sm whitespace-pre-wrap">
        {formattedReport}
      </div>
    </div>
  );
}