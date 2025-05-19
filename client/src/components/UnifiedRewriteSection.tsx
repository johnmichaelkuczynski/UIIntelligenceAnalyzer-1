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
  Bot
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
import { jsPDF } from "jspdf";

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
  
  // Refs
  const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);
  
  // Set up hidden download link for exports
  useEffect(() => {
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    downloadLinkRef.current = link;
    
    return () => {
      if (link && document.body.contains(link)) {
        document.body.removeChild(link);
      }
    };
  }, []);
  
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
  
  // Handle intelligent research based on complex instructions
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Research instructions required",
        description: "Please provide detailed research instructions",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Extract relevant search terms from the complex instructions
      // This is a simple extraction - in a full implementation this would be
      // much more sophisticated and would use an LLM to parse the instructions
      const extractTerms = (instructions: string) => {
        // Remove common instruction phrases
        let cleaned = instructions
          .replace(/find content about/i, '')
          .replace(/ask openai|ask claude|ask perplexity|discuss|explain/gi, '')
          .replace(/relationship between/gi, '')
          .replace(/what it thinks|how much|how many/gi, '')
          .trim();
          
        // Extract key phrases (simplistic approach)
        const keyPhrases = cleaned.match(/["'](.+?)["']|[A-Z][A-Za-z]{2,}(?:\s+[A-Z][A-Za-z]{2,}){0,3}/g) || [];
        
        // Extract remaining keywords
        const keywords = cleaned
          .replace(/[^\w\s-]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3 && !['about', 'what', 'when', 'where', 'which', 'there', 'their', 'that'].includes(word.toLowerCase()));
          
        // Combine into search queries
        const terms = [...keyPhrases];
        
        // If no phrases found, use the top keywords
        if (terms.length === 0 && keywords.length > 0) {
          terms.push(keywords.slice(0, 5).join(' '));
        }
        
        return terms.length > 0 ? terms : [cleaned.split(' ').slice(0, 6).join(' ')];
      };
      
      const searchTerms = extractTerms(searchQuery);
      let allResults: any[] = [];
      
      // Perform searches with extracted terms
      for (const term of searchTerms) {
        const response = await fetch("/api/search-google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: term, numResults: 3 })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        
        if (data.success && data.results) {
          allResults = [...allResults, ...data.results];
        }
      }
      
      // Remove duplicates
      const uniqueResults = allResults.filter((result, index, self) => 
        index === self.findIndex(r => r.link === result.link)
      );
      
      if (uniqueResults.length > 0) {
        setSearchResults(uniqueResults);
        toast({
          title: "Research completed",
          description: `Found ${uniqueResults.length} relevant results based on your instructions`
        });
        
        // Automatically fetch content from the top results
        for (const result of uniqueResults.slice(0, 3)) {
          fetchUrlContent(result.link);
        }
      } else {
        toast({
          title: "Limited results",
          description: "No search results found. Try refining your research instructions."
        });
      }
    } catch (error) {
      console.error("Research error:", error);
      toast({
        title: "Research failed",
        description: error instanceof Error ? error.message : "Could not perform web research",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle selecting/deselecting search results
  const handleSelectResult = (result: GoogleSearchResult) => {
    setSelectedResults([...selectedResults, result]);
    fetchUrlContent(result.link);
  };
  
  const handleDeselectResult = (result: GoogleSearchResult) => {
    setSelectedResults(selectedResults.filter(r => r.link !== result.link));
  };
  
  // Fetch content from URL
  const fetchUrlContent = async (url: string) => {
    try {
      const response = await fetch("/api/fetch-url-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.content) {
        setUrlContents(prev => ({
          ...prev,
          [url]: data.content
        }));
      }
    } catch (error) {
      console.error(`Error fetching content from ${url}:`, error);
    }
  };
  
  // Rewrite function - can be called with any text (original or already rewritten for recursive rewrites)
  const handleRewrite = async (textToRewrite = originalDocument?.content) => {
    if (!textToRewrite) {
      toast({
        title: "Missing content",
        description: "No text to rewrite",
        variant: "destructive"
      });
      return;
    }
    
    if (!customInstructions.trim() && !selectedPreset) {
      toast({
        title: "Instructions required",
        description: "Please provide rewrite instructions or select a preset",
        variant: "destructive"
      });
      return;
    }
    
    setIsRewriting(true);
    setRewriteProgress(0);
    
    try {
      const options: RewriteOptions = {
        instruction: customInstructions.trim(),
        preserveLength: true,
        preserveDepth: true
      };
      
      // Add web search content if enabled and results selected
      if (includeWebSearch && selectedResults.length > 0) {
        options.webContent = {
          results: selectedResults,
          contents: urlContents,
          instructions: searchInstructions
        };
      }
      
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
      
      // Reset analysis states
      setRewrittenAnalysis(null);
      setAIDetectionResult(null);
      
      // Pass result back to parent component if provided
      if (onRewriteComplete) {
        onRewriteComplete(result.rewrittenText, result.stats);
      }
      
      toast({
        title: "Rewrite complete",
        description: "Document has been rewritten successfully"
      });
      
      // Auto-switch to results tab
      setActiveTab("results");
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
  
  // Analyze rewritten text
  const handleAnalyzeRewrite = async () => {
    if (!rewrittenText) {
      toast({
        title: "Missing rewritten text",
        description: "Please rewrite the document first",
        variant: "destructive"
      });
      return;
    }
    
    setIsAnalyzingRewrite(true);
    try {
      const analysis = await analyzeDocument({ content: rewrittenText }, selectedProvider);
      setRewrittenAnalysis(analysis);
      
      toast({
        title: "Analysis complete",
        description: `Intelligence score: ${analysis.overallScore}/100`
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze rewritten text",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingRewrite(false);
    }
  };
  
  // Check AI detection
  const handleCheckAI = async () => {
    if (!rewrittenText) {
      toast({
        title: "Missing rewritten text",
        description: "Please rewrite the document first",
        variant: "destructive"
      });
      return;
    }
    
    setIsCheckingAI(true);
    try {
      const result = await checkForAI({ content: rewrittenText });
      setAIDetectionResult(result);
      
      toast({
        title: "AI detection complete",
        description: `AI probability: ${result.probability}%`
      });
    } catch (error) {
      console.error("AI detection error:", error);
      toast({
        title: "AI detection failed",
        description: "Failed to check for AI",
        variant: "destructive"
      });
    } finally {
      setIsCheckingAI(false);
    }
  };
  
  // Handle copy to clipboard
  const handleCopyText = () => {
    if (!rewrittenText) return;
    
    navigator.clipboard.writeText(rewrittenText);
    toast({
      title: "Copied to clipboard",
      description: "Rewritten text copied to clipboard"
    });
  };
  
  // Handle document export
  const handleExportDocument = (format: 'txt' | 'docx' | 'pdf') => {
    if (!rewrittenText || !downloadLinkRef.current) return;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `rewritten-text-${timestamp}`;
    
    if (format === 'txt') {
      // Plain text download
      const blob = new Blob([rewrittenText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.download = `${filename}.txt`;
      downloadLinkRef.current.click();
      
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
        
        downloadLinkRef.current!.href = url;
        downloadLinkRef.current!.download = `${filename}.docx`;
        downloadLinkRef.current!.click();
        
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
      title: "Export complete",
      description: `Document exported as ${format.toUpperCase()}`
    });
  };
  
  // Reset the whole process
  const resetAll = () => {
    setRewrittenText("");
    setRewriteStats(null);
    setRewrittenAnalysis(null);
    setAIDetectionResult(null);
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="rewrite" className="flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            Rewrite Configuration
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Rewrite Results
          </TabsTrigger>
        </TabsList>
        
        {/* Configuration Tab */}
        <TabsContent value="rewrite" className="space-y-4">
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-800">Document Rewrite</CardTitle>
              </div>
              <CardDescription>
                Configure how your document will be rewritten with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="provider">Select AI Provider</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                >
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="OpenAI (GPT-4o)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Rewrite Instructions */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="custom-instructions">Rewrite Instructions</Label>
                  <Select
                    value={selectedPreset}
                    onValueChange={handlePresetChange}
                  >
                    <SelectTrigger id="preset" className="w-[180px]">
                      <SelectValue placeholder="Use a preset (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {REWRITE_PRESETS.map(preset => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  id="custom-instructions"
                  placeholder="Provide detailed instructions for rewriting. Example: 'Replace vague terms with precise ones while maintaining original structure' or 'Enhance logical reasoning chains without changing length'"
                  className="min-h-[100px]"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                />
              </div>
              
              {/* Web Search Integration */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <Label 
                    htmlFor="include-web-search" 
                    className="flex items-center gap-2 text-blue-800 font-medium"
                  >
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span>Web Search Integration</span>
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-web-search" 
                      checked={includeWebSearch}
                      onCheckedChange={(checked) => setIncludeWebSearch(checked as boolean)}
                    />
                    <Label 
                      htmlFor="include-web-search" 
                      className="text-sm font-normal cursor-pointer"
                    >
                      Include web research
                    </Label>
                  </div>
                </div>
              </div>
              
              {/* Web Search Query Input - only shown when web search is enabled */}
              {includeWebSearch && (
                <>
                  <div className="space-y-2 pt-1">
                    <Label htmlFor="search-query" className="flex items-center gap-1">
                      <Search className="h-4 w-4 text-blue-600" />
                      <span>Research Instructions</span>
                    </Label>
                    <Textarea
                      id="search-query"
                      placeholder="Provide detailed research instructions, e.g.: 'Find content about how metaknowledge is implicated in first-order knowledge, focusing on epistemological frameworks. Ask the LLM how these concepts relate to the document's central arguments.'"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="shrink-0"
                      >
                        {isSearching ? (
                          <>
                            <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                            Researching...
                          </>
                        ) : (
                          <>
                            <Globe className="h-4 w-4 mr-2" />
                            Begin Research
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Web Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-600" />
                        <span>Search Results</span>
                        <Badge variant="outline" className="ml-2">
                          {searchResults.length} results
                        </Badge>
                      </Label>
                      <div className="max-h-[300px] overflow-y-auto border rounded-md p-2 space-y-2">
                        {searchResults.map((result, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2 rounded-md border flex items-start gap-3 ${
                              selectedResults.some(r => r.link === result.link) 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'border-gray-100 hover:bg-gray-50'
                            }`}
                          >
                            <Checkbox
                              id={`result-${idx}`}
                              checked={selectedResults.some(r => r.link === result.link)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleSelectResult(result);
                                } else {
                                  handleDeselectResult(result);
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <Label 
                                  htmlFor={`result-${idx}`}
                                  className="text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                                >
                                  {result.title}
                                </Label>
                                <a 
                                  href={result.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-gray-500 flex items-center gap-1 ml-2 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{result.snippet}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Web Search Instructions */}
                      <div className="space-y-2">
                        <Label htmlFor="search-instructions" className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-600" />
                          <span>Integration Instructions for the AI</span>
                        </Label>
                        <Textarea
                          id="search-instructions"
                          placeholder="Provide detailed instructions for how the AI should process and integrate the research, e.g.: 'Analyze how these sources define metacognition vs. metaknowledge. Extract key philosophical positions from each source. Compare conflicting viewpoints if present. Integrate findings by showing how they provide a more nuanced understanding of knowledge structures than was present in the original document.'"
                          className="min-h-[120px]"
                          value={searchInstructions}
                          onChange={(e) => setSearchInstructions(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Rewrite Button */}
              <Button 
                onClick={() => handleRewrite()}
                disabled={isRewriting || (!customInstructions.trim() && !selectedPreset)}
                className="w-full"
              >
                {isRewriting ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Rewriting Document...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Rewrite Document with {selectedProvider === 'openai' ? 'OpenAI' : 
                                         selectedProvider === 'anthropic' ? 'Anthropic' : 
                                         'Perplexity'}
                  </>
                )}
              </Button>
              
              {/* Progress bar for rewrite process */}
              {isRewriting && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Rewriting document...</span>
                    <span>{Math.round(rewriteProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${rewriteProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {!rewrittenText ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <FileEdit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Rewritten Text Yet</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Configure and run the rewrite process to see results here.
              </p>
              <Button 
                onClick={() => setActiveTab("rewrite")}
                variant="outline"
              >
                Go to Rewrite Configuration
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      Rewritten Document
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {/* Copy Text */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyText}
                        className="flex items-center gap-1"
                      >
                        <ClipboardCopy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                      
                      {/* Export Dropdown */}
                      <div className="relative group">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export
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
                      
                      {/* AI Detection Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCheckAI}
                        disabled={isCheckingAI}
                        className="flex items-center gap-1"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {isCheckingAI ? "Checking..." : "Check AI"}
                      </Button>
                      
                      {/* Intelligence Analysis Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyzeRewrite}
                        disabled={isAnalyzingRewrite}
                        className="flex items-center gap-1"
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        {isAnalyzingRewrite ? "Analyzing..." : "Analyze Intelligence"}
                      </Button>
                      
                      {/* Rewrite Again - recursive rewrites */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRewrite(rewrittenText)}
                        disabled={isRewriting}
                        className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        Rewrite Again
                      </Button>
                      
                      {/* Reset Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetAll}
                        className="flex items-center gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Text Content */}
                  <Textarea
                    value={rewrittenText}
                    className="min-h-[300px] font-mono text-sm"
                    readOnly
                  />
                  
                  {/* Text Stats */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-md border">
                      <p className="text-gray-500 mb-1">Word Count</p>
                      <p className="font-medium">{wordCount} words</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md border">
                      <p className="text-gray-500 mb-1">Character Count</p>
                      <p className="font-medium">{charCount} characters</p>
                    </div>
                    {rewriteStats?.lengthChange !== undefined && (
                      <div className="bg-gray-50 p-3 rounded-md border">
                        <p className="text-gray-500 mb-1">Length Change</p>
                        <p className={`font-medium ${
                          rewriteStats.lengthChange > 0.1 
                            ? 'text-amber-600' 
                            : rewriteStats.lengthChange < -0.1 
                              ? 'text-blue-600' 
                              : 'text-green-600'
                        }`}>
                          {rewriteStats.lengthChange > 0 ? '+' : ''}
                          {Math.round(rewriteStats.lengthChange * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* AI Detection Result */}
                  {aiDetectionResult && (
                    <div className={`p-4 rounded-md ${
                      aiDetectionResult.probability > 70 
                        ? 'bg-amber-50 border border-amber-200' 
                        : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex items-start">
                        <div className="mr-3">
                          <ShieldAlert className={`h-5 w-5 ${
                            aiDetectionResult.probability > 70 
                              ? 'text-amber-600' 
                              : 'text-green-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">AI Detection Result</h3>
                          <p className="text-gray-700">
                            This rewritten text has a <span className="font-semibold">{aiDetectionResult.probability}% probability</span> of being AI-generated.
                          </p>
                          {aiDetectionResult.probability > 70 && (
                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRewrite(rewrittenText)}
                                className="text-sm"
                              >
                                <Bot className="h-3.5 w-3.5 mr-1" />
                                Try rewriting again to reduce AI detection
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Intelligence Analysis Result */}
                  {rewrittenAnalysis && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          <BrainCircuit className="h-4 w-4 text-blue-600" />
                          Intelligence Analysis
                        </h3>
                        <Badge className="bg-blue-600">
                          Score: {rewrittenAnalysis.overallScore}/100
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-3">{rewrittenAnalysis.summary}</p>
                      <div className="grid sm:grid-cols-3 gap-3 text-sm">
                        {rewrittenAnalysis.dimensions && Object.entries(rewrittenAnalysis.dimensions).map(([key, dimension]) => (
                          dimension && typeof dimension === 'object' ? (
                            <div key={key} className="bg-white p-3 rounded-md border">
                              <p className="font-medium">{key}: {typeof dimension.score === 'number' ? dimension.score : typeof dimension.rating === 'string' ? dimension.rating : 'N/A'}</p>
                              <p className="text-xs text-gray-600 mt-1">{dimension.summary || dimension.description || ""}</p>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedRewriteSection;