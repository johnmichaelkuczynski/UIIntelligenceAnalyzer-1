import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FileEdit,
  Sparkles,
  Globe,
  Search,
  RotateCw,
  Check,
  ExternalLink,
  Info,
  AlignLeft,
  Lightbulb
} from 'lucide-react';
import { 
  DocumentInput as DocumentInputType, 
  RewriteOptions, 
  EnhancementSuggestion, 
  GoogleSearchResult
} from '@/lib/types';
import { rewriteDocument } from '@/lib/analysis';

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

interface EnhancedRewriteSectionProps {
  originalDocument?: DocumentInputType;
  onRewriteComplete: (rewrittenText: string, stats: any) => void;
}

const EnhancedRewriteSection: React.FC<EnhancedRewriteSectionProps> = ({
  originalDocument,
  onRewriteComplete
}) => {
  const { toast } = useToast();
  
  // State for rewrite instructions
  const [customInstruction, setCustomInstruction] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [searchInstructions, setSearchInstructions] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("deepseek");
  
  // State for search functionality
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<GoogleSearchResult[]>([]);
  const [selectedSearchResults, setSelectedSearchResults] = useState<GoogleSearchResult[]>([]);
  const [useSearchResults, setUseSearchResults] = useState<boolean>(true);
  const [urlContents, setUrlContents] = useState<{[key: string]: string}>({});
  
  // State for AI suggestions
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<EnhancementSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<EnhancementSuggestion[]>([]);
  const [useSuggestions, setUseSuggestions] = useState<boolean>(true);
  
  // State for rewrite process
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [rewriteProgress, setRewriteProgress] = useState<number>(0);
  const [rewriteProgressVisible, setRewriteProgressVisible] = useState<boolean>(false);
  
  // Extract topics from text for search suggestions
  useEffect(() => {
    if (originalDocument?.content && !searchQuery) {
      // Basic extraction of potential search topics
      const text = originalDocument.content;
      
      // Extract meaningful words (longer than 5 chars)
      const words = text.split(/\s+/).filter(w => w.length > 5);
      const sample = words.slice(0, 50).join(' ');
      
      // Extract a few key terms
      const keyTerms = sample.match(/[A-Z][a-z]{5,}|[a-z]{7,}|epistemolog[a-z]*|natural[a-z]*/g) || [];
      if (keyTerms.length > 0) {
        const uniqueTerms = Array.from(new Set(keyTerms));
        setSearchQuery(uniqueTerms.slice(0, 3).join(' '));
      }
    }
  }, [originalDocument]);
  
  // Function to search Google for relevant content
  const performWebSearch = async () => {
    if (!searchQuery) {
      toast({
        title: "Search query required",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch("/api/search-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, numResults: 5 })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.results) {
        setSearchResults(data.results);
        // Auto-select top 2 results
        setSelectedSearchResults(data.results.slice(0, 2));
        
        toast({
          title: "Search completed",
          description: `Found ${data.results.length} relevant results`,
        });
        
        // Fetch content for top results
        for (const result of data.results.slice(0, 2)) {
          fetchContentForUrl(result.link);
        }
      } else {
        throw new Error(data.message || "Failed to search");
      }
    } catch (error) {
      console.error("Error searching web:", error);
      toast({
        title: "Search failed",
        description: "Failed to search for relevant information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Fetch content from a URL
  const fetchContentForUrl = async (url: string) => {
    try {
      const response = await fetch("/api/fetch-url-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.content) {
        setUrlContents(prev => ({
          ...prev,
          [url]: data.content
        }));
      }
    } catch (error) {
      console.error(`Error fetching content from ${url}:`, error);
      setUrlContents(prev => ({
        ...prev,
        [url]: "Could not extract content from this URL. You may need to visit it directly."
      }));
    }
  };
  
  // Function to get AI suggestions
  const getAISuggestions = async () => {
    if (!originalDocument?.content) return;
    
    setLoadingSuggestions(true);
    
    try {
      // Extract a sample of text (max 3000 chars)
      const textSample = originalDocument.content.substring(0, 3000);
      
      // Select a random AI provider for suggestions
      const providers = ["openai", "anthropic", "perplexity"];
      const selectedProvider = providers[Math.floor(Math.random() * providers.length)];
      
      const response = await fetch("/api/get-enhancement-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textSample,
          provider: selectedProvider
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
        // Auto-select high relevance suggestions
        setSelectedSuggestions(data.suggestions.filter((s: EnhancementSuggestion) => s.relevanceScore >= 8));
        
        toast({
          title: "AI suggestions generated",
          description: `Found ${data.suggestions.length} relevant enhancement suggestions`,
        });
      } else {
        throw new Error(data.message || "Failed to get suggestions");
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      toast({
        title: "Could not get suggestions",
        description: "Failed to generate personalized suggestions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };
  
  // Toggle selection of search results
  const toggleSearchResult = (result: GoogleSearchResult) => {
    if (selectedSearchResults.some(r => r.link === result.link)) {
      setSelectedSearchResults(selectedSearchResults.filter(r => r.link !== result.link));
    } else {
      setSelectedSearchResults([...selectedSearchResults, result]);
      // Fetch content if not already fetched
      if (!urlContents[result.link]) {
        fetchContentForUrl(result.link);
      }
    }
  };
  
  // Toggle selection of suggestions
  const toggleSuggestion = (suggestion: EnhancementSuggestion) => {
    if (selectedSuggestions.some(s => s.title === suggestion.title)) {
      setSelectedSuggestions(selectedSuggestions.filter(s => s.title !== suggestion.title));
    } else {
      setSelectedSuggestions([...selectedSuggestions, suggestion]);
    }
  };
  
  // Handle rewrite submission
  const handleRewrite = async () => {
    if (!originalDocument?.content) {
      toast({
        title: "Missing document",
        description: "No document content available to rewrite",
        variant: "destructive"
      });
      return;
    }
    
    // Build the final instruction from all sources
    let finalInstruction = "";
    
    // Add selected preset instruction if any
    if (selectedPreset) {
      finalInstruction += INSTRUCTION_MAP[selectedPreset] + "\n\n";
    }
    
    // Add custom instructions
    if (customInstruction) {
      finalInstruction += customInstruction + "\n\n";
    }
    
    // Add AI suggestions
    if (selectedSuggestions.length > 0 && useSuggestions) {
      finalInstruction += "INCORPORATE THESE SPECIFIC SUGGESTIONS:\n";
      selectedSuggestions.forEach((suggestion, i) => {
        finalInstruction += `${i+1}. ${suggestion.title}: ${suggestion.content}\n`;
      });
      finalInstruction += "\n";
    }
    
    // Add search results and instructions
    if (selectedSearchResults.length > 0 && useSearchResults) {
      finalInstruction += "INCORPORATE INFORMATION FROM THESE SOURCES:\n";
      
      // Add search integration instructions if provided
      if (searchInstructions) {
        finalInstruction += `Instructions for using search results: ${searchInstructions}\n\n`;
      }
      
      // Add selected search results
      selectedSearchResults.forEach((result, i) => {
        finalInstruction += `${i+1}. ${result.title}: ${result.snippet}\n`;
        
        // Add extracted content if available
        if (urlContents[result.link]) {
          const contentPreview = urlContents[result.link].substring(0, 500);
          finalInstruction += `   Content: ${contentPreview}...\n\n`;
        }
      });
    }
    
    // If no instructions provided, add a default
    if (!finalInstruction.trim()) {
      finalInstruction = "Improve the clarity and precision of the text while maintaining the original meaning. Enhance logical flow and conceptual precision.";
    }
    
    // Set up the rewrite options
    const options: RewriteOptions = {
      instruction: finalInstruction,
      preserveLength: true,
      preserveDepth: true
    };
    
    // Start rewrite process
    setIsRewriting(true);
    setRewriteProgress(0);
    setRewriteProgressVisible(true);
    
    try {
      // Use a timer to simulate progress
      const progressInterval = setInterval(() => {
        setRewriteProgress(prev => {
          if (prev < 90) {
            return prev + (Math.random() * 5);
          }
          return prev;
        });
      }, 800);
      
      // Call the rewrite function with selected provider
      const result = await rewriteDocument(originalDocument.content, options, selectedProvider);
      
      // Clear interval and set to 100%
      clearInterval(progressInterval);
      setRewriteProgress(100);
      
      // Hide progress after a short delay
      setTimeout(() => {
        setRewriteProgressVisible(false);
      }, 500);
      
      // Return the rewritten text to parent component
      onRewriteComplete(result.rewrittenText, result.stats);
      
      toast({
        title: "Rewrite completed",
        description: "Document has been rewritten successfully with " + selectedProvider
      });
    } catch (error) {
      console.error("Error rewriting document:", error);
      setRewriteProgressVisible(false);
      toast({
        title: "Rewrite failed",
        description: "An error occurred while rewriting the document",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };
  
  return (
    <div className="enhanced-rewrite-section space-y-6">
      {/* Primary Controls Card */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Rewrite Controls
          </CardTitle>
          <CardDescription>
            Customize how your document will be rewritten
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-5">
          {/* AI Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="ai-provider" className="text-sm font-medium">
              Select AI Provider
            </Label>
            <Select
              value={selectedProvider}
              onValueChange={setSelectedProvider}
            >
              <SelectTrigger id="ai-provider" className="w-full">
                <SelectValue placeholder="Choose AI provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude 3)</SelectItem>
                <SelectItem value="perplexity">Perplexity (Llama 3.1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Rewrite Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rewrite-instruction" className="text-sm font-medium">
                Custom Rewrite Instructions
              </Label>
              <Select 
                value={selectedPreset}
                onValueChange={setSelectedPreset}
              >
                <SelectTrigger className="h-8 w-52">
                  <SelectValue placeholder="Use a preset (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preset</SelectItem>
                  {REWRITE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              id="rewrite-instruction"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Provide detailed instructions for rewriting. Example: 'Replace vague terms with precise ones while maintaining original structure' or 'Enhance logical reasoning chains without changing length'"
              className="min-h-[120px]"
            />
            {selectedPreset && (
              <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-100">
                <span className="font-medium">Preset instructions:</span> {INSTRUCTION_MAP[selectedPreset]}
              </div>
            )}
          </div>
          
          {/* Web Search Section */}
          <div className="border-t border-gray-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Web Search Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="useSearchResults"
                  checked={useSearchResults} 
                  onCheckedChange={(checked) => setUseSearchResults(!!checked)}
                />
                <Label htmlFor="useSearchResults" className="text-sm cursor-pointer">
                  Include web research
                </Label>
              </div>
            </div>
            
            {useSearchResults && (
              <div className="space-y-3 bg-blue-50 p-3 rounded-md">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter search query..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={performWebSearch}
                    disabled={isSearching || !searchQuery}
                    size="sm"
                  >
                    {isSearching ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search Web
                      </>
                    )}
                  </Button>
                </div>
                
                <Textarea
                  placeholder="How should search results be used? Example: 'Use definitions from these sources' or 'Add factual context from these sources'"
                  value={searchInstructions}
                  onChange={(e) => setSearchInstructions(e.target.value)}
                  className="h-20 text-sm"
                />
                
                {searchResults.length > 0 && (
                  <div className="max-h-80 overflow-y-auto border border-blue-100 rounded-md bg-white p-2">
                    <div className="text-sm font-medium mb-2 text-blue-700">
                      Select sources to include in rewrite:
                    </div>
                    <div className="space-y-2">
                      {searchResults.map((result, idx) => (
                        <div 
                          key={idx} 
                          className={`border rounded-md p-2 text-sm ${selectedSearchResults.some(r => r.link === result.link) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`result-${idx}`}
                              checked={selectedSearchResults.some(r => r.link === result.link)}
                              onCheckedChange={() => toggleSearchResult(result)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                  {result.title}
                                  <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                                </a>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">{result.snippet}</div>
                              
                              {selectedSearchResults.some(r => r.link === result.link) && urlContents[result.link] && (
                                <div className="mt-1 text-xs max-h-24 overflow-y-auto bg-gray-50 p-1.5 rounded border border-gray-100">
                                  {urlContents[result.link].substring(0, 250)}...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* AI Suggestions */}
          <div className="border-t border-gray-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <span className="font-medium">AI Enhancement Suggestions</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="useSuggestions"
                  checked={useSuggestions} 
                  onCheckedChange={(checked) => setUseSuggestions(!!checked)}
                />
                <Label htmlFor="useSuggestions" className="text-sm cursor-pointer">
                  Generate & use suggestions
                </Label>
              </div>
            </div>
            
            {useSuggestions && (
              <div className="space-y-3">
                <Button
                  onClick={getAISuggestions}
                  disabled={loadingSuggestions || !originalDocument?.content}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {loadingSuggestions ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating suggestions...
                    </>
                  ) : suggestions.length > 0 ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Refresh Suggestions
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Suggestions
                    </>
                  )}
                </Button>
                
                {suggestions.length > 0 && (
                  <div className="max-h-80 overflow-y-auto border border-amber-100 rounded-md bg-white p-2">
                    <div className="text-sm font-medium mb-2 text-amber-700">
                      Select suggestions to include in rewrite:
                    </div>
                    <div className="space-y-2">
                      {suggestions.map((suggestion, idx) => (
                        <div 
                          key={idx} 
                          className={`border rounded-md p-2 text-sm ${selectedSuggestions.some(s => s.title === suggestion.title) ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`suggestion-${idx}`}
                              checked={selectedSuggestions.some(s => s.title === suggestion.title)}
                              onCheckedChange={() => toggleSuggestion(suggestion)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium flex items-center gap-1">
                                {suggestion.title}
                                <Badge variant="outline" className="text-xs ml-1">
                                  Relevance: {suggestion.relevanceScore}/10
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">{suggestion.content}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Progress indicator */}
      {rewriteProgressVisible && (
        <div className="bg-white rounded-lg shadow-sm border p-4 my-4">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Rewriting with {selectedProvider}</span>
            <span>{Math.min(Math.round(rewriteProgress), 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-blue-600 h-2.5 transition-all duration-300 ease-in-out" 
              style={{ width: `${Math.min(Math.round(rewriteProgress), 100)}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Rewrite Button */}
      <div className="flex justify-center pt-2">
        <Button 
          onClick={handleRewrite}
          disabled={isRewriting || !originalDocument?.content}
          size="lg"
          className="px-8 py-6 text-lg gap-2"
        >
          {isRewriting ? (
            <>
              <RotateCw className="h-5 w-5 animate-spin" />
              Rewriting Document...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Rewrite Document with {selectedProvider}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EnhancedRewriteSection;