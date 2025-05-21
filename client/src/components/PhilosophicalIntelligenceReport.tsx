import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, BrainCircuit, FileType, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface PhilosophicalIntelligenceReportProps {
  analysis: any;
  className?: string;
}

export default function PhilosophicalIntelligenceReport({ 
  analysis, 
  className = "" 
}: PhilosophicalIntelligenceReportProps) {
  // Extract sections from the formatted report if it exists
  const renderMarkdownReport = () => {
    if (!analysis.formattedReport) return null;
    
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{analysis.formattedReport}</ReactMarkdown>
      </div>
    );
  };

  // Render the JSON-based report if available
  const renderStructuredReport = () => {
    if (!analysis.evaluations) return null;
    
    const evaluations = analysis.evaluations;
    
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-800 mb-2">Overall Impression</h3>
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
          <p className="text-gray-700 whitespace-pre-wrap break-words">
            {analysis.overallImpression}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1">
            <div className="h-2 w-full bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-blue-600 rounded-full" 
                style={{ width: `${analysis.overallScore}%` }}
              ></div>
            </div>
          </div>
          <span className="text-lg font-semibold text-blue-800">
            {analysis.overallScore}/100
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">1. Epistemic Novelty</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.epistemicNovelty}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">2. Inferential Integrity</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.inferentialIntegrity}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">3. Linguistic Transparency</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.linguisticTransparency}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">4. Forthrightness</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.forthrightness}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">5. Consequences</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.consequences}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">6. Originality</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.originality}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">7. Conceptual Control</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.conceptualControl}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">8. Mind Implied</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.mindImplied}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">9. Meta-Cognition</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.metaCognition}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">10. Compression vs. Diffusion</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-gray-600">{evaluations.compression}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`w-full ${className}`}>
      {analysis.formattedReport ? renderMarkdownReport() : renderStructuredReport()}
    </div>
  );
}