import React, { useState, useRef } from "react";
import { DocumentAnalysis, DocumentInput as DocumentInputType, RewriteOptions, RewriteResult } from "@/lib/types";
import AnalysisDimension from "./AnalysisDimension";
import { Badge } from "@/components/ui/badge";
import { Bot, Share2, FileEdit, FileText, ClipboardCopy, Download, BrainCircuit, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareViaEmailModal from "./ShareViaEmailModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rewriteDocument, analyzeDocument } from "@/lib/analysis";
import { useToast } from "@/hooks/use-toast";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

interface DocumentResultsProps {
  id: "A" | "B";
  analysis: DocumentAnalysis;
  originalDocument?: DocumentInputType;
}

// Common rewrite instructions that users can select from, specifically designed to improve intelligence scores
const REWRITE_PRESETS = [
  {
    label: "Enhance semantic density",
    value: "semantic_density"
  },
  {
    label: "Improve recursive reasoning",
    value: "recursive_reasoning"
  },
  {
    label: "Add conceptual precision",
    value: "conceptual_precision"
  },
  {
    label: "Strengthen logical coherence",
    value: "logical_coherence"
  },
  {
    label: "Improve inferential connections",
    value: "inferential_connections"
  },
  {
    label: "Add meta-structural elements",
    value: "meta_structural"
  }
];

// Map preset values to actual instructions (optimized for intelligence score improvement)
const INSTRUCTION_MAP: Record<string, string> = {
  "semantic_density": "Increase semantic density by replacing general terms with precise ones. Maintain exact same paragraph structure. Add empirical references where possible without changing length. Ensure causal connections are explicit.",
  
  "recursive_reasoning": "Enhance recursive reasoning by nesting arguments. Every claim should include at least one self-referential element. Improve definitional clarity while maintaining exact text length.",
  
  "conceptual_precision": "Sharpen all conceptual distinctions. Replace fuzzy terms with precise ones. Introduce technical terms where appropriate while maintaining readability. Add comparative analysis between adjacent concepts.",
  
  "logical_coherence": "Strengthen logical coherence through improved transitions. Each paragraph should follow necessarily from previous one. Add counter-arguments and pre-emptive rebuttals where possible while maintaining exact same length.",
  
  "inferential_connections": "Enhance inferential connections between ideas by making implicit links explicit. Add bridging statements between concepts. Ensure that all arguments display A→B→C structure rather than just A→C.",
  
  "meta_structural": "Add meta-structural elements that comment on the logical flow. Increase self-awareness of argumentation pattern. Ensure definitional recursion without adding complexity."
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
  const [rewriteProgress, setRewriteProgress] = useState(0);
  const [rewriteProgressVisible, setRewriteProgressVisible] = useState(false);
  const [rewrittenAnalysis, setRewrittenAnalysis] = useState<DocumentAnalysis | null>(null);
  const [isAnalyzingRewrite, setIsAnalyzingRewrite] = useState(false);
  
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
  
  // Function to handle analyzing the rewritten text
  const handleAnalyzeRewrite = async () => {
    if (!rewrittenText) return;
    
    setIsAnalyzingRewrite(true);
    try {
      const analysis = await analyzeDocument({ content: rewrittenText });
      setRewrittenAnalysis(analysis);
      
      toast({
        title: "Rewrite analyzed",
        description: `Intelligence score: ${analysis.overallScore}/100`,
      });
    } catch (error) {
      console.error("Error analyzing rewritten text:", error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze the rewritten text.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingRewrite(false);
    }
  };
  
  // Function to handle downloading in different formats
  const handleExportDocument = (format: 'txt' | 'docx' | 'pdf') => {
    if (!rewrittenText) return;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `rewritten-text-${timestamp}`;
    
    if (format === 'txt') {
      // Plain text download
      const blob = new Blob([rewrittenText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = url;
        downloadLinkRef.current.download = `${filename}.txt`;
        downloadLinkRef.current.click();
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } 
    else if (format === 'docx') {
      // DOCX download using docx library
      const doc = new Document({
        sections: [{
          properties: {},
          children: rewrittenText.split('\n\n').map(paragraph => 
            new Paragraph({
              children: [new TextRun({ text: paragraph })],
            })
          )
        }]
      });
      
      Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        
        if (downloadLinkRef.current) {
          downloadLinkRef.current.href = url;
          downloadLinkRef.current.download = `${filename}.docx`;
          downloadLinkRef.current.click();
        }
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
      });
    }
    else if (format === 'pdf') {
      // PDF download using jsPDF
      const pdf = new jsPDF();
      
      // Split into pages and add text
      const textLines = pdf.splitTextToSize(rewrittenText, 180);
      let y = 10;
      const lineHeight = 7;
      
      for (let i = 0; i < textLines.length; i++) {
        if (y > 280) {
          pdf.addPage();
          y = 10;
        }
        pdf.text(textLines[i], 10, y);
        y += lineHeight;
      }
      
      pdf.save(`${filename}.pdf`);
    }
    
    toast({
      title: "Document exported",
      description: `Document exported as ${format.toUpperCase()} successfully.`
    });
  };
  
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
    setRewriteProgress(0);
    setRewriteProgressVisible(true);
    setRewrittenAnalysis(null);
    
    try {
      const options: RewriteOptions = {
        instruction: finalInstruction,
        preserveLength: true, // Default to staying within 100-110% length
        preserveDepth: true  // Default to maintaining/increasing depth
      };
      
      // For large texts, update progress periodically using a timer
      // This is a simulation since the actual progress isn't exposed by the API
      const contentLength = originalDocument.content.length;
      
      // Use a timer to simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setRewriteProgress(prev => {
          // Only update progress if still rewriting and less than 90%
          // We leave the last 10% for when the actual result comes back
          if (prev < 90) {
            return prev + (Math.random() * 5);
          }
          return prev;
        });
      }, 800);
      
      const result = await rewriteDocument(originalDocument.content, options);
      
      // Clear interval and set to 100% when done
      clearInterval(progressInterval);
      setRewriteProgress(100);
      
      // Set a small timeout before hiding progress to ensure user sees it complete
      setTimeout(() => {
        setRewriteProgressVisible(false);
      }, 500);
      
      setRewrittenText(result.rewrittenText);
      setRewriteStats(result.stats);
      
      toast({
        title: "Rewrite completed",
        description: "Text has been rewritten successfully."
      });
    } catch (error) {
      console.error("Error rewriting text:", error);
      setRewriteProgressVisible(false);
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
            {/* Intelligence improvement guidance */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <h4 className="text-sm font-medium text-blue-900 flex items-center gap-1.5 mb-2">
                <BrainCircuit className="h-4 w-4" />
                Guidelines for Improving Intelligence Score
              </h4>
              <p className="text-xs text-blue-800 mb-2">
                The rewrite feature is designed to enhance the intelligence score while maintaining the exact length of your text. The presets below are specifically engineered to improve scores across key dimensions:
              </p>
              <ul className="text-xs space-y-1 text-blue-800 mb-2 list-disc pl-4">
                <li><span className="font-medium">Semantic density</span> - Use more precise terms that convey more information</li>
                <li><span className="font-medium">Recursive reasoning</span> - Add self-reference and layered thinking patterns</li>
                <li><span className="font-medium">Logical coherence</span> - Strengthen connections between claims and evidence</li>
                <li><span className="font-medium">Definitional precision</span> - Use clearer distinctions between related concepts</li>
              </ul>
              <p className="text-xs text-blue-800">
                For custom instructions, focus on making claims more precise, adding empirical references, and ensuring logical flow between paragraphs.
              </p>
            </div>

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
                    <SelectValue placeholder="Select intelligence-enhancing approach" />
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
                  placeholder="For best results, focus on: 1) Increase semantic density 2) Add precise definitions 3) Make reasoning more recursive 4) Strengthen logical connections..."
                  className="min-h-[80px]"
                />
              </div>
            )}
            
            {/* Progress bar for rewrite process */}
            {rewriteProgressVisible && (
              <div className="my-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Rewriting document...</span>
                  <span>{Math.min(Math.round(rewriteProgress), 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                    style={{ width: `${Math.min(Math.round(rewriteProgress), 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Processing large documents may take several minutes. Please wait...
                </p>
              </div>
            )}
  
            {rewrittenText && (
              <div className="bg-gray-50 rounded-md p-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Rewritten Text</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopyText}
                      className="flex gap-1 items-center"
                    >
                      <ClipboardCopy className="h-3 w-3" />
                      Copy
                    </Button>
                    
                    {/* Document export dropdown */}
                    <div className="relative group">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex gap-1 items-center"
                      >
                        <Download className="h-3 w-3" />
                        Export as
                      </Button>
                      <div className="absolute right-0 mt-1 hidden group-hover:block bg-white shadow-lg rounded-md z-10">
                        <div className="py-1">
                          <button
                            onClick={() => handleExportDocument('txt')}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            Text (.txt)
                          </button>
                          <button
                            onClick={() => handleExportDocument('docx')}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            Word (.docx)
                          </button>
                          <button
                            onClick={() => handleExportDocument('pdf')}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            PDF (.pdf)
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Intelligence Analysis button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleAnalyzeRewrite}
                      disabled={isAnalyzingRewrite}
                      className="flex gap-1 items-center bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <BrainCircuit className="h-3 w-3" />
                      {isAnalyzingRewrite ? "Analyzing..." : "Analyze Intelligence"}
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
                
                {/* Rewritten text analysis results */}
                {rewrittenAnalysis && (
                  <div className="mt-4 border-t pt-3 border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Intelligence Analysis of Rewritten Text</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1">
                        <div className="h-2 w-full bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-600 rounded-full" 
                            style={{ width: `${rewrittenAnalysis.overallScore}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="font-semibold text-green-700">
                        {rewrittenAnalysis.overallScore}/100
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{rewrittenAnalysis.summary}</p>
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
