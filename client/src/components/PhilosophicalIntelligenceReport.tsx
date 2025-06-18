import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentAnalysis } from '@/lib/types';
import { MultiProviderResults } from './MultiProviderResults';
import { cleanAIResponse } from '@/lib/textUtils';

interface PhilosophicalIntelligenceReportProps {
  analysis: DocumentAnalysis;
}

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

const PhilosophicalIntelligenceReport: React.FC<PhilosophicalIntelligenceReportProps> = ({ analysis }) => {
  // Check if the analysis contains multiple provider results
  const hasMultipleProviders = analysis.analysisResults && Array.isArray(analysis.analysisResults) && analysis.analysisResults.length > 0;
  
  // If we have multiple provider results, use the dedicated component
  if (hasMultipleProviders) {
    return <MultiProviderResults results={analysis.analysisResults || []} />;
  }
  
  // Otherwise, show the single provider result
  const formattedReport = analysis.formattedReport || analysis.report || "";
  const provider = analysis.provider || "AI";
  
  // Extract the score from the formatted report if available
  const scoreFromReport = extractScore(formattedReport);
  
  // Format the report text for display
  const formatReport = (text: string) => {
    if (!text) return <p>No analysis available</p>;
    
    // Clean markup first
    const cleanedText = cleanAIResponse(text);
    
    // Split by line breaks to display paragraphs properly
    return cleanedText.split('\n').map((line, index) => {
      // Skip empty lines
      if (!line.trim()) return null;
      
      // Check if it contains the intelligence score
      if (line.toLowerCase().includes('intelligence score')) {
        return (
          <div key={index} className="my-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-300 dark:border-blue-800">
            <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">{line}</h2>
          </div>
        );
      }
      
      // Check if it's a section title (ends with a colon)
      if (line.trim().endsWith(':') && !line.includes(',')) {
        return <h4 key={index} className="font-semibold mt-3 mb-1">{line}</h4>;
      }
      
      // Regular paragraph or empty line
      return line.trim() ? <p key={index} className="my-2">{line}</p> : <br key={index} />;
    });
  };

  return (
    <div className="w-full mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Intelligence Assessment</h2>
        {scoreFromReport && (
          <Badge variant="outline" className="text-lg px-3 py-1 bg-blue-50 text-blue-700 border-blue-300">
            Score: {scoreFromReport}/100
          </Badge>
        )}
      </div>
      
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="px-2 py-1">
              {provider}
            </Badge>
          </div>
          
          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {formatReport(formattedReport)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhilosophicalIntelligenceReport;