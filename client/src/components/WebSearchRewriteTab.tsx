import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Globe, Search, RotateCw, FileEdit, ExternalLink } from "lucide-react";

interface WebSearchRewriteTabProps {
  originalText: string;
  onRewriteWithWebContent: (options: any) => void;
  isRewriting: boolean;
}

const WebSearchRewriteTab: React.FC<WebSearchRewriteTabProps> = ({
  originalText,
  onRewriteWithWebContent,
  isRewriting
}) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResults, setSelectedResults] = useState<any[]>([]);
  const [urlContents, setUrlContents] = useState<{[key: string]: string}>({});
  const [includeWebContent, setIncludeWebContent] = useState<boolean>(true);
  
  // Generate a search query suggestion based on the original text
  React.useEffect(() => {
    if (originalText && !searchQuery) {
      // Simple extraction of potential keywords
      const words = originalText.split(/\s+/).filter(w => w.length > 4);
      const uniqueWords = Array.from(new Set(words));
      const keywords = uniqueWords
        .filter(w => w.match(/^[A-Z][a-z]+$/) || w.length > 6)
        .slice(0, 3);
      
      if (keywords.length > 0) {
        setSearchQuery(keywords.join(' '));
      }
    }
  }, [originalText]);

  // Search for web content related to the query
  const handleSearch = async () => {
    if (!searchQuery) {
      toast({
        title: "Search query required",
        description: "Please enter a search term"
      });
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
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
        toast({
          title: "Search completed",
          description: `Found ${data.results.length} relevant results`
        });
      } else {
        throw new Error(data.message || "Failed to search");
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast({
        title: "Search failed",
        description: "Failed to search for relevant information",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle selection of a search result
  const toggleResultSelection = (result: any) => {
    if (selectedResults.some(r => r.link === result.link)) {
      setSelectedResults(selectedResults.filter(r => r.link !== result.link));
    } else {
      setSelectedResults([...selectedResults, result]);
      fetchContentForUrl(result.link);
    }
  };

  // Fetch content from a URL
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
        setUrlContents(prev => ({
          ...prev,
          [url]: data.content
        }));
      } else {
        throw new Error(data.message || "Failed to fetch content");
      }
    } catch (error) {
      console.error(`Error fetching content from ${url}:`, error);
      toast({
        title: "Content fetch failed",
        description: `Could not retrieve content from ${url}`,
        variant: "destructive"
      });
    }
  };

  // Begin the rewrite process with selected web content
  const handleRewriteWithWebContent = () => {
    if (selectedResults.length === 0) {
      toast({
        title: "No content selected",
        description: "Please select at least one search result to include"
      });
      return;
    }
    
    const webContentOptions = {
      searchResults: selectedResults,
      urlContents,
      includeWebContent
    };
    
    onRewriteWithWebContent(webContentOptions);
  };

  return (
    <div className="web-search-rewrite-tab space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
        <h4 className="text-sm font-medium text-green-900 flex items-center gap-1.5 mb-2">
          <Globe className="h-4 w-4" />
          Web Content Search
        </h4>
        <p className="text-xs text-green-800">
          Search for relevant web content to enhance your document with factual information and evidence.
          Selected content will be incorporated into your rewrite.
        </p>
      </div>
      
      <div className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="web-search-query">Search Query</Label>
          <Input
            id="web-search-query"
            placeholder="Enter search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery}
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
      </div>
      
      {/* Search results display */}
      {searchResults.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md border border-gray-100">
          <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">
            {isSearching ? 'Searching the web...' : 'Enter a search query and click "Search Web" to find relevant information'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Web Search Results</h3>
            <span className="text-sm text-gray-500">Click items to select</span>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {searchResults.map((result, idx) => (
              <Card 
                key={idx} 
                className={`cursor-pointer transition-colors ${
                  selectedResults.some(r => r.link === result.link) 
                    ? 'border-green-400 bg-green-50' 
                    : ''
                }`}
                onClick={() => toggleResultSelection(result)}
              >
                <CardHeader className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base text-blue-600 hover:underline">
                        {result.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        <a 
                          href={result.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 hover:underline"
                        >
                          {result.link.substring(0, 40)}{result.link.length > 40 ? '...' : ''}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </CardDescription>
                    </div>
                    {selectedResults.some(r => r.link === result.link) && (
                      <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <p className="text-sm text-gray-700">{result.snippet}</p>
                  
                  {selectedResults.some(r => r.link === result.link) && urlContents[result.link] && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Content Preview:</p>
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-sm max-h-20 overflow-y-auto">
                        {urlContents[result.link].substring(0, 300)}...
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Selected results controls */}
      {selectedResults.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="include-web-content" 
              checked={includeWebContent}
              onCheckedChange={(checked) => setIncludeWebContent(!!checked)}
            />
            <Label htmlFor="include-web-content" className="text-sm text-gray-700">
              Include selected web content in rewrite
            </Label>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {selectedResults.length} source{selectedResults.length !== 1 ? 's' : ''} selected
            </span>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedResults([])}
              >
                Clear Selection
              </Button>
              
              <Button
                onClick={handleRewriteWithWebContent}
                disabled={isRewriting || selectedResults.length === 0}
              >
                {isRewriting ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Rewriting with Web Content...
                  </>
                ) : (
                  <>
                    <FileEdit className="h-4 w-4 mr-2" />
                    Rewrite with Web Content
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSearchRewriteTab;