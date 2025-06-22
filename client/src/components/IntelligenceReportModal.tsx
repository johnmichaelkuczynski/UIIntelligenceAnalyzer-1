import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, TrendingUp, Target, Zap, Eye, Lightbulb, FileText } from 'lucide-react';
import { DocumentAnalysis } from '@/lib/types';
import { cleanAIResponse } from '@/lib/textUtils';

interface IntelligenceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DocumentAnalysis;
}

function extractIntelligenceScore(text: string): number | null {
  const patterns = [
    /🧠\s*Final Intelligence Score:\s*(\d+)\/100/i,
    /Final Intelligence Score:\s*(\d+)\/100/i,
    /Intelligence Score:\s*(\d+)\/100/i,
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

function extractExecutiveSummary(text: string): string {
  const summaryMatch = text.match(/## Executive Summary([\s\S]*?)(?=## Detailed|$)/i);
  if (summaryMatch) return summaryMatch[1].trim();
  
  // Fallback: Look for any paragraph after the score
  const scoreMatch = text.match(/🧠\s*Final Intelligence Score:\s*\d+\/100([\s\S]*?)(?=##|$)/i);
  if (scoreMatch) {
    const afterScore = scoreMatch[1].trim();
    const firstParagraphs = afterScore.split('\n\n').slice(0, 2).join('\n\n');
    return firstParagraphs;
  }
  
  return '';
}

function extractDimensions(text: string): Array<{name: string, score: string, icon: React.ReactNode, analysis: string}> {
  const dimensions = [];
  const dimensionPatterns = [
    { name: 'Semantic Compression', pattern: /### 1\. Semantic Compression Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 2\.|\n## |$)/i, icon: <Zap className="w-5 h-5" /> },
    { name: 'Inferential Control', pattern: /### 2\. Inferential Control Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 3\.|\n## |$)/i, icon: <Target className="w-5 h-5" /> },
    { name: 'Cognitive Risk', pattern: /### 3\. Cognitive Risk Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 4\.|\n## |$)/i, icon: <TrendingUp className="w-5 h-5" /> },
    { name: 'Meta-Theoretical Awareness', pattern: /### 4\. Meta-Theoretical Awareness Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 5\.|\n## |$)/i, icon: <Eye className="w-5 h-5" /> },
    { name: 'Conceptual Innovation', pattern: /### 5\. Conceptual Innovation Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=### 6\.|\n## |$)/i, icon: <Lightbulb className="w-5 h-5" /> },
    { name: 'Epistemic Resistance', pattern: /### 6\. Epistemic Resistance Assessment:\s*([\d.]+\/10)([\s\S]*?)(?=## |\n## |$)/i, icon: <Brain className="w-5 h-5" /> }
  ];
  
  // Try new structured format first
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
  
  // Fallback: Extract from older format or simpler patterns
  if (dimensions.length === 0) {
    const fallbackPatterns = [
      { name: 'Semantic Compression', pattern: /Semantic Compression.*?(\d+\.?\d*\/10|(\d+\.?\d*)\/10)/i, icon: <Zap className="w-5 h-5" /> },
      { name: 'Inferential Control', pattern: /Inferential Control.*?(\d+\.?\d*\/10|(\d+\.?\d*)\/10)/i, icon: <Target className="w-5 h-5" /> },
      { name: 'Cognitive Risk', pattern: /Cognitive Risk.*?(\d+\.?\d*\/10|(\d+\.?\d*)\/10)/i, icon: <TrendingUp className="w-5 h-5" /> },
      { name: 'Meta-Theoretical Awareness', pattern: /Meta-Theoretical Awareness.*?(\d+\.?\d*\/10|(\d+\.?\d*)\/10)/i, icon: <Eye className="w-5 h-5" /> },
      { name: 'Conceptual Innovation', pattern: /Conceptual Innovation.*?(\d+\.?\d*\/10|(\d+\.?\d*)\/10)/i, icon: <Lightbulb className="w-5 h-5" /> },
      { name: 'Epistemic Resistance', pattern: /Epistemic Resistance.*?(\d+\.?\d*\/10|(\d+\.?\d*)\/10)/i, icon: <Brain className="w-5 h-5" /> }
    ];
    
    for (const dim of fallbackPatterns) {
      const match = text.match(dim.pattern);
      if (match && match[1]) {
        dimensions.push({
          name: dim.name,
          score: match[1],
          icon: dim.icon,
          analysis: `Assessment found in report: ${match[0]}`
        });
      }
    }
  }
  
  return dimensions;
}

function extractComparativePlacement(text: string): string {
  const placementMatch = text.match(/## Comparative Intelligence Placement([\s\S]*?)(?=## Final Verdict|$)/i);
  if (placementMatch) return placementMatch[1].trim();
  
  // Fallback: Look for placement or comparison sections
  const comparisonMatch = text.match(/(comparative|comparison|placement|position).*?:?([\s\S]*?)(?=##|final|verdict|$)/i);
  if (comparisonMatch) return comparisonMatch[2].trim();
  
  return '';
}

function extractFinalVerdict(text: string): string {
  const verdictMatch = text.match(/## Final Verdict([\s\S]*?)(?=## |$)/i);
  if (verdictMatch) return verdictMatch[1].trim();
  
  // Fallback: Look for final assessment or conclusion
  const finalMatch = text.match(/(final|verdict|conclusion|assessment).*?:?([\s\S]*?)(?=analyzed by|$)/i);
  if (finalMatch) return finalMatch[2].trim();
  
  // Get last substantial paragraph
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
  if (paragraphs.length > 0) {
    return paragraphs[paragraphs.length - 1];
  }
  
  return '';
}

function formatTextContent(text: string, colorClass: string = "text-gray-700 dark:text-gray-300") {
  return text.split('\n').map((paragraph, index) => {
    if (!paragraph.trim()) return null;
    
    // Handle quotes specially with enhanced styling and larger text
    if (paragraph.includes('"')) {
      return (
        <blockquote key={index} className="border-l-4 border-blue-400 dark:border-blue-600 pl-6 my-8 italic bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-r-lg shadow-sm">
          <div className="text-blue-800 dark:text-blue-200 font-medium leading-relaxed text-lg">
            {paragraph}
          </div>
        </blockquote>
      );
    }
    
    // Handle evidence analysis headers
    if (paragraph.startsWith('**Quote Analysis:**') || paragraph.startsWith('**Additional Evidence:**') || paragraph.startsWith('**Justification:**')) {
      const cleanHeader = paragraph.replace(/\*\*/g, '');
      return (
        <h6 key={index} className="font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4 text-md bg-gray-100 dark:bg-gray-800 p-3 rounded">
          {cleanHeader}
        </h6>
      );
    }
    
    // Handle main section headers
    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
      const cleanHeader = paragraph.replace(/\*\*/g, '');
      return (
        <h5 key={index} className="font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4 text-lg border-b border-gray-200 dark:border-gray-700 pb-2">
          {cleanHeader}
        </h5>
      );
    }
    
    // Handle numbered analysis steps
    if (/^\d+\./.test(paragraph.trim())) {
      return (
        <div key={index} className={`mb-4 ${colorClass} leading-relaxed pl-4 border-l-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 rounded`}>
          {paragraph}
        </div>
      );
    }
    
    // Regular paragraphs with enhanced spacing
    return (
      <p key={index} className={`mb-5 ${colorClass} leading-relaxed text-base`}>
        {paragraph}
      </p>
    );
  });
}

const IntelligenceReportModal: React.FC<IntelligenceReportModalProps> = ({ isOpen, onClose, analysis }) => {
  const formattedReport = analysis.formattedReport || analysis.report || "";
  const cleanedReport = cleanAIResponse(formattedReport);
  
  const intelligenceScore = extractIntelligenceScore(cleanedReport);
  const executiveSummary = extractExecutiveSummary(cleanedReport);
  const dimensions = extractDimensions(cleanedReport);
  const comparativePlacement = extractComparativePlacement(cleanedReport);
  const finalVerdict = extractFinalVerdict(cleanedReport);
  const provider = analysis.provider || "AI";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden" aria-describedby="intelligence-report-description">
        <DialogHeader className="pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Brain className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              <div>
                <DialogTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Comprehensive Intelligence Assessment
                </DialogTitle>
                <p id="intelligence-report-description" className="text-base text-gray-600 dark:text-gray-400 mt-2">
                  Forensic Cognitive Analysis with Extensive Textual Evidence
                </p>
              </div>
            </div>
            {intelligenceScore && (
              <div className="text-right bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg">
                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">{intelligenceScore}/100</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Final Intelligence Score</div>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(95vh-150px)] pr-6">
          <div className="space-y-8">
            {/* Debug Info */}
            {!executiveSummary && !dimensions.length && !comparativePlacement && !finalVerdict && (
              <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Raw Report Content</h3>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
                      {cleanedReport}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Executive Summary */}
            {executiveSummary && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Executive Summary
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    {formatTextContent(executiveSummary, "text-blue-800 dark:text-blue-200")}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Cognitive Dimensions */}
            {dimensions.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 border-b-2 border-gray-200 dark:border-gray-700 pb-2">
                  Detailed Cognitive Analysis
                </h3>
                {dimensions.map((dim, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500 shadow-lg">
                    <CardHeader className="pb-4 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {dim.icon}
                          <div>
                            <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{dim.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Cognitive Dimension Assessment</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{dim.score}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {formatTextContent(dim.analysis)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Comparative Intelligence Placement */}
            {comparativePlacement && (
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border-purple-200 dark:border-purple-800 shadow-lg">
                <CardHeader>
                  <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200">
                    Comparative Intelligence Placement
                  </h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Evidence-based positioning relative to academic and intellectual benchmarks
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {formatTextContent(comparativePlacement, "text-purple-700 dark:text-purple-300")}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Final Verdict */}
            {finalVerdict && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 shadow-lg">
                <CardHeader>
                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
                    Final Assessment
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Comprehensive evaluation of cognitive architecture and intelligence type
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    {formatTextContent(finalVerdict, "text-green-700 dark:text-green-300")}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fallback: Show full report if structured content is missing */}
            {!executiveSummary && !dimensions.length && !comparativePlacement && !finalVerdict && cleanedReport && (
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Complete Intelligence Analysis</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Full report content</p>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {formatTextContent(cleanedReport)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Metadata */}
            <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <Badge variant="outline" className="px-4 py-2 text-sm">
                <Brain className="w-4 h-4 mr-2" />
                Analyzed by {provider}
              </Badge>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default IntelligenceReportModal;