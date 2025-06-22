import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentAnalysis } from '@/lib/types';
import { MultiProviderResults } from './MultiProviderResults';
import { cleanAIResponse } from '@/lib/textUtils';
import { Brain, TrendingUp, Target, Zap, Eye, Lightbulb } from 'lucide-react';

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

function extractDimensions(text: string): Array<{name: string, score: string, icon: React.ReactNode}> {
  const dimensions = [];
  const dimensionPatterns = [
    { name: 'Semantic Compression', pattern: /Semantic Compression:\s*([\d.]+\/10)/i, icon: <Zap className="w-4 h-4" /> },
    { name: 'Inferential Control', pattern: /Inferential Control:\s*([\d.]+\/10)/i, icon: <Target className="w-4 h-4" /> },
    { name: 'Cognitive Risk', pattern: /Cognitive Risk:\s*([\d.]+\/10)/i, icon: <TrendingUp className="w-4 h-4" /> },
    { name: 'Meta-Theoretical Awareness', pattern: /Meta-Theoretical Awareness:\s*([\d.]+\/10)/i, icon: <Eye className="w-4 h-4" /> },
    { name: 'Conceptual Innovation', pattern: /Conceptual Innovation:\s*([\d.]+\/10)/i, icon: <Lightbulb className="w-4 h-4" /> },
    { name: 'Epistemic Resistance', pattern: /Epistemic Resistance:\s*([\d.]+\/10)/i, icon: <Brain className="w-4 h-4" /> }
  ];
  
  for (const dim of dimensionPatterns) {
    const match = text.match(dim.pattern);
    if (match && match[1]) {
      dimensions.push({
        name: dim.name,
        score: match[1],
        icon: dim.icon
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

function extractVerdict(text: string): string {
  const verdictMatch = text.match(/Verdict:\s*([^\n]+)/i);
  return verdictMatch ? verdictMatch[1].trim() : '';
}

const PhilosophicalIntelligenceReport: React.FC<PhilosophicalIntelligenceReportProps> = ({ analysis }) => {
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
  const summary = extractSummary(cleanedReport);
  const highlights = extractHighlights(cleanedReport);
  const verdict = extractVerdict(cleanedReport);
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
            {intelligenceScore && (
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{intelligenceScore}/100</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Final Score</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {summary && (
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">{summary}</p>
          )}
        </CardContent>
      </Card>

      {/* Key Dimensions */}
      {dimensions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Key Cognitive Dimensions</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {dimensions.map((dim, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  {dim.icon}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{dim.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Score: {dim.score}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

      {/* Final Verdict */}
      {verdict && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">Final Assessment</h3>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-green-700 dark:text-green-300 font-medium">{verdict}</p>
          </CardContent>
        </Card>
      )}

      {/* Provider Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="px-3 py-1">
          Analyzed by {provider}
        </Badge>
      </div>
    </div>
  );
};

export default PhilosophicalIntelligenceReport;