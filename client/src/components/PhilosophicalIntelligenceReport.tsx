import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Bot, BrainCircuit, FileType, Sparkles } from "lucide-react";

interface PhilosophicalIntelligenceReportProps {
  analysis: any;
}

// Component that shows exactly the raw output from the LLM without any modifications
export default function PhilosophicalIntelligenceReport({ analysis }: PhilosophicalIntelligenceReportProps) {
  // Just get the raw formatted report
  const formattedReport = analysis.formattedReport || "";
  
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
      
      {/* Show the raw, complete output directly with no processing */}
      <div className="w-full overflow-auto border border-gray-200 rounded-md p-4 bg-white font-serif text-sm whitespace-pre-wrap">
        {formattedReport}
      </div>
    </div>
  );
}