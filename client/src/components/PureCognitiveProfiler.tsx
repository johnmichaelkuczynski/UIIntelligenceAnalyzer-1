import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
// No file uploader component needed
import { Loader2, FileText } from "lucide-react";

export function PureCognitiveProfiler() {
  const [activeTab, setActiveTab] = useState("analyze");
  const [textInput, setTextInput] = useState("");
  const [textInputA, setTextInputA] = useState("");
  const [textInputB, setTextInputB] = useState("");
  const [provider, setProvider] = useState("openai");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState("");
  const [compareResult, setCompareResult] = useState("");

  // Simple file uploader
  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.content) {
        setTextInput(data.content);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Handle text analysis
  const analyzeText = async () => {
    if (!textInput.trim()) return;
    
    setIsAnalyzing(true);
    setResult("");
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: textInput,
          provider
        })
      });
      
      const data = await response.json();
      setResult(data.formattedReport || "Analysis failed. Please try again.");
    } catch (error) {
      console.error('Error analyzing text:', error);
      setResult("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle text comparison
  const compareTexts = async () => {
    if (!textInputA.trim() || !textInputB.trim()) return;
    
    setIsComparing(true);
    setCompareResult("");
    
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentA: textInputA,
          documentB: textInputB,
          provider
        })
      });
      
      const data = await response.json();
      setCompareResult(data.comparisonResult || "Comparison failed. Please try again.");
    } catch (error) {
      console.error('Error comparing texts:', error);
      setCompareResult("Comparison failed. Please try again.");
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Cognitive Profiler</h1>
        <p className="text-lg text-muted-foreground">
          Analyze the cognitive fingerprint behind any text
        </p>
      </div>

      <Tabs defaultValue="analyze" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="analyze">Single Text Analysis</TabsTrigger>
          <TabsTrigger value="compare">Text Comparison</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analyze">
          <Card>
            <CardHeader>
              <CardTitle>Analyze Text</CardTitle>
              <CardDescription>
                Upload or paste text to analyze the cognitive profile of its author
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    accept=".txt,.docx,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">Drop file here or click to upload</span>
                    <span className="text-xs text-muted-foreground mt-1">Supports TXT, DOCX, PDF</span>
                  </label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="textInput">Or paste text</Label>
                  <Textarea 
                    id="textInput"
                    placeholder="Enter or paste text here..."
                    className="min-h-[250px]"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="provider">AI Model:</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={analyzeText} 
                    disabled={isAnalyzing || !textInput.trim()}
                  >
                    {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isAnalyzing ? "Analyzing..." : "Analyze Text"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Cognitive Profile</CardTitle>
                <CardDescription>
                  Raw analysis of author's cognitive fingerprint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-md p-4 whitespace-pre-wrap">
                  {result}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle>Compare Texts</CardTitle>
              <CardDescription>
                Compare the cognitive profiles of two authors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="textInputA">Text A</Label>
                    <Textarea 
                      id="textInputA"
                      placeholder="Enter first text here..."
                      className="min-h-[250px]"
                      value={textInputA}
                      onChange={(e) => setTextInputA(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="textInputB">Text B</Label>
                    <Textarea 
                      id="textInputB"
                      placeholder="Enter second text here..."
                      className="min-h-[250px]"
                      value={textInputB}
                      onChange={(e) => setTextInputB(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="provider">AI Model:</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={compareTexts} 
                    disabled={isComparing || !textInputA.trim() || !textInputB.trim()}
                  >
                    {isComparing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isComparing ? "Comparing..." : "Compare Texts"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {compareResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Cognitive Comparison</CardTitle>
                <CardDescription>
                  Raw comparison of authors' cognitive profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-md p-4 whitespace-pre-wrap">
                  {compareResult}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>About Cognitive Profiling</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7">
            This cognitive profiler treats text as evidence of its author's mind rather than a piece to be graded. 
            Unlike conventional writing assessments that focus on quality or completeness, this tool analyzes the text as a 
            cognitive fingerprint to estimate the intelligence (on a scale of 1-100) and characterize the thinking style of the person who wrote it.
          </p>
          <p className="leading-7 mt-4">
            The profiler sends your text directly to AI models with specific instructions and returns their raw, unmodified analysis.
            There is no intermediate processing, scoring adjustments, or filtering - the assessment comes directly from the AI model.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}