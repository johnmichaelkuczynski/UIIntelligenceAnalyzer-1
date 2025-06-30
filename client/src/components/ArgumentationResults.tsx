import React, { useState } from "react";
import { DocumentAnalysis, ArgumentationAnalysis } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share2, Download, FileText, Scale, Award, Target, CheckCircle, PenTool, Plus } from "lucide-react";
import ShareViaEmailModal from "./ShareViaEmailModal";
import ReportDownloadButton from "./ReportDownloadButton";

interface ArgumentationResultsProps {
  analysis: DocumentAnalysis;
  isComparative?: boolean;
}

const ArgumentationResults: React.FC<ArgumentationResultsProps> = ({ 
  analysis, 
  isComparative = false 
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  
  const argumentation = analysis.argumentationAnalysis;
  
  if (!argumentation) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <p className="text-red-700">No argumentation analysis data available.</p>
        </CardContent>
      </Card>
    );
  }

  const getDimensionIcon = (dimension: string) => {
    switch (dimension.toLowerCase()) {
      case 'proof adequacy': return <CheckCircle className="h-5 w-5" />;
      case 'claim credibility': return <Award className="h-5 w-5" />;
      case 'non-triviality': return <Target className="h-5 w-5" />;
      case 'proof quality': return <Scale className="h-5 w-5" />;
      case 'functional writing': return <PenTool className="h-5 w-5" />;
      case 'additional parameters': return <Plus className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-100";
    if (score >= 70) return "text-blue-600 bg-blue-100";
    if (score >= 55) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const dimensions = [
    { key: 'proofAdequacy', name: 'Proof Adequacy', data: argumentation.proofAdequacy },
    { key: 'claimCredibility', name: 'Claim Credibility', data: argumentation.claimCredibility },
    { key: 'nonTriviality', name: 'Non-Triviality', data: argumentation.nonTriviality },
    { key: 'proofQuality', name: 'Proof Quality', data: argumentation.proofQuality },
    { key: 'functionalWriting', name: 'Functional Writing', data: argumentation.functionalWriting },
    { key: 'additionalParameters', name: 'Additional Parameters', data: argumentation.additionalParameters }
  ];

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Scale className="h-6 w-6 text-blue-600" />
                Argumentation Analysis
                {isComparative && <Badge variant="secondary">Comparative</Badge>}
              </CardTitle>
              <p className="text-gray-600 mt-2">
                {isComparative 
                  ? "Evaluating which paper makes its case better"
                  : "Evaluating how well the paper establishes what it sets out to prove"
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share via Email
              </Button>
              <ReportDownloadButton
                analysisA={analysis}
                mode="single"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Cogency Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Overall Cogency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${getScoreColor(argumentation.overallCogency)}`}>
              {argumentation.overallCogency}/100
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">
                {argumentation.overallCogency >= 85 ? "Highly Cogent" :
                 argumentation.overallCogency >= 70 ? "Moderately Cogent" :
                 argumentation.overallCogency >= 55 ? "Somewhat Cogent" : "Poorly Cogent"}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${argumentation.overallCogency}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparative Winner (if applicable) */}
      {isComparative && argumentation.comparisonWinner && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-800">
              Comparative Verdict
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-800 mb-2">
                Winner: Paper {argumentation.comparisonWinner}
              </div>
              {argumentation.comparativeAnalysis && (
                <p className="text-blue-700">{argumentation.comparativeAnalysis}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dimension Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dimensions.map((dimension) => (
          <Card key={dimension.key} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {getDimensionIcon(dimension.name)}
                {dimension.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={getScoreColor(dimension.data.score)}>
                    {dimension.data.score}/100
                  </Badge>
                  <span className="text-sm font-medium text-gray-600">
                    {dimension.data.rating}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700">
                  {dimension.data.description}
                </p>
                
                {dimension.data.evidence && dimension.data.evidence.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Supporting Evidence
                    </h4>
                    {dimension.data.evidence.map((quote, index) => (
                      <blockquote 
                        key={index}
                        className="text-xs italic text-gray-600 border-l-2 border-gray-300 pl-2"
                      >
                        "{quote}"
                      </blockquote>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary and Verdict */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Summary & Final Verdict</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {argumentation.summary && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Summary</h4>
              <p className="text-gray-700">{argumentation.summary}</p>
            </div>
          )}
          
          {argumentation.verdict && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Final Verdict</h4>
              <p className="text-gray-700 font-medium">{argumentation.verdict}</p>
            </div>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => setShowFullReport(true)}
            className="w-full mt-4"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Full Report
          </Button>
        </CardContent>
      </Card>

      {/* Share Modal */}
      <ShareViaEmailModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        analysisA={analysis}
      />

      {/* Full Report Dialog */}
      <Dialog open={showFullReport} onOpenChange={setShowFullReport}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Argumentation Analysis Report</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded-lg">
              {analysis.formattedReport || analysis.report || "No detailed report available"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArgumentationResults;