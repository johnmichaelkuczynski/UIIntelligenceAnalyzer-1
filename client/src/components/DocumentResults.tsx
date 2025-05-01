import React, { useState, useRef } from "react";
import { DocumentAnalysis, DocumentInput as DocumentInputType, RewriteOptions, RewriteResult } from "@/lib/types";
import AnalysisDimension from "./AnalysisDimension";
import { Badge } from "@/components/ui/badge";
import { Bot, Share2, FileEdit, FileText, ClipboardCopy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareViaEmailModal from "./ShareViaEmailModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rewriteDocument } from "@/lib/analysis";
import { useToast } from "@/hooks/use-toast";

interface DocumentResultsProps {
  id: "A" | "B";
  analysis: DocumentAnalysis;
  originalDocument?: DocumentInputType;
}

// Common rewrite instructions that users can select from
const REWRITE_PRESETS = [
  {
    label: "Clarify argument without adding length",
    value: "clarify_argument"
  },
  {
    label: "Preserve structure but elevate tone",
    value: "elevate_tone"
  },
  {
    label: "Make more recursive",
    value: "make_recursive"
  },
  {
    label: "Add precision without verbosity",
    value: "precision_no_verbosity"
  },
  {
    label: "Keep technical but improve readability",
    value: "improve_readability"
  },
  {
    label: "Strengthen logical connections",
    value: "strengthen_logic"
  }
];

// Map preset values to actual instructions
const INSTRUCTION_MAP: Record<string, string> = {
  "clarify_argument": "Clarify the argument without adding length or simplifying concepts",
  "elevate_tone": "Preserve structure but elevate tone while maintaining conceptual depth",
  "make_recursive": "Make argumentation more recursive without simplifying",
  "precision_no_verbosity": "Add precision without adding verbosity",
  "improve_readability": "Keep technical depth but improve readability",
  "strengthen_logic": "Strengthen logical connections between sentences"
};

const DocumentResults: React.FC<DocumentResultsProps> = ({ id, analysis, originalDocument }) => {
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewrittenText, setRewrittenText] = useState("");
  const [rewriteStats, setRewriteStats] = useState<RewriteResult["stats"] | null>(null);
  const [instruction, setInstruction] = useState<string>("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  
  // Calculate word and character count for rewritten text
  React.useEffect(() => {
    if (rewrittenText) {
      // Count words by splitting on whitespace
      const words = rewrittenText.trim().split(/\s+/).filter(Boolean);
      setWordCount(words.length);
      
      // Count characters excluding whitespace
      setCharCount(rewrittenText.length);
    } else {
      setWordCount(0);
      setCharCount(0);
    }
  }, [rewrittenText]);
  
  const handleRewrite = async () => {
    if (!originalDocument?.content) {
      toast({
        title: "Missing input",
        description: "Original document content not found. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Get the instruction (either custom or from preset)
    let finalInstruction = instruction === "custom" 
      ? customInstruction
      : INSTRUCTION_MAP[instruction] || "";
      
    if (!finalInstruction) {
      toast({
        title: "Missing instruction",
        description: "Please select or enter a rewrite instruction.",
        variant: "destructive"
      });
      return;
    }
    
    setIsRewriting(true);
    setRewrittenText("");
    setRewriteStats(null);
    
    try {
      const options: RewriteOptions = {
        instruction: finalInstruction,
        preserveLength: true, // Default to staying within 100-110% length
        preserveDepth: true  // Default to maintaining/increasing depth
      };
      
      const result = await rewriteDocument(originalDocument.content, options);
      setRewrittenText(result.rewrittenText);
      setRewriteStats(result.stats);
      
      toast({
        title: "Rewrite completed",
        description: "Text has been rewritten successfully."
      });
    } catch (error) {
      console.error("Error rewriting text:", error);
      toast({
        title: "Rewrite failed",
        description: "An error occurred while rewriting the text.",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };
  
  const handleCopyText = () => {
    navigator.clipboard.writeText(rewrittenText);
    toast({
      title: "Copied to clipboard",
      description: "The rewritten text has been copied to your clipboard."
    });
  };
  
  const handleDownload = (format: 'txt') => {
    if (!rewrittenText) return;
    
    // Simple text download
    const blob = new Blob([rewrittenText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    if (downloadLinkRef.current) {
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.download = `rewritten-text-${new Date().toISOString().slice(0, 10)}.txt`;
      downloadLinkRef.current.click();
    }
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };
  
  const calculatePercentageChange = () => {
    if (!rewriteStats) return 0;
    return Math.round(rewriteStats.lengthChange * 100);
  };
  
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2 bg-green-100 text-green-800 hover:bg-green-200"
            onClick={() => setShowRewriteModal(true)}
            disabled={!originalDocument?.content}
          >
            <FileEdit className="h-4 w-4" />
            Rewrite
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
        </div>
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
      
      {/* Rewrite Dialog */}
      <Dialog open={showRewriteModal} onOpenChange={setShowRewriteModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Rewrite with Enhanced Intelligence</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="rewrite-instruction" className="mb-1">
                Rewrite Instructions
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select 
                  onValueChange={(value) => setInstruction(value)}
                  value={instruction}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select rewrite approach" />
                  </SelectTrigger>
                  <SelectContent>
                    {REWRITE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom instruction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {instruction === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="custom-instruction">Custom Rewrite Instruction</Label>
                <Textarea
                  id="custom-instruction"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Enter specific instructions for the rewrite..."
                  className="min-h-[80px]"
                />
              </div>
            )}
            
            {rewrittenText && (
              <div className="bg-gray-50 rounded-md p-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Rewritten Text</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopyText}
                      className="flex gap-1 items-center"
                    >
                      <ClipboardCopy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownload('txt')}
                      className="flex gap-1 items-center"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>
                
                <Textarea 
                  value={rewrittenText} 
                  className="h-40 font-mono text-sm"
                  readOnly
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {wordCount} words
                  </Badge>
                  <Badge variant="outline" className="text-xs font-normal">
                    {charCount} characters
                  </Badge>
                </div>
                
                {rewriteStats && (
                  <div className="mt-2 text-sm">
                    <p>
                      <span className="font-medium">Length change:</span> {calculatePercentageChange()}%
                    </p>
                    <p>
                      <span className="font-medium">Applied instruction:</span> {rewriteStats.instructionFollowed}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRewriteModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRewrite}
              disabled={isRewriting || (!instruction || (instruction === "custom" && !customInstruction))}
              className={isRewriting ? "opacity-80" : ""}
            >
              {isRewriting ? "Rewriting..." : "Rewrite Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Hidden download link */}
      <a 
        ref={downloadLinkRef} 
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default DocumentResults;
