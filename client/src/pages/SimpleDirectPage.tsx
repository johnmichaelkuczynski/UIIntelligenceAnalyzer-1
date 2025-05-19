import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RotateCw, Bot, CheckCircle, AlertTriangle, Copy, Download } from 'lucide-react';

// Default research instructions
const DEFAULT_RESEARCH = "ASK CLAUDE ABOUT the concepts in this text. ASK PERPLEXITY for related academic research. ASK GPT to analyze how these ideas are interconnected.";

// Default rewrite instructions for different purposes
const DEFAULT_REWRITES = {
  enhance: "Make the text more precise and intellectually sophisticated while maintaining the original meaning and structure.",
  simplify: "Maintain all key concepts but make the text more accessible to a general audience without dumbing it down.",
  expand: "Expand on the concepts with more detail, examples, and context while preserving the original structure.",
  formal: "Rewrite the text in a more formal, academic style with precise terminology.",
  concise: "Make the text more concise while preserving all key concepts and relationships."
};

const SimpleDirectPage: React.FC = () => {
  const { toast } = useToast();
  
  // Main states
  const [originalText, setOriginalText] = useState<string>("");
  const [researchInstructions, setResearchInstructions] = useState<string>(DEFAULT_RESEARCH);
  const [rewriteInstructions, setRewriteInstructions] = useState<string>(DEFAULT_REWRITES.enhance);
  const [rewriteStyle, setRewriteStyle] = useState<string>("enhance");
  const [rewrittenText, setRewrittenText] = useState<string>("");
  const [aiResearchResults, setAiResearchResults] = useState<Record<string, any>>({});
  
  // Loading states
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  
  // Options
  const [includeResearch, setIncludeResearch] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<string>("openai");
  
  // Active tab
  const [activeTab, setActiveTab] = useState<string>("input");
  
  // Set default rewrite instructions when style changes
  useEffect(() => {
    setRewriteInstructions(DEFAULT_REWRITES[rewriteStyle as keyof typeof DEFAULT_REWRITES] || DEFAULT_REWRITES.enhance);
  }, [rewriteStyle]);

  // Handle research submission
  const handleResearch = async () => {
    if (!originalText.trim()) {
      toast({
        title: "Missing text",
        description: "Please enter text to research",
        variant: "destructive"
      });
      return;
    }
    
    setIsResearching(true);
    
    try {
      // Prepare instructions that include the original text
      const instructions = `${researchInstructions}\n\nHere is the text to analyze:\n${originalText}`;
      
      // Make request to the direct model endpoint
      const response = await fetch("/api/direct-model-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions,
          models: ["openai", "claude", "perplexity"]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAiResearchResults(data.results);
        
        toast({
          title: "Research complete",
          description: `Got responses from ${Object.keys(data.results).length} AI models`
        });
      } else {
        throw new Error(data.message || "Failed to get AI responses");
      }
    } catch (error) {
      console.error("AI research error:", error);
      toast({
        title: "Research failed",
        description: error instanceof Error ? error.message : "Could not complete research",
        variant: "destructive"
      });
    } finally {
      setIsResearching(false);
    }
  };
  
  // Handle rewrite submission
  const handleRewrite = async () => {
    if (!originalText.trim()) {
      toast({
        title: "Missing text",
        description: "Please enter text to rewrite",
        variant: "destructive"
      });
      return;
    }
    
    setIsRewriting(true);
    
    try {
      // Build full instructions that include research if needed
      let enhancedInstructions = rewriteInstructions;
      
      if (includeResearch && Object.keys(aiResearchResults).length > 0) {
        enhancedInstructions += "\n\nINCORPORATE THIS RESEARCH INTO THE REWRITE:\n\n";
        
        // Add all research results
        for (const model in aiResearchResults) {
          if (aiResearchResults[model].content) {
            enhancedInstructions += `===== ${aiResearchResults[model].provider || model.toUpperCase()} INSIGHTS =====\n`;
            enhancedInstructions += aiResearchResults[model].content + "\n\n";
          }
        }
      }
      
      // Make rewrite request
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText,
          provider: selectedProvider,
          options: {
            instruction: enhancedInstructions
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      setRewrittenText(data.rewrittenText);
      setActiveTab("result");
      
      toast({
        title: "Rewrite complete",
        description: `Text rewritten using ${data.provider}`,
        variant: "success"
      });
    } catch (error) {
      console.error("Rewrite error:", error);
      toast({
        title: "Rewrite failed",
        description: error instanceof Error ? error.message : "Could not complete rewrite",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard"
    });
  };
  
  // Export text as file
  const exportAsFile = (text: string, format: 'txt') => {
    const element = document.createElement('a');
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `rewritten-text-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Bot className="h-6 w-6 text-blue-600" />
        Direct AI Research & Rewrite
      </h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="input">Original Text</TabsTrigger>
          <TabsTrigger value="research">AI Research</TabsTrigger>
          <TabsTrigger value="result">Rewritten Text</TabsTrigger>
        </TabsList>
        
        {/* Input Text Tab */}
        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Text Input</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter text to research and rewrite..."
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                className="min-h-[300px] resize-y"
              />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">
                  {originalText.trim().length > 0 
                    ? `${originalText.trim().length} characters, ~${Math.round(originalText.trim().split(/\s+/).length / 5)} min read` 
                    : 'Ready for input'}
                </span>
              </div>
              <Button
                onClick={handleResearch}
                disabled={isResearching || !originalText.trim()}
              >
                {isResearching ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    Start AI Research
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Research Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Instructions for AI research..."
                value={researchInstructions}
                onChange={(e) => setResearchInstructions(e.target.value)}
                className="min-h-[100px] resize-y"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Research Tab */}
        <TabsContent value="research" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Research Results</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(aiResearchResults).length > 0 ? (
                <Tabs defaultValue="openai" className="w-full">
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger 
                      value="openai" 
                      disabled={!aiResearchResults.openai}
                    >
                      OpenAI GPT
                    </TabsTrigger>
                    <TabsTrigger 
                      value="claude" 
                      disabled={!aiResearchResults.claude}
                    >
                      Claude
                    </TabsTrigger>
                    <TabsTrigger 
                      value="perplexity" 
                      disabled={!aiResearchResults.perplexity}
                    >
                      Perplexity
                    </TabsTrigger>
                  </TabsList>
                  
                  {Object.keys(aiResearchResults).map(model => (
                    <TabsContent key={model} value={model} className="mt-4">
                      <div className="p-4 border rounded-md">
                        <div className="flex justify-between items-center mb-4">
                          <div className="font-medium text-blue-800">
                            {aiResearchResults[model]?.provider || model}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(aiResearchResults[model]?.content || "")}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="whitespace-pre-wrap">
                          {aiResearchResults[model]?.content || "No content available"}
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Research Results Yet</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Enter your text and start the AI research to see results from multiple AI models.
                  </p>
                  <Button 
                    onClick={() => setActiveTab("input")}
                    variant="outline"
                  >
                    Go to Text Input
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="include-research"
                  checked={includeResearch}
                  onCheckedChange={(checked) => setIncludeResearch(checked as boolean)}
                />
                <Label htmlFor="include-research">Include research in rewrite</Label>
              </div>
              <Button
                onClick={handleRewrite}
                disabled={isRewriting || !originalText.trim()}
              >
                {isRewriting ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Rewriting...
                  </>
                ) : (
                  "Rewrite with Research"
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rewrite Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rewrite-style">Rewrite Style</Label>
                <Select
                  value={rewriteStyle}
                  onValueChange={setRewriteStyle}
                >
                  <SelectTrigger id="rewrite-style" className="w-full">
                    <SelectValue placeholder="Select rewrite style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enhance">Enhance & Sophisticate</SelectItem>
                    <SelectItem value="simplify">Simplify & Clarify</SelectItem>
                    <SelectItem value="expand">Expand & Elaborate</SelectItem>
                    <SelectItem value="formal">Formalize & Academic</SelectItem>
                    <SelectItem value="concise">Concise & Precise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="provider">AI Provider</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                >
                  <SelectTrigger id="provider" className="w-full">
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI GPT-4o</SelectItem>
                    <SelectItem value="anthropic">Claude 3.7</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rewrite-instructions">Custom Rewrite Instructions</Label>
                <Textarea
                  id="rewrite-instructions"
                  placeholder="Custom instructions for rewriting..."
                  value={rewriteInstructions}
                  onChange={(e) => setRewriteInstructions(e.target.value)}
                  className="min-h-[100px] resize-y"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Result Tab */}
        <TabsContent value="result" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Rewritten Text</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(rewrittenText)}
                    disabled={!rewrittenText}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={() => exportAsFile(rewrittenText, 'txt')}
                    disabled={!rewrittenText}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rewrittenText ? (
                <div className="p-4 border rounded-md whitespace-pre-wrap min-h-[300px]">
                  {rewrittenText}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Rewritten Text Yet</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Complete the AI research and rewrite process to see results here.
                  </p>
                  <Button 
                    onClick={() => setActiveTab("research")}
                    variant="outline"
                  >
                    Go to AI Research
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full space-y-4">
                <div className="flex justify-between items-center w-full">
                  <span className="text-sm text-gray-600">
                    {rewrittenText 
                      ? `${rewrittenText.length} characters, ~${Math.round(rewrittenText.split(/\s+/).length / 5)} min read` 
                      : 'No rewritten text yet'}
                  </span>
                  <Button
                    onClick={handleRewrite}
                    disabled={isRewriting || !originalText.trim()}
                  >
                    {isRewriting ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Rewriting...
                      </>
                    ) : (
                      "Rewrite Again"
                    )}
                  </Button>
                </div>
                
                {/* Original text for comparison */}
                <div className="pt-4 border-t">
                  <details>
                    <summary className="cursor-pointer text-sm text-blue-600 font-medium mb-2">
                      View Original Text for Comparison
                    </summary>
                    <div className="p-4 border rounded-md whitespace-pre-wrap bg-gray-50 text-gray-700">
                      {originalText}
                    </div>
                  </details>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimpleDirectPage;