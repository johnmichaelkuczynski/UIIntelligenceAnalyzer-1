import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Mail, X } from "lucide-react";

interface CaseAssessmentResult {
  proofEffectiveness: number;
  claimCredibility: number;
  nonTriviality: number;
  proofQuality: number;
  functionalWriting: number;
  overallCaseScore: number;
  detailedAssessment: string;
}

interface CaseAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CaseAssessmentResult | null;
  provider: string;
  documentTitle?: string;
}

export default function CaseAssessmentModal({ 
  isOpen, 
  onClose, 
  result, 
  provider, 
  documentTitle 
}: CaseAssessmentModalProps) {
  if (!result) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const dimensions = [
    { label: "Proof Effectiveness", score: result.proofEffectiveness, description: "How effectively the paper proves what it sets out to prove" },
    { label: "Claim Credibility", score: result.claimCredibility, description: "Whether claims are credible and worth proving" },
    { label: "Non-Triviality", score: result.nonTriviality, description: "Significance and importance of the conclusions" },
    { label: "Proof Quality", score: result.proofQuality, description: "Logical rigor, evidence quality, reasoning structure" },
    { label: "Functional Writing", score: result.functionalWriting, description: "Clarity, organization, and accessibility" },
  ];

  const handleDownload = () => {
    const content = `
CASE ASSESSMENT REPORT
Document: ${documentTitle || 'Untitled Document'}
Provider: ${provider}
Generated: ${new Date().toLocaleString()}

OVERALL CASE SCORE: ${result.overallCaseScore}/100

DIMENSION BREAKDOWN:
${dimensions.map(d => `${d.label}: ${d.score}/100 - ${d.description}`).join('\n')}

DETAILED ASSESSMENT:
${result.detailedAssessment}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-assessment-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-full">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">
            Case Assessment Report
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[75vh] pr-4">
          <div className="space-y-6">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Overall Case Score
                  <Badge className={`text-lg px-4 py-2 ${getScoreColor(result.overallCaseScore)}`}>
                    {result.overallCaseScore}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-2">
                  Document: {documentTitle || 'Untitled Document'}
                </div>
                <div className="text-sm text-gray-600">
                  Analyzed by: {provider}
                </div>
              </CardContent>
            </Card>

            {/* Dimension Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment Dimensions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {dimensions.map((dimension, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{dimension.label}</div>
                        <div className="text-sm text-gray-600">{dimension.description}</div>
                      </div>
                      <Badge className={`ml-4 ${getScoreColor(dimension.score)}`}>
                        {dimension.score}/100
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {result.detailedAssessment}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}