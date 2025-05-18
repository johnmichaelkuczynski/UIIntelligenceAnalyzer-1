import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Globe, Search, RotateCw, FileEdit, ExternalLink } from "lucide-react";

interface WebContentRewriteProps {
  documentContent: string;
  onRewriteWithWebContent: (webContentOptions: any) => Promise<void>;
  isRewriting: boolean;
}

const WebContentRewrite: React.FC<WebContentRewriteProps> = ({
  documentContent,
  onRewriteWithWebContent,
  isRewriting
}) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResults, setSelectedResults] = useState<any[]>([]);
  const [urlContents, setUrlContents] = useState<{[key: string]: string}>({});
  
  // Generate search query suggestion based on document content
  useEffect(() => {
    if (documentContent && !searchQuery) {
      // Extract potential keywords from content
      const words = documentContent.split(/\s+/).filter(w => w.length > 4);
      const uniqueWords = Array.from(new Set(words));
      const keywords = uniqueWords
        .filter(w => w.match(/^[A-Z][a-z]+$/) || w.length > 6)
        .slice(0, 3);
      
      if (keywords.length > 0) {
        setSearchQuery(keywords.join(' '));
      }
    }
  }, [documentContent]);

  // Search for content
  const handleSearch = async () => {
    if (!searchQuery) {
      toast({
        title: "Search query required",
        description: "Please enter search terms to find relevant content"
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
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
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
        description: "Could not search for relevant content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle selection of a result
  const toggleResultSelection = (result: any) => {
    if (selectedResults.some(r => r.link === result.link)) {
      setSelectedResults(selectedResults.filter(r => r.link !== result.link));
    } else {
      setSelectedResults([...selectedResults, result]);
      fetchContent(result.link);
    }
  };

  // Fetch content from URL
  const fetchContent = async (url: string) => {
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
      toast({
        title: "Content fetch failed",
        description: `Could not retrieve content from ${url}`,
        variant: "destructive"
      });
    }
  };

  // Start rewrite with selected web content
  const handleRewriteWithContent = async () => {
    if (selectedResults.length === 0) {
      toast({
        title: "No content selected",
        description: "Please select at least one search result"
      });
      return;
    }
    
    const webContentOptions = {
      selectedResults: selectedResults,
      urlContents: urlContents
    };
    
    await onRewriteWithWebContent(webContentOptions);
  };

  return (
    <div className="web-content-rewrite space-y-4 border border-blue-200 rounded-lg p-4 bg-blue-50/30">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-blue-800">Web Content Search</h3>
      </div>
      
      <p className="text-sm text-blue-700">
        Search for relevant web content to enhance your rewrite with factual information.
      </p>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Enter search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
              Search
            </>
          )}
        </Button>
      </div>
      
      {/* Search results */}
      {searchResults.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-md">
          <Globe className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {isSearching ? 'Searching...' : 'Enter search terms to find relevant content'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Search Results</span>
            <span className="text-xs text-gray-500">Click to select</span>
          </div>
          
          <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
            {searchResults.map((result, idx) => (
              <Card 
                key={idx} 
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedResults.some(r => r.link === result.link) ? 'border-green-400 bg-green-50' : ''
                }`}
                onClick={() => toggleResultSelection(result)}
              >
                <CardHeader className="p-3">
                  <CardTitle className="text-sm text-blue-600">
                    {result.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    <a 
                      href={result.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline flex items-center gap-1"
                    >
                      {result.link.substring(0, 40)}{result.link.length > 40 ? '...' : ''}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <p className="text-xs text-gray-700">{result.snippet}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {selectedResults.length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm">
                  {selectedResults.length} source{selectedResults.length !== 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={handleRewriteWithContent}
                  disabled={isRewriting}
                  className="flex items-center gap-1"
                >
                  {isRewriting ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-1 animate-spin" />
                      Rewriting...
                    </>
                  ) : (
                    <>
                      <FileEdit className="h-4 w-4 mr-1" />
                      Rewrite with Web Content
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebContentRewrite;