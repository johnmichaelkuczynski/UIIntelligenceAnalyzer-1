import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  RotateCcw,
  Plus,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  DocumentInput as DocumentInputType, 
  RewriteOptions, 
  EnhancementSuggestion, 
  GoogleSearchResult, 
  EnhancedRewriteOptions 
} from '@/lib/types';
import { rewriteDocument } from '@/lib/analysis';

// Map preset values to actual instructions (optimized for intelligence score improvement)
const INSTRUCTION_MAP: Record<string, string> = {
  "semantic_density": "Increase semantic density by replacing general terms with precise ones. Maintain exact structure and sentence count. Add empirical references where it improves informational content. Ensure all definitional relationships are operationally clear. NEVER add academic fluff phrases.",
  
  "recursive_reasoning": "Enhance recursive reasoning by nesting arguments where logically appropriate. Introduce self-reference only where it genuinely clarifies. Emphasize logical continuity between sequential ideas. Use definitional recursion (where concept A depends on B which clarifies A). NEVER add length.",
  
  "conceptual_precision": "Sharpen all conceptual distinctions without adding jargon. Replace ambiguous terms with precise ones. Clearly differentiate between related concepts. Use operational definitions that explain how concepts work, not just what they are. AVOID unnecessary abstraction.",
  
  "logical_coherence": "Strengthen logical coherence by making implicit reasoning chains explicit. Ensure each claim follows necessarily from previous ones. Preserve compact sentences while improving inferential clarity. NEVER add transitional fluff phrases.",
  
  "inferential_connections": "Enhance inferential connections by revealing the steps between linked ideas. Show how premises lead to conclusions. Transform A→C reasoning into A→B→C without adding words. Preserve semantic compression throughout.",
  
  "meta_structural": "Clarify the logical architecture without meta-commentary. Strengthen the core argument skeleton. Reveal rather than describe the logical progression. NEVER add phrases like 'it should be noted that' or other academic filler."
};

// Common rewrite instructions 
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

interface EnhancedRewriteSectionProps {
  originalDocument?: DocumentInputType;
  onRewriteComplete: (rewrittenText: string, stats: any) => void;
}

const EnhancedRewriteSection: React.FC<EnhancedRewriteSectionProps> = ({
  originalDocument,
  onRewriteComplete
}) => {
  const { toast } = useToast();
  
  // State for rewrite options
  const [activeTab, setActiveTab] = useState<string>('instructions');
  const [instruction, setInstruction] = useState<string>("");
  const [customInstruction, setCustomInstruction] = useState<string>("");
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [rewriteProgress, setRewriteProgress] = useState<number>(0);
  const [rewriteProgressVisible, setRewriteProgressVisible] = useState<boolean>(false);
  
  // State for AI suggestions
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<EnhancementSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<EnhancementSuggestion[]>([]);
  const [includeSuggestions, setIncludeSuggestions] = useState<boolean>(true);
  
  // State for web search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<GoogleSearchResult[]>([]);
  const [selectedSearchResults, setSelectedSearchResults] = useState<GoogleSearchResult[]>([]);
  const [includeSearchResults, setIncludeSearchResults] = useState<boolean>(true);
  const [urlContents, setUrlContents] = useState<{[key: string]: string}>({});
  
  // Functions to get AI suggestions and perform web searches
  const getAISuggestions = async () => {
    if (!originalDocument?.content) return;
    
    setLoadingSuggestions(true);
    // Call the enhancement suggestions API
    try {
      // Extract a sample of text for AI suggestions (max 3000 chars to avoid overwhelming the API)
      const textSample = originalDocument.content.substring(0, 3000);
      
      // Select a random AI provider for suggestions
      const providers = ["openai", "anthropic", "perplexity"];
      const selectedProvider = providers[Math.floor(Math.random() * providers.length)];
      
      const response = await fetch("/api/get-enhancement-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
      
      // Fallback suggestions if API fails
      const fallbackSuggestions: EnhancementSuggestion[] = [
        {
          title: "Add context on epistemological naturalization",
          content: "Incorporate W.V. Quine's perspective on naturalized epistemology from 'Epistemology Naturalized' (1969), where he argues that epistemology should be viewed as a chapter of psychology.",
          source: "AI Analysis",
          relevanceScore: 9
        },
        {
          title: "Include scientific methodology perspective",
          content: "Add information on how scientific methodology itself informs epistemological questions, particularly how empirical studies validate or invalidate knowledge claims.",
          source: "AI Analysis",
          relevanceScore: 8
        },
        {
          title: "Address criticisms of naturalized epistemology",
          content: "Acknowledge critiques from philosophers like Jaegwon Kim who argue that naturalized epistemology abandons the normative aspect of traditional epistemology.",
          source: "AI Analysis",
          relevanceScore: 7
        }
      ];
      
      setSuggestions(fallbackSuggestions);
      setSelectedSuggestions(fallbackSuggestions.filter(s => s.relevanceScore >= 8));
      
      toast({
        title: "Using default suggestions",
        description: "Could not get personalized suggestions. Using defaults instead.",
        variant: "destructive"
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };
  
  const performWebSearch = async () => {
    if (!searchQuery) {
      toast({
        title: "Search query required",
        description: "Please enter a search term",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    try {
      // Call the Google Search API
      const response = await fetch("/api/search-google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: searchQuery,
          numResults: 5
        })
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
        
        // Fetch content for the selected search results
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
  
  // Helper function to fetch content from a URL
  const fetchContentForUrl = async (url: string) => {
    try {
      const response = await fetch("/api/fetch-url-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.content) {
        // Update URL contents
        setUrlContents(prev => ({
          ...prev,
          [url]: data.content
        }));
      }
    } catch (error) {
      console.error(`Error fetching content from ${url}:`, error);
      // Set a fallback message
      setUrlContents(prev => ({
        ...prev,
        [url]: "Could not extract content from this URL. You may need to visit it directly."
      }));
    }
  };
  
  // Toggle selection of suggestions and search results
  const toggleSuggestion = (suggestion: EnhancementSuggestion) => {
    if (selectedSuggestions.some(s => s.title === suggestion.title)) {
      setSelectedSuggestions(selectedSuggestions.filter(s => s.title !== suggestion.title));
    } else {
      setSelectedSuggestions([...selectedSuggestions, suggestion]);
    }
  };
  
  const toggleSearchResult = (result: GoogleSearchResult) => {
    if (selectedSearchResults.some(r => r.link === result.link)) {
      setSelectedSearchResults(selectedSearchResults.filter(r => r.link !== result.link));
    } else {
      setSelectedSearchResults([...selectedSearchResults, result]);
      
      // In a real implementation, this would fetch the content of the URL
      if (!urlContents[result.link]) {
        // Mock fetching content
        setTimeout(() => {
          setUrlContents({
            ...urlContents,
            [result.link]: "This is simulated content from the web page that would be extracted in a real implementation..."
          });
        }, 500);
      }
    }
  };
  
  // Extract topics from text for search suggestions
  useEffect(() => {
    if (originalDocument?.content && !searchQuery) {
      // Very basic extraction of potential search topics
      const text = originalDocument.content;
      const words = text.split(/\s+/).filter(w => w.length > 5);
      const sample = words.slice(0, 50).join(' ');
      
      // Extract a few key terms - this is very simplified
      const keyTerms = sample.match(/[A-Z][a-z]{5,}|epistemolog[a-z]*|natural[a-z]*/g) || [];
      if (keyTerms.length > 0) {
        const uniqueTerms = Array.from(new Set(keyTerms));
        setSearchQuery(uniqueTerms.slice(0, 3).join(' '));
      } else {
        setSearchQuery("epistemology naturalized");
      }
    }
  }, [originalDocument]);
  
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
    
    // Get the final instruction
    let finalInstruction = instruction === "custom" 
      ? customInstruction
      : INSTRUCTION_MAP[instruction] || "";
      
    if (!finalInstruction) {
      toast({
        title: "Missing instruction",
        description: "Please select or enter a rewrite instruction",
        variant: "destructive"
      });
      return;
    }
    
    // Enhance the instruction with selected information
    if (selectedSuggestions.length > 0 && includeSuggestions) {
      finalInstruction += "\n\nINCORPORATE THESE AI SUGGESTIONS:\n";
      selectedSuggestions.forEach((suggestion, i) => {
        finalInstruction += `${i+1}. ${suggestion.title}: ${suggestion.content}\n`;
      });
    }
    
    if (selectedSearchResults.length > 0 && includeSearchResults) {
      finalInstruction += "\n\nINCORPORATE INFORMATION FROM THESE SOURCES:\n";
      selectedSearchResults.forEach((result, i) => {
        finalInstruction += `${i+1}. ${result.title}: ${result.snippet}\n`;
        if (urlContents[result.link]) {
          finalInstruction += `   Content excerpt: ${urlContents[result.link].substring(0, 200)}...\n`;
        }
      });
    }
    
    // Set up the rewrite options
    const options: RewriteOptions = {
      instruction: finalInstruction,
      preserveLength: true,
      preserveDepth: true
    };
    
    setIsRewriting(true);
    setRewriteProgress(0);
    setRewriteProgressVisible(true);
    
    try {
      // Use a timer to simulate progress
      const progressInterval = setInterval(() => {
        setRewriteProgress(prev => {
          // Only update progress if still rewriting and less than 90%
          if (prev < 90) {
            return prev + (Math.random() * 5);
          }
          return prev;
        });
      }, 800);
      
      // In a real implementation, this would call the actual rewrite function
      const result = await rewriteDocument(originalDocument.content, options);
      
      // Clear interval and set to 100% when done
      clearInterval(progressInterval);
      setRewriteProgress(100);
      
      // Set a small timeout before hiding progress
      setTimeout(() => {
        setRewriteProgressVisible(false);
      }, 500);
      
      // Pass the result back to the parent component
      onRewriteComplete(result.rewrittenText, result.stats);
      
      toast({
        title: "Rewrite completed",
        description: "Document has been rewritten successfully"
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
    <div className="enhanced-rewrite-section space-y-4">
      <Tabs defaultValue="instructions" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="instructions">
            <FileEdit className="h-4 w-4 mr-2" />
            Rewrite Instructions
          </TabsTrigger>
          <TabsTrigger value="aiSuggestions">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Suggestions {selectedSuggestions.length > 0 && `(${selectedSuggestions.length})`}
          </TabsTrigger>
          <TabsTrigger value="webSearch">
            <Globe className="h-4 w-4 mr-2" />
            Web Search {selectedSearchResults.length > 0 && `(${selectedSearchResults.length})`}
          </TabsTrigger>
        </TabsList>
        
        {/* Instructions Tab */}
        <TabsContent value="instructions" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-900 flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4" />
              Intelligent Rewrite Guidelines
            </h4>
            <div className="text-xs text-blue-800 mb-2">
              <p className="mb-1">To enhance intelligence scores, our rewrite engine:</p>
              <ul className="space-y-1 list-disc pl-4">
                <li><span className="font-medium">Preserves semantic compression</span> - Never adding words without adding value</li>
                <li><span className="font-medium">Maintains recursive structures</span> - Keeping logical patterns intact</li>
                <li><span className="font-medium">Enhances definitional clarity</span> - Making concepts precise</li>
              </ul>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="rewrite-instruction" className="mb-1">
              Rewrite Instructions
            </Label>
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
          
          {instruction === "custom" && (
            <div className="grid gap-2">
              <Label htmlFor="custom-instruction">Custom Rewrite Instruction</Label>
              <Textarea
                id="custom-instruction"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="DO: 'Replace vague terms with precise ones'; 'Make reasoning chains explicit' | DON'T: 'Make it sound more academic'; 'Use bigger words'"
                className="min-h-[80px]"
              />
            </div>
          )}
        </TabsContent>
        
        {/* AI Suggestions Tab */}
        <TabsContent value="aiSuggestions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">AI Enhancement Suggestions</h3>
            <Button
              onClick={getAISuggestions}
              disabled={loadingSuggestions || !originalDocument?.content}
              className="flex items-center gap-2"
            >
              {loadingSuggestions ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Get Suggestions
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="includeSuggestions" 
              checked={includeSuggestions}
              onCheckedChange={(checked) => setIncludeSuggestions(!!checked)}
            />
            <Label htmlFor="includeSuggestions" className="text-sm text-gray-700">
              Include selected suggestions in rewrite
            </Label>
          </div>
          
          {suggestions.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-md border border-gray-100">
              <Sparkles className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">
                {loadingSuggestions ? 'Getting enhancement suggestions...' : 'Click "Get Suggestions" to receive AI enhancement ideas'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <Card key={idx} className={`${selectedSuggestions.some(s => s.title === suggestion.title) ? 'border-blue-400 bg-blue-50' : ''}`}>
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {suggestion.title}
                        <Badge variant="outline" className="ml-2 text-xs font-normal">
                          Relevance: {suggestion.relevanceScore}/10
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Source: {suggestion.source}
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm" 
                      variant={selectedSuggestions.some(s => s.title === suggestion.title) ? "default" : "outline"}
                      className="h-8 gap-1"
                      onClick={() => toggleSuggestion(suggestion)}
                    >
                      {selectedSuggestions.some(s => s.title === suggestion.title) ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Select
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-sm text-gray-700">{suggestion.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Web Search Tab */}
        <TabsContent value="webSearch" className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="search-query" className="mb-1.5 block">Search Query</Label>
                <Input
                  id="search-query"
                  placeholder="Enter search terms"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                onClick={performWebSearch}
                disabled={isSearching || !searchQuery}
                className="mb-0.5"
              >
                {isSearching ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeSearchResults" 
                checked={includeSearchResults}
                onCheckedChange={(checked) => setIncludeSearchResults(!!checked)}
              />
              <Label htmlFor="includeSearchResults" className="text-sm text-gray-700">
                Include selected search results in rewrite
              </Label>
            </div>
          </div>
          
          {searchResults.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-md border border-gray-100">
              <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">
                {isSearching ? 'Searching...' : 'Enter a search query and click "Search" to find relevant information'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((result, idx) => (
                <Card key={idx} className={`${selectedSearchResults.some(r => r.link === result.link) ? 'border-green-400 bg-green-50' : ''}`}>
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">
                        <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                          {result.title}
                          <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                        </a>
                      </CardTitle>
                      <CardDescription className="text-xs truncate max-w-md">
                        {result.link}
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm" 
                      variant={selectedSearchResults.some(r => r.link === result.link) ? "default" : "outline"}
                      className="h-8 gap-1"
                      onClick={() => toggleSearchResult(result)}
                    >
                      {selectedSearchResults.some(r => r.link === result.link) ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Select
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-sm text-gray-700">{result.snippet}</p>
                    
                    {selectedSearchResults.some(r => r.link === result.link) && urlContents[result.link] && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Extracted Content:</p>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-sm max-h-32 overflow-y-auto">
                          {urlContents[result.link]}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Progress indicator */}
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
      
      {/* Rewrite Button Section */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-1.5 text-blue-500" />
            <span>
              {selectedSuggestions.length > 0 && includeSuggestions && `${selectedSuggestions.length} suggestions selected. `}
              {selectedSearchResults.length > 0 && includeSearchResults && `${selectedSearchResults.length} search results selected. `}
              {(selectedSuggestions.length === 0 || !includeSuggestions) && (selectedSearchResults.length === 0 || !includeSearchResults) && 
                'Enhanced rewrite works best with AI suggestions and web references.'}
            </span>
          </div>
        </div>
        
        <Button
          onClick={handleRewrite}
          disabled={isRewriting || !instruction}
          className={`${isRewriting ? "animate-pulse" : ""}`}
        >
          {isRewriting ? (
            <>
              <RotateCw className="h-4 w-4 mr-2 animate-spin" />
              Rewriting...
            </>
          ) : (
            <>
              <FileEdit className="h-4 w-4 mr-2" />
              Rewrite Document
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EnhancedRewriteSection;