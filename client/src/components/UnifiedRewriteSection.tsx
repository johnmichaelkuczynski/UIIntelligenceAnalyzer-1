import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DirectAIRequest from './DirectAIRequest';
import { MathRenderer } from './MathRenderer';
import { RewriteArchive } from './RewriteArchive';
import {
  FileEdit,
  Sparkles,
  Globe,
  Search,
  RotateCw,
  ClipboardCopy,
  ExternalLink,
  Info,
  BrainCircuit,
  Download,
  ShieldAlert,
  RotateCcw,
  Bot,
  Mail,
  X
} from 'lucide-react';
import { 
  DocumentInput as DocumentInputType, 
  RewriteOptions, 
  GoogleSearchResult,
  AIDetectionResult,
  DocumentAnalysis
} from '@/lib/types';
import { rewriteDocument, analyzeDocument, checkForAI } from '@/lib/analysis';
import { Document, Packer, Paragraph, TextRun } from "docx";

// Common rewrite instructions 
const REWRITE_PRESETS = [
  { label: "Enhance semantic density", value: "semantic_density" },
  { label: "Improve recursive reasoning", value: "recursive_reasoning" },
  { label: "Add conceptual precision", value: "conceptual_precision" },
  { label: "Strengthen logical coherence", value: "logical_coherence" },
  { label: "Improve inferential connections", value: "inferential_connections" },
  { label: "Add meta-structural elements", value: "meta_structural" }
];

// Mapping of preset values to detailed instructions
const INSTRUCTION_MAP: Record<string, string> = {
  "semantic_density": "Increase semantic density by replacing general terms with precise ones. Maintain exact structure and sentence count. Add empirical references where it improves informational content. Ensure all definitional relationships are operationally clear. NEVER add academic fluff phrases.",
  
  "recursive_reasoning": "Enhance recursive reasoning by nesting arguments where logically appropriate. Introduce self-reference only where it genuinely clarifies. Emphasize logical continuity between sequential ideas. Use definitional recursion (where concept A depends on B which clarifies A). NEVER add length.",
  
  "conceptual_precision": "Sharpen all conceptual distinctions without adding jargon. Replace ambiguous terms with precise ones. Clearly differentiate between related concepts. Use operational definitions that explain how concepts work, not just what they are. AVOID unnecessary abstraction.",
  
  "logical_coherence": "Strengthen logical coherence by making implicit reasoning chains explicit. Ensure each claim follows necessarily from previous ones. Preserve compact sentences while improving inferential clarity. NEVER add transitional fluff phrases.",
  
  "inferential_connections": "Enhance inferential connections by revealing the steps between linked ideas. Show how premises lead to conclusions. Transform A→C reasoning into A→B→C without adding words. Preserve semantic compression throughout.",
  
  "meta_structural": "Clarify the logical architecture without meta-commentary. Strengthen the core argument skeleton. Reveal rather than describe the logical progression. NEVER add phrases like 'it should be noted that' or other academic filler."
};

interface UnifiedRewriteSectionProps {
  originalDocument: DocumentInputType;
  onRewriteComplete?: (text: string, stats: any) => void;
}

const UnifiedRewriteSection: React.FC<UnifiedRewriteSectionProps> = ({ 
  originalDocument,
  onRewriteComplete
}) => {
  const { toast } = useToast();
  // Main configuration
  const [selectedProvider, setSelectedProvider] = useState<string>("openai");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [rewriteMode, setRewriteMode] = useState<'rewrite' | 'add' | 'both'>('rewrite');
  const [newChunkInstructions, setNewChunkInstructions] = useState<string>("");
  const [showCompletedRewriteModal, setShowCompletedRewriteModal] = useState<boolean>(false);
  const [completedRewrite, setCompletedRewrite] = useState<string>("");
  const [viewMode, setViewMode] = useState<'normal' | 'math'>('normal');
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [rewriteProgress, setRewriteProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("rewrite");
  
  // Web search settings
  const [includeWebSearch, setIncludeWebSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<GoogleSearchResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<GoogleSearchResult[]>([]);
  const [searchInstructions, setSearchInstructions] = useState<string>("");
  const [urlContents, setUrlContents] = useState<{[key: string]: string}>({});
  
  // Result states
  const [rewrittenText, setRewrittenText] = useState<string>("");
  const [rewriteStats, setRewriteStats] = useState<any>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  
  // Advanced features
  const [isAnalyzingRewrite, setIsAnalyzingRewrite] = useState<boolean>(false);
  const [isCheckingAI, setIsCheckingAI] = useState<boolean>(false);
  const [rewrittenAnalysis, setRewrittenAnalysis] = useState<DocumentAnalysis | null>(null);
  const [aiDetectionResult, setAIDetectionResult] = useState<AIDetectionResult | null>(null);
  
  // Calculate word and character count for rewritten text
  useEffect(() => {
    if (rewrittenText) {
      // Count words by splitting on whitespace
      const words = rewrittenText.trim().split(/\s+/).filter(Boolean);
      setWordCount(words.length);
      
      // Count characters
      setCharCount(rewrittenText.length);
      
      // Auto switch to results tab when rewrite completes
      setActiveTab("results");
    } else {
      setWordCount(0);
      setCharCount(0);
    }
  }, [rewrittenText]);
  
  // Handle preset selection
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value && INSTRUCTION_MAP[value]) {
      setCustomInstructions(INSTRUCTION_MAP[value]);
    }
  };
  
  // Rewrite function
  const handleRewrite = async (textToRewrite = originalDocument?.content) => {
    if (!textToRewrite) {
      toast({
        title: "Missing content",
        description: "No text to rewrite",
        variant: "destructive"
      });
      return;
    }
    
    if (!customInstructions.trim() && !selectedPreset && rewriteMode !== 'add') {
      toast({
        title: "Instructions required",
        description: "Please provide rewrite instructions or select a preset",
        variant: "destructive"
      });
      return;
    }
    
    if ((rewriteMode === 'add' || rewriteMode === 'both') && !newChunkInstructions.trim()) {
      toast({
        title: "New chunk instructions required",
        description: "Please provide instructions for what new content to add",
        variant: "destructive"
      });
      return;
    }
    
    setIsRewriting(true);
    setRewriteProgress(0);
    
    try {
      // Build comprehensive instruction based on mode
      let finalInstruction = customInstructions.trim();
      
      if (rewriteMode === 'add') {
        finalInstruction = `KEEP EXISTING TEXT EXACTLY AS IS. ADD NEW CONTENT AS FOLLOWS: ${newChunkInstructions.trim()}`;
      } else if (rewriteMode === 'both') {
        finalInstruction = `REWRITE EXISTING TEXT: ${customInstructions.trim()}. ALSO ADD NEW CONTENT: ${newChunkInstructions.trim()}`;
      }
      
      const options: RewriteOptions = {
        instruction: finalInstruction,
        preserveLength: true,
        preserveDepth: true
      };
      
      // Progress simulation
      const progressInterval = setInterval(() => {
        setRewriteProgress(prev => {
          if (prev < 90) {
            return prev + (Math.random() * 5);
          }
          return prev;
        });
      }, 800);
      
      // Call the rewrite function with selected provider
      const result = await rewriteDocument(textToRewrite, options, selectedProvider);
      
      // Clear interval and set to 100%
      clearInterval(progressInterval);
      setRewriteProgress(100);
      
      // Store the result
      setRewrittenText(result.rewrittenText);
      setRewriteStats(result.stats);
      setCompletedRewrite(result.rewrittenText);
      
      // Reset analysis states
      setRewrittenAnalysis(null);
      setAIDetectionResult(null);
      
      // Pass result back to parent component if provided
      if (onRewriteComplete) {
        onRewriteComplete(result.rewrittenText, result.stats);
      }
      
      // Save to archive
      try {
        await fetch('/api/save-rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original: textToRewrite,
            rewritten: result.rewrittenText,
            instructions: finalInstruction,
            provider: selectedProvider,
            mode: rewriteMode
          })
        });
      } catch (error) {
        console.error('Archive save failed:', error);
      }
      
      // Show completion modal immediately
      setShowCompletedRewriteModal(true);
    } catch (error) {
      console.error("Rewrite error:", error);
      toast({
        title: "Rewrite failed",
        description: error instanceof Error ? error.message : "Failed to rewrite document",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rewrite" className="flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            Enhanced Rewrite
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Archive
          </TabsTrigger>
        </TabsList>

        {/* Main Rewrite Tab */}
        <TabsContent value="rewrite" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-blue-800">
                <Sparkles className="h-6 w-6" />
                Advanced Document Rewriting
              </CardTitle>
              <CardDescription>
                Choose how you want to enhance your document with AI-powered rewriting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-800">AI Provider</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                        <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                        <SelectItem value="perplexity">Perplexity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rewrite Mode Selection */}
                  <div className="space-y-4 mb-6">
                    <Label className="text-lg font-bold text-blue-800">Choose Your Rewrite Approach</Label>
                    <div className="grid grid-cols-1 gap-4">
                      <Card className={`p-4 cursor-pointer transition-all border-2 ${rewriteMode === 'rewrite' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-start space-x-3" onClick={() => setRewriteMode('rewrite')}>
                          <input
                            type="radio"
                            id="mode-rewrite"
                            name="rewriteMode"
                            value="rewrite"
                            checked={rewriteMode === 'rewrite'}
                            onChange={(e) => setRewriteMode(e.target.value as 'rewrite' | 'add' | 'both')}
                            className="w-5 h-5 text-blue-600 mt-1"
                          />
                          <div className="flex-1">
                            <Label htmlFor="mode-rewrite" className="text-base font-bold cursor-pointer text-blue-700">
                              REWRITE EXISTING CHUNKS ONLY
                            </Label>
                            <p className="text-sm text-gray-600 mt-2">
                              Transform and improve your current text without adding new content. Perfect for enhancing clarity, style, or depth of existing material.
                            </p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className={`p-4 cursor-pointer transition-all border-2 ${rewriteMode === 'add' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-start space-x-3" onClick={() => setRewriteMode('add')}>
                          <input
                            type="radio"
                            id="mode-add"
                            name="rewriteMode"
                            value="add"
                            checked={rewriteMode === 'add'}
                            onChange={(e) => setRewriteMode(e.target.value as 'rewrite' | 'add' | 'both')}
                            className="w-5 h-5 text-green-600 mt-1"
                          />
                          <div className="flex-1">
                            <Label htmlFor="mode-add" className="text-base font-bold cursor-pointer text-green-700">
                              ADD NEW CHUNKS ONLY
                            </Label>
                            <p className="text-sm text-gray-600 mt-2">
                              Keep your existing text unchanged and add new sections. Great for expanding topics or adding supplementary material without altering what you have.
                            </p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className={`p-4 cursor-pointer transition-all border-2 ${rewriteMode === 'both' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-start space-x-3" onClick={() => setRewriteMode('both')}>
                          <input
                            type="radio"
                            id="mode-both"
                            name="rewriteMode"
                            value="both"
                            checked={rewriteMode === 'both'}
                            onChange={(e) => setRewriteMode(e.target.value as 'rewrite' | 'add' | 'both')}
                            className="w-5 h-5 text-purple-600 mt-1"
                          />
                          <div className="flex-1">
                            <Label htmlFor="mode-both" className="text-base font-bold cursor-pointer text-purple-700">
                              REWRITE EXISTING + ADD NEW CHUNKS
                            </Label>
                            <p className="text-sm text-gray-600 mt-2">
                              Transform your current text AND add new sections. Complete document enhancement with both improvement and expansion.
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Custom Instructions for Rewriting */}
                  {(rewriteMode === 'rewrite' || rewriteMode === 'both') && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-blue-800">Rewrite Instructions</Label>
                      <div className="space-y-2">
                        <Select value={selectedPreset} onValueChange={handlePresetChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a preset or write custom instructions" />
                          </SelectTrigger>
                          <SelectContent>
                            {REWRITE_PRESETS.map((preset) => (
                              <SelectItem key={preset.value} value={preset.value}>
                                {preset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        placeholder="Enter custom rewrite instructions..."
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        rows={4}
                        className="text-sm"
                      />
                    </div>
                  )}

                  {/* New Chunk Instructions */}
                  {(rewriteMode === 'add' || rewriteMode === 'both') && (
                    <div className="space-y-4 mb-6">
                      <Label htmlFor="new-chunk-instructions" className="text-lg font-bold text-green-700">
                        📝 Instructions for New Content to Add
                      </Label>
                      <Card className="p-4 border-2 border-green-200 bg-green-50">
                        <Textarea
                          id="new-chunk-instructions"
                          placeholder="Provide lengthy and detailed instructions for what new chunks/sections to add to your document. Be as specific as possible about:

• Topics to cover (e.g., 'Add sections on knowledge of the past')
• Examples to include (e.g., 'Include examples from epistemology and temporal reasoning')
• Mathematical formulations if needed
• Philosophical arguments or perspectives
• Research areas to explore
• Connections to existing content

Example: 'Add two comprehensive new chunks: 1) A detailed section on knowledge of historical events with specific examples from ancient philosophy and how we verify past claims, including discussion of testimony and archaeological evidence. 2) A section on epistemic challenges in temporal reasoning with mathematical formulations showing how probability changes over time, including Bayesian updating for historical claims.'"
                          value={newChunkInstructions}
                          onChange={(e) => setNewChunkInstructions(e.target.value)}
                          rows={12}
                          className="text-sm min-h-[300px] border-green-300 focus:border-green-500 bg-white"
                        />
                      </Card>
                      <p className="text-sm text-green-600 font-medium">
                        💡 The more detailed your instructions, the better the AI can create relevant new content that perfectly complements your existing document.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Execute Button */}
              <div className="border-t pt-6">
                <Button
                  onClick={() => handleRewrite()}
                  disabled={
                    isRewriting ||
                    (rewriteMode === 'rewrite' && !customInstructions.trim() && !selectedPreset) ||
                    (rewriteMode === 'add' && !newChunkInstructions.trim()) ||
                    (rewriteMode === 'both' && (!customInstructions.trim() || !newChunkInstructions.trim()))
                  }
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3"
                >
                  {isRewriting ? (
                    <div className="flex items-center gap-2">
                      <RotateCw className="h-5 w-5 animate-spin" />
                      Processing... {Math.round(rewriteProgress)}%
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      {rewriteMode === 'rewrite' ? 'Rewrite Document' : 
                       rewriteMode === 'add' ? 'Add New Content' : 
                       'Rewrite & Add Content'}
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {rewrittenText ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Rewrite Complete</CardTitle>
                <CardDescription>
                  Words: {wordCount} | Characters: {charCount}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-green-50 max-h-96 overflow-y-auto">
                    <MathRenderer content={rewrittenText} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rewrite results yet. Complete a rewrite to see results here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive" className="space-y-4">
          <RewriteArchive />
        </TabsContent>
      </Tabs>

      {/* Enhanced Completion Modal */}
      <Dialog open={showCompletedRewriteModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-green-700 flex items-center gap-2">
                🎉 Your Rewrite is Complete!
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompletedRewriteModal(false)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Your document has been processed successfully. Use the options below to view, download, or share your rewritten content.
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 pt-4">
            {/* View Toggle and Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'normal' ? 'default' : 'outline'}
                  onClick={() => setViewMode('normal')}
                >
                  Normal View
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'math' ? 'default' : 'outline'}
                  onClick={() => setViewMode('math')}
                >
                  📐 Math View
                </Button>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Words: <strong>{wordCount}</strong></span>
                <span>Characters: <strong>{charCount}</strong></span>
              </div>
            </div>

            {/* Rewritten Content Display */}
            <div className="flex-1 overflow-y-auto border-2 border-green-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-blue-50">
              {viewMode === 'math' ? (
                <MathRenderer content={completedRewrite} />
              ) : (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-serif leading-relaxed">
                    {completedRewrite}
                  </pre>
                </div>
              )}
            </div>

            {/* Enhanced Action Buttons */}
            <div className="border-t-2 border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* PDF Download */}
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="text-center space-y-2">
                    <Download className="h-6 w-6 mx-auto text-red-600" />
                    <h4 className="font-semibold text-sm">Download as PDF</h4>
                    <p className="text-xs text-gray-600">Math notation preserved</p>
                    <Button
                      onClick={() => {
                        if (viewMode !== 'math') {
                          setViewMode('math');
                          setTimeout(() => {
                            toast({
                              title: "Ready for PDF Download",
                              description: "Math view activated. Now use Ctrl+P or Cmd+P and select 'Save as PDF'",
                              duration: 6000
                            });
                            window.print();
                          }, 500);
                        } else {
                          toast({
                            title: "Ready for PDF Download",
                            description: "Use Ctrl+P or Cmd+P and select 'Save as PDF' to preserve math notation",
                            duration: 6000
                          });
                          window.print();
                        }
                      }}
                      size="sm"
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      Save as PDF
                    </Button>
                  </div>
                </Card>

                {/* Word Download */}
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="text-center space-y-2">
                    <Download className="h-6 w-6 mx-auto text-blue-600" />
                    <h4 className="font-semibold text-sm">Download as Word</h4>
                    <p className="text-xs text-gray-600">Compatible with MS Word</p>
                    <Button
                      onClick={() => {
                        // Create a Word document
                        const doc = new Document({
                          sections: [{
                            properties: {},
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: completedRewrite,
                                    size: 24
                                  })
                                ]
                              })
                            ]
                          }]
                        });

                        Packer.toBlob(doc).then(blob => {
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `rewritten-document-${new Date().toISOString().split('T')[0]}.docx`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Word Document Downloaded",
                            description: "Your rewritten document has been saved as a Word file"
                          });
                        });
                      }}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Save as Word
                    </Button>
                  </div>
                </Card>

                {/* Email Share */}
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="text-center space-y-2">
                    <Mail className="h-6 w-6 mx-auto text-green-600" />
                    <h4 className="font-semibold text-sm">Share via Email</h4>
                    <p className="text-xs text-gray-600">Send to collaborators</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                          <Mail className="h-4 w-4 mr-1" />
                          Send Email
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Share Rewritten Document</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="email">Recipient Email</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="colleague@university.edu"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                              id="subject"
                              placeholder="Rewritten Document"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                              id="message"
                              placeholder="Please find the rewritten document attached..."
                              rows={3}
                              className="mt-1"
                            />
                          </div>
                          <Button
                            onClick={async () => {
                              const email = (document.getElementById('email') as HTMLInputElement)?.value;
                              const subject = (document.getElementById('subject') as HTMLInputElement)?.value || 'Rewritten Document';
                              const message = (document.getElementById('message') as HTMLTextAreaElement)?.value || 'Please find the rewritten document below.';
                              
                              if (!email) {
                                toast({
                                  title: "Email required",
                                  description: "Please enter a recipient email address",
                                  variant: "destructive"
                                });
                                return;
                              }

                              try {
                                const response = await fetch('/api/share-simple-email', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    to: email,
                                    subject: subject,
                                    content: completedRewrite,
                                    message: message
                                  })
                                });

                                if (response.ok) {
                                  toast({
                                    title: "Email sent successfully",
                                    description: `Rewritten document sent to ${email}`
                                  });
                                } else {
                                  throw new Error('Failed to send email');
                                }
                              } catch (error) {
                                toast({
                                  title: "Email failed",
                                  description: "Could not send email. Please try again.",
                                  variant: "destructive"
                                });
                              }
                            }}
                            className="w-full"
                          >
                            Send Email
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              </div>
              
              {/* Close Button */}
              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => setShowCompletedRewriteModal(false)}
                  variant="outline"
                  size="lg"
                  className="px-8"
                >
                  Close Rewrite View
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedRewriteSection;