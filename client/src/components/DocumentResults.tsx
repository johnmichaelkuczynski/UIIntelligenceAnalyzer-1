import React, { useState, useRef } from "react";
import { DocumentAnalysis, DocumentInput as DocumentInputType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Bot, Share2, FileText, ClipboardCopy, Download, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareViaEmailModal from "./ShareViaEmailModal";
import AIDetectionModal from "./AIDetectionModal";
import CognitiveProfileDisplay from "./CognitiveProfileDisplay";
import { useToast } from "@/hooks/use-toast";

interface DocumentResultsProps {
  id: "A" | "B";
  analysis: DocumentAnalysis;
  originalDocument?: DocumentInputType;
}

// Helper function to check if the analysis result contains an error
function isErrorAnalysis(analysis: any): boolean {
  // Check for HTML-like error messages that might come from API errors
  if (typeof analysis?.formattedReport === 'string' && 
     (analysis.formattedReport.includes('<!DOCTYPE html>') || 
      analysis.formattedReport.includes('<html') ||
      analysis.formattedReport.includes('Error:') ||
      analysis.error === true)) {
    return true;
  }
  return false;
}

const DocumentResults: React.FC<DocumentResultsProps> = ({ id, analysis, originalDocument }) => {
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAIDetectionModal, setShowAIDetectionModal] = useState(false);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  
  // Function to copy report to clipboard
  const handleCopyReport = () => {
    if (analysis.formattedReport) {
      navigator.clipboard.writeText(analysis.formattedReport);
      toast({
        title: "Copied to clipboard",
        description: "The cognitive profile has been copied to your clipboard."
      });
    }
  };
  
  // Function to download report as text file
  const handleDownloadReport = () => {
    if (analysis.formattedReport) {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `cognitive-profile-${timestamp}.txt`;
      const blob = new Blob([analysis.formattedReport], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = url;
        downloadLinkRef.current.download = filename;
        downloadLinkRef.current.click();
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast({
        title: "Report downloaded",
        description: "The cognitive profile has been downloaded as a text file."
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Document {id} Analysis</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2 bg-amber-100 text-amber-800 hover:bg-amber-200"
            onClick={() => setShowAIDetectionModal(true)}
            disabled={!originalDocument?.content}
          >
            <ShieldAlert className="h-4 w-4" />
            Check AI
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="h-4 w-4" />
            Share via Email
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleCopyReport}
          >
            <ClipboardCopy className="h-4 w-4" />
            Copy
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleDownloadReport}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
      
      {/* Display the cognitive profile directly from the AI without modifications */}
      <CognitiveProfileDisplay 
        analysisText={analysis.formattedReport || "No analysis available."} 
        provider={analysis.provider || "AI"} 
      />
      
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
                This document has a <span className="font-semibold">{analysis.aiDetection.probability}% probability</span> of being AI-generated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Share via Email Modal */}
      <ShareViaEmailModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        reportContent={analysis.formattedReport || "No analysis available."}
        subjectPrefix={`Cognitive Profile Analysis - Document ${id}`}
      />
      
      {/* AI Detection Modal */}
      <AIDetectionModal
        isOpen={showAIDetectionModal}
        onClose={() => setShowAIDetectionModal(false)}
        result={analysis.aiDetection}
        isLoading={isCheckingAI}
      />
      
      {/* Hidden download link */}
      <a ref={downloadLinkRef} style={{ display: 'none' }} />
    </div>
  );
};

export default DocumentResults;