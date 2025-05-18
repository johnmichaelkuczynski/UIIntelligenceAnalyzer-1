import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, Search, Loader2, ArrowLeft, ExternalLink, RefreshCw, FileText } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

const WebSearchPage: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [urlContent, setUrlContent] = useState<string>('');
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [rewrittenContent, setRewrittenContent] = useState<string>('');
  const [isRewriting, setIsRewriting] = useState(false);
  
  // Handle web search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await fetch('/api/search-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchQuery,
          numResults: 10 
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.results) {
        setSearchResults(data.results);
      } else {
        toast({
          title: 'Search Failed',
          description: data.error || 'Failed to retrieve search results',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Error',
        description: 'An error occurred while searching',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle fetching content from a URL
  const fetchContent = async (url: string) => {
    setIsFetchingContent(true);
    setSelectedUrl(url);
    
    try {
      const response = await fetch('/api/fetch-url-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (data.success && data.content) {
        setUrlContent(data.content);
      } else {
        toast({
          title: 'Content Fetch Failed',
          description: data.error || 'Failed to retrieve content from the URL',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Content fetch error:', error);
      toast({
        title: 'Content Fetch Error',
        description: 'An error occurred while fetching URL content',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingContent(false);
    }
  };

  // Handle text rewriting
  const handleRewrite = async () => {
    if (!urlContent.trim()) return;
    
    setIsRewriting(true);
    
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: urlContent,
          instructions: customInstructions || 'Improve clarity and readability while maintaining the original meaning',
          provider: selectedProvider
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.rewrittenText) {
        setRewrittenContent(data.rewrittenText);
        toast({
          title: 'Rewrite Complete',
          description: 'Text has been successfully rewritten',
        });
      } else {
        toast({
          title: 'Rewrite Failed',
          description: data.error || 'Failed to rewrite the text',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Rewrite error:', error);
      toast({
        title: 'Rewrite Error',
        description: 'An error occurred during the rewriting process',
        variant: 'destructive',
      });
    } finally {
      setIsRewriting(false);
    }
  };

  // Handle text file download
  const downloadAsText = () => {
    if (!rewrittenContent) return;
    
    const element = document.createElement('a');
    const file = new Blob([rewrittenContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `rewritten-content-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: 'Download Complete',
      description: 'Your rewritten content has been downloaded as a text file',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Analysis
          </Button>
        </Link>
        <h1 className="text-2xl font-bold ml-4">Web Search & Rewrite</h1>
      </div>
      
      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search the Web for Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter search terms..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="min-w-[100px]"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
          
          {searchResults.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Search Results:</h3>
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-blue-600 mb-1">{result.title}</h4>
                      <p className="text-sm text-gray-500 mb-2 truncate">{result.link}</p>
                      <p className="text-sm mb-3">{result.snippet}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fetchContent(result.link)}
                        disabled={isFetchingContent && selectedUrl === result.link}
                        className="flex items-center gap-1"
                      >
                        {isFetchingContent && selectedUrl === result.link ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Get Content
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Content & Rewrite Section */}
      {urlContent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Content */}
          <Card>
            <CardHeader>
              <CardTitle>Original Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 border p-3 rounded-md bg-gray-50 h-[400px] overflow-y-auto">
                <p className="whitespace-pre-wrap">{urlContent}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Rewrite Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Rewrite Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="provider-select">Select AI Provider</Label>
                  <Select 
                    value={selectedProvider} 
                    onValueChange={setSelectedProvider}
                  >
                    <SelectTrigger id="provider-select">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="perplexity">Perplexity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="custom-instructions">Custom Rewrite Instructions</Label>
                  <Textarea
                    id="custom-instructions"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Enter custom instructions for rewriting (e.g., 'Enhance inferential connections while maintaining the original argument structure')"
                    className="h-[100px]"
                  />
                </div>
                
                <Button 
                  onClick={handleRewrite} 
                  disabled={isRewriting} 
                  className="w-full"
                >
                  {isRewriting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rewriting Content...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Rewrite Content
                    </>
                  )}
                </Button>
              </div>
              
              {/* Rewritten Content */}
              {rewrittenContent && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Rewritten Content</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadAsText}
                      className="flex items-center gap-1"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Download as TXT
                    </Button>
                  </div>
                  <div className="border p-3 rounded-md bg-green-50 h-[200px] overflow-y-auto">
                    <p className="whitespace-pre-wrap">{rewrittenContent}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WebSearchPage;