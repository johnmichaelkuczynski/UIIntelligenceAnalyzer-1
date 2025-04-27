import React, { useState } from "react";
import { DocumentAnalysis } from "@/lib/types";
import AnalysisDimension from "./AnalysisDimension";
import { Badge } from "@/components/ui/badge";
import { Bot, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareViaEmailModal from "./ShareViaEmailModal";

interface DocumentResultsProps {
  id: "A" | "B";
  analysis: DocumentAnalysis;
}

const DocumentResults: React.FC<DocumentResultsProps> = ({ id, analysis }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  
  const dimensions = [
    analysis.dimensions.definitionCoherence,
    analysis.dimensions.claimFormation,
    analysis.dimensions.inferentialContinuity,
    analysis.dimensions.semanticLoad,
    analysis.dimensions.jargonDetection,
    analysis.dimensions.surfaceComplexity,
    analysis.dimensions.deepComplexity,
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Document {id} Analysis</h2>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => setShowShareModal(true)}
        >
          <Share2 className="h-4 w-4" />
          Share via Email
        </Button>
      </div>
      
      {/* Summary Card */}
      <div className="mb-6 bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
        <p className="text-gray-700">{analysis.summary}</p>
      </div>

      {/* Overall Intelligence Assessment */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Intelligence Assessment</h3>
        <div className="flex items-center gap-2 mb-4">
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
        <p className="text-gray-700">{analysis.overallAssessment}</p>
      </div>

      {/* Detailed Analysis Accordion */}
      <div className="border border-gray-200 rounded-md divide-y divide-gray-200 mb-6">
        {dimensions.map((dimension, index) => (
          <AnalysisDimension key={index} dimension={dimension} />
        ))}
      </div>

      {/* AI Detection Result (if available) */}
      {analysis.aiDetection && (
        <div className="bg-amber-50 p-4 rounded-md mb-4">
          <div className="flex items-start">
            <div className="mr-3 text-amber-600">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">AI Detection Result</h3>
              <p className="text-gray-700">
                This document has a <span className="font-semibold">{analysis.aiDetection.probability}% probability</span> of being AI-generated. It was analyzed using GPTZero detection tools.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Share via Email Modal */}
      <ShareViaEmailModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        analysisA={analysis}
      />
    </div>
  );
};

export default DocumentResults;
