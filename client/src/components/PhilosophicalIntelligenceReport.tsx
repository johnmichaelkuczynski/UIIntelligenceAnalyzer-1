import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentAnalysis } from '@/lib/types';
import { MultiProviderResults } from './MultiProviderResults';
import { cleanAIResponse } from '@/lib/textUtils';
import { Brain, TrendingUp, Target, Zap, Eye, Lightbulb, Maximize2 } from 'lucide-react';
import IntelligenceReportModal from './IntelligenceReportModal';

interface PhilosophicalIntelligenceReportProps {
  analysis: DocumentAnalysis;
}

function extractIntelligenceScore(text: string): number | null {
  const patterns = [
    /🧠\s*Final Intelligence Score:\s*(\d+)\/100/i,
    /Intelligence Score:\s*(\d+)\/100/i,
    /Final Score:\s*(\d+)\/100/i,
    /Overall Score:\s*(\d+)\/100/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

function extractDimensions(text: string): Array<{name: string, score: string, icon: React.ReactNode, analysis: string}> {
  const dimensions = [];
  const dimensionPatterns = [
    { name: 'Semantic Compression', pattern: /### 1\. Semantic Compression Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 2\.|\n## |$)/i, icon: <Zap className="w-4 h-4" /> },
    { name: 'Inferential Control', pattern: /### 2\. Inferential Control Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 3\.|\n## |$)/i, icon: <Target className="w-4 h-4" /> },
    { name: 'Cognitive Risk', pattern: /### 3\. Cognitive Risk Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 4\.|\n## |$)/i, icon: <TrendingUp className="w-4 h-4" /> },
    { name: 'Meta-Theoretical Awareness', pattern: /### 4\. Meta-Theoretical Awareness Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 5\.|\n## |$)/i, icon: <Eye className="w-4 h-4" /> },
    { name: 'Conceptual Innovation', pattern: /### 5\. Conceptual Innovation Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 6\.|\n## |$)/i, icon: <Lightbulb className="w-4 h-4" /> },
    { name: 'Epistemic Resistance', pattern: /### 6\. Epistemic Resistance Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=## |\n## |$)/i, icon: <Brain className="w-4 h-4" /> }
  ];
  
  for (const dim of dimensionPatterns) {
    const match = text.match(dim.pattern);
    if (match && match[1] && match[2]) {
      dimensions.push({
        name: dim.name,
        score: match[1],
        icon: dim.icon,
        analysis: match[2].trim()
      });
    }
  }
  
  return dimensions;
}

function extractSummary(text: string): string {
  const summaryMatch = text.match(/Summary:\s*([^✓\n]+)/i);
  return summaryMatch ? summaryMatch[1].trim() : '';
}

function extractHighlights(text: string): string[] {
  const highlights = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('✓')) {
      highlights.push(line.trim().substring(1).trim());
    }
  }
  return highlights;
}

function extractComparativePlacement(text: string): string {
  const placementMatch = text.match(/## Comparative Intelligence Placement([\s\S]*?)(?=## Final Verdict|$)/i);
  return placementMatch ? placementMatch[1].trim() : '';
}

function extractFinalVerdict(text: string): string {
  const verdictMatch = text.match(/## Final Verdict([\s\S]*?)(?=## |$)/i);
  return verdictMatch ? verdictMatch[1].trim() : '';
}

function extractExecutiveSummary(text: string): string {
  const summaryMatch = text.match(/## Executive Summary([\s\S]*?)(?=## Detailed|$)/i);
  return summaryMatch ? summaryMatch[1].trim() : '';
}

const PhilosophicalIntelligenceReport: React.FC<PhilosophicalIntelligenceReportProps> = ({ analysis }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Check if the analysis contains multiple provider results
  const hasMultipleProviders = analysis.analysisResults && Array.isArray(analysis.analysisResults) && analysis.analysisResults.length > 0;
  
  // If we have multiple provider results, use the dedicated component
  if (hasMultipleProviders) {
    return <MultiProviderResults results={analysis.analysisResults || []} />;
  }
  
  // Extract data from the formatted report
  const formattedReport = analysis.formattedReport || analysis.report || "";
  const cleanedReport = cleanAIResponse(formattedReport);
  
  const intelligenceScore = extractIntelligenceScore(cleanedReport);
  const dimensions = extractDimensions(cleanedReport);
  const executiveSummary = extractExecutiveSummary(cleanedReport);
  const comparativePlacement = extractComparativePlacement(cleanedReport);
  const finalVerdict = extractFinalVerdict(cleanedReport);
  const highlights = extractHighlights(cleanedReport);
  const provider = analysis.provider || "AI";

  return (
    <div className="w-full mt-4 space-y-6">
      {/* Main Intelligence Score */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Intelligence Assessment</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cognitive Analysis Report</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {intelligenceScore && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{intelligenceScore}/100</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Final Score</div>
                </div>
              )}
              <Button 
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 border-blue-200 dark:border-blue-800"
              >
                <Maximize2 className="w-4 h-4" />
                View Full Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {executiveSummary && (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {executiveSummary.split('\n').map((paragraph, index) => {
                if (!paragraph.trim()) return null;
                return (
                  <p key={index} className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Cognitive Dimensions */}
      {dimensions.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Detailed Cognitive Analysis</h3>
          {dimensions.map((dim, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {dim.icon}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{dim.name}</h4>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dim.score}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {dim.analysis.split('\n').map((paragraph, pIndex) => {
                    if (!paragraph.trim()) return null;
                    
                    // Handle quotes specially
                    if (paragraph.includes('"')) {
                      return (
                        <blockquote key={pIndex} className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 my-4 italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded">
                          {paragraph}
                        </blockquote>
                      );
                    }
                    
                    // Handle section headers
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      const cleanHeader = paragraph.replace(/\*\*/g, '');
                      return (
                        <h5 key={pIndex} className="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">
                          {cleanHeader}
                        </h5>
                      );
                    }
                    
                    // Regular paragraphs
                    return (
                      <p key={pIndex} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Key Highlights</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 dark:text-gray-300">{highlight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparative Intelligence Placement */}
      {comparativePlacement && (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200">Comparative Intelligence Placement</h3>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {comparativePlacement.split('\n').map((paragraph, index) => {
                if (!paragraph.trim()) return null;
                
                // Handle quotes specially
                if (paragraph.includes('"')) {
                  return (
                    <blockquote key={index} className="border-l-4 border-purple-300 dark:border-purple-700 pl-4 my-4 italic text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900 p-3 rounded">
                      {paragraph}
                    </blockquote>
                  );
                }
                
                // Handle section headers
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  const cleanHeader = paragraph.replace(/\*\*/g, '');
                  return (
                    <h5 key={index} className="font-semibold text-purple-900 dark:text-purple-100 mt-4 mb-2">
                      {cleanHeader}
                    </h5>
                  );
                }
                
                return (
                  <p key={index} className="mb-3 text-purple-700 dark:text-purple-300 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Verdict */}
      {finalVerdict && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">Final Assessment</h3>
          </CardHeader>
          <CardContent>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {finalVerdict.split('\n').map((paragraph, index) => {
                if (!paragraph.trim()) return null;
                
                // Handle quotes specially
                if (paragraph.includes('"')) {
                  return (
                    <blockquote key={index} className="border-l-4 border-green-300 dark:border-green-700 pl-4 my-4 italic text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900 p-3 rounded">
                      {paragraph}
                    </blockquote>
                  );
                }
                
                return (
                  <p key={index} className="text-lg text-green-700 dark:text-green-300 font-medium leading-relaxed mb-3">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="px-3 py-1">
          Analyzed by {provider}
        </Badge>
      </div>

      {/* Intelligence Report Modal */}
      <IntelligenceReportModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        analysis={analysis}
      />
    </div>
  );
};

export default PhilosophicalIntelligenceReport;