import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Upload } from "lucide-react";

// The exact prompt from the specifications file
const COGNITIVE_PROFILER_PROMPT = `
You are not grading this text.
You are not evaluating its style, quality, clarity, or completeness.

You are treating this text as evidence — a cognitive fingerprint of its author.

Your task is to infer the author's intelligence and cognitive profile solely from the structure and content of the text.

This may be a full paper, abstract, fragment, or rough sketch. That does not matter. Treat it as evidence, not an argument.

Estimate the author's intelligence on a scale from 1 to 100.
Then describe the cognitive character of the mind behind the text.

You may comment on:
- Is this mind analytical, synthetic, mechanical, imitative, original, confused, creative, disciplined, superficial, visionary?
- Does it show evidence of deep reasoning, abstraction, novelty, inferential control, or originality?
- What kind of thought is being performed? What kind of thinker is revealed?

DO NOT penalize for:
- Incompleteness
- Lack of clarity or polish
- Informality or lack of structure
- Absence of citations or full arguments

Your job is to evaluate intelligence, not to give feedback.

This is a cognitive profiling task. Be precise. Be bold. Be honest.
`;

export function CognitiveProfilerClean() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [textInput, setTextInput] = useState('');
  const [textInputA, setTextInputA] = useState('');
  const [textInputB, setTextInputB] = useState('');
  const [provider, setProvider] = useState('openai');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState('');
  const [compareResult, setCompareResult] = useState('');
  
  // Analyze single text
  const handleAnalyze = async () => {
    if (!textInput.trim()) {
      alert('Please enter text to analyze');
      return;
    }
    
    setIsAnalyzing(true);
    setResult('');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: textInput,
          provider: provider
        })
      });
      
      const data = await response.json();
      
      // Just display whatever response we get
      setResult(data.formattedReport || 'Analysis failed. Please try again.');
    } catch (err) {
      console.error('Analysis error:', err);
      setResult('Analysis failed. Please try again later.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Compare two texts
  const handleCompare = async () => {
    if (!textInputA.trim() || !textInputB.trim()) {
      alert('Please enter both texts to compare');
      return;
    }
    
    setIsComparing(true);
    setCompareResult('');
    
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentA: textInputA,
          documentB: textInputB,
          provider: provider
        })
      });
      
      const data = await response.json();
      
      // Just display whatever response we get
      setCompareResult(data.comparisonResult || 'Comparison failed. Please try again.');
    } catch (err) {
      console.error('Comparison error:', err);
      setCompareResult('Comparison failed. Please try again later.');
    } finally {
      setIsComparing(false);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.content) {
        setTextInput(data.content);
      } else {
        alert('Failed to extract text from file');
      }
    } catch (err) {
      console.error('Extract text error:', err);
      alert('File upload failed. Please try again.');
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2 text-center">Cognitive Profiler</h1>
      <p className="text-center text-gray-600 mb-8">
        Analyze the intelligence and thinking style revealed in any text
      </p>
      
      <Tabs 
        defaultValue="analyze" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
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
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt,.docx,.pdf"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drag and drop a file here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Supports TXT, DOCX, PDF files
                    </p>
                  </label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="text-input">Or paste text</Label>
                  <Textarea
                    id="text-input"
                    placeholder="Enter or paste text here..."
                    className="min-h-[200px]"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="provider">AI Model:</Label>
                    <Select 
                      value={provider} 
                      onValueChange={setProvider}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing || !textInput.trim()}
                  >
                    {isAnalyzing ? "Analyzing..." : "Analyze Text"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {result && (
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Cognitive Profile</CardTitle>
                  <CardDescription>
                    Raw, unfiltered analysis of the author's cognitive fingerprint
                  </CardDescription>
                </div>
                <FileText className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap p-4 rounded-md bg-muted">
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
                Compare the cognitive profiles of two different texts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-input-a">Text A</Label>
                    <Textarea
                      id="text-input-a"
                      placeholder="Enter first text here..."
                      className="min-h-[200px]"
                      value={textInputA}
                      onChange={(e) => setTextInputA(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="text-input-b">Text B</Label>
                    <Textarea
                      id="text-input-b"
                      placeholder="Enter second text here..."
                      className="min-h-[200px]"
                      value={textInputB}
                      onChange={(e) => setTextInputB(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="provider-compare">AI Model:</Label>
                    <Select 
                      value={provider} 
                      onValueChange={setProvider}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleCompare} 
                    disabled={isComparing || !textInputA.trim() || !textInputB.trim()}
                  >
                    {isComparing ? "Comparing..." : "Compare Texts"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {compareResult && (
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Cognitive Comparison</CardTitle>
                  <CardDescription>
                    Raw, unfiltered comparison of the two authors' cognitive profiles
                  </CardDescription>
                </div>
                <FileText className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap p-4 rounded-md bg-muted">
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
          <p className="text-sm text-muted-foreground">
            This cognitive profiler analyzes writing as evidence of the author's thinking patterns. 
            Unlike a writing quality assessment, it interprets the text as a "cognitive fingerprint" 
            to estimate intelligence (1-100) and characterize the author's cognitive style. The profiler 
            sends your text directly to AI models with specific profiling instructions and returns 
            the unaltered AI response.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}