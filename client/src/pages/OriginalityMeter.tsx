import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Upload, Brain, Lightbulb, Scale, Target, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type EvaluationMode = 'originality' | 'intelligence' | 'cogency' | 'overall_quality';
type LLMProvider = 'anthropic' | 'deepseek' | 'openai' | 'perplexity';

interface OriginalityResult {
  finalScore: number;
  formattedReport: string;
  mode: EvaluationMode;
}

interface DualOriginalityResult {
  documentAScore: number;
  documentBScore: number;
  documentAReport: string;
  documentBReport: string;
  comparisonAnalysis: string;
  finalReport: string;
}

const modeIcons = {
  originality: Lightbulb,
  intelligence: Brain,
  cogency: Scale,
  overall_quality: Target
};

const modeColors = {
  originality: "bg-purple-500",
  intelligence: "bg-blue-500", 
  cogency: "bg-green-500",
  overall_quality: "bg-orange-500"
};

export default function OriginalityMeter() {
  const [documentMode, setDocumentMode] = useState<'single' | 'dual'>('single');
  const [evaluationMode, setEvaluationMode] = useState<EvaluationMode>('originality');
  const [provider, setProvider] = useState<LLMProvider>('anthropic');
  const [comprehensive, setComprehensive] = useState(false);
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [result, setResult] = useState<OriginalityResult | DualOriginalityResult | null>(null);
  const [uploadingA, setUploadingA] = useState(false);
  const [uploadingB, setUploadingB] = useState(false);

  const queryClient = useQueryClient();

  const handleFileUpload = async (file: File, setTextFunction: (text: string) => void, setUploading: (loading: boolean) => void) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      setTextFunction(data.content);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const singleEvaluationMutation = useMutation({
    mutationFn: async (data: { text: string; provider: LLMProvider; mode: EvaluationMode; comprehensive: boolean }) => {
      const response = await fetch('/api/originality/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to evaluate document');
      }
      
      return await response.json() as OriginalityResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const dualEvaluationMutation = useMutation({
    mutationFn: async (data: { textA: string; textB: string; provider: LLMProvider; mode: EvaluationMode; comprehensive: boolean }) => {
      const response = await fetch('/api/originality/evaluate-dual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to evaluate dual documents');
      }
      
      return await response.json() as DualOriginalityResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleEvaluate = () => {
    if (documentMode === 'single') {
      if (!textA.trim()) return;
      singleEvaluationMutation.mutate({
        text: textA,
        provider,
        mode: evaluationMode,
        comprehensive
      });
    } else {
      if (!textA.trim() || !textB.trim()) return;
      dualEvaluationMutation.mutate({
        textA,
        textB,
        provider,
        mode: evaluationMode,
        comprehensive
      });
    }
  };

  const handleDownload = () => {
    if (!result) return;
    
    const content = 'finalReport' in result ? result.finalReport : result.formattedReport;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${evaluationMode}_evaluation_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isLoading = singleEvaluationMutation.isPending || dualEvaluationMutation.isPending;
  const canEvaluate = documentMode === 'single' ? textA.trim() : textA.trim() && textB.trim();

  const ModeIcon = modeIcons[evaluationMode];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className={`p-3 rounded-full ${modeColors[evaluationMode]} text-white`}>
                <ModeIcon className="w-8 h-8" />
              </div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Originality Meter
              </CardTitle>
            </div>
            <p className="text-gray-600 text-lg">
              Advanced {evaluationMode} evaluation using rigorous analytical protocols
            </p>
          </CardHeader>
        </Card>

        {/* Controls */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Mode</label>
                <Select value={documentMode} onValueChange={(value: 'single' | 'dual') => setDocumentMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Document</SelectItem>
                    <SelectItem value="dual">Dual Documents</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Evaluation Mode</label>
                <Select value={evaluationMode} onValueChange={(value: EvaluationMode) => setEvaluationMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="originality">Originality</SelectItem>
                    <SelectItem value="intelligence">Intelligence</SelectItem>
                    <SelectItem value="cogency">Cogency</SelectItem>
                    <SelectItem value="overall_quality">Overall Quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">LLM Provider</label>
                <Select value={provider} onValueChange={(value: LLMProvider) => setProvider(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Analysis Mode</label>
                <Select value={comprehensive ? "comprehensive" : "quick"} onValueChange={(value) => setComprehensive(value === "comprehensive")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick (~30s)</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive (4-Phase)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert className="mb-6">
              <AlertDescription>
                <strong>File Upload:</strong> Supports .txt, .pdf, .docx, .doc files
                <br />
                <strong>Quick Mode:</strong> Fast evaluation using core questions (~30 seconds)
                <br />
                <strong>Comprehensive Mode:</strong> Full 4-phase rigorous analysis protocol
                <br />
                <strong>Large Text Handling:</strong> Texts over 1000 words are automatically chunked and processed sequentially
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Input */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                {documentMode === 'single' ? 'Document' : 'Document A'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".txt,.pdf,.docx,.doc"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, setTextA, setUploadingA);
                    }}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {uploadingA && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                <Textarea
                  placeholder="Upload a file above or paste your text here for analysis..."
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  className="min-h-[300px] resize-none"
                />
                <p className="text-sm text-gray-500">
                  Word count: {textA.split(/\s+/).filter(w => w).length}
                  {textA.split(/\s+/).filter(w => w).length > 1000 && (
                    <Badge variant="secondary" className="ml-2">Will use chunked processing</Badge>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {documentMode === 'dual' && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Document B
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".txt,.pdf,.docx,.doc"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, setTextB, setUploadingB);
                      }}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {uploadingB && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  <Textarea
                    placeholder="Upload a file above or paste your second text here for comparison..."
                    value={textB}
                    onChange={(e) => setTextB(e.target.value)}
                    className="min-h-[300px] resize-none"
                  />
                  <p className="text-sm text-gray-500">
                    Word count: {textB.split(/\s+/).filter(w => w).length}
                    {textB.split(/\s+/).filter(w => w).length > 1000 && (
                      <Badge variant="secondary" className="ml-2">Will use chunked processing</Badge>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleEvaluate}
            disabled={!canEvaluate || isLoading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Evaluating {evaluationMode}...
              </>
            ) : (
              `Evaluate ${evaluationMode.charAt(0).toUpperCase() + evaluationMode.slice(1)}`
            )}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ModeIcon className="w-6 h-6" />
                  {evaluationMode.charAt(0).toUpperCase() + evaluationMode.slice(1)} Evaluation Results
                </CardTitle>
                <div className="flex items-center gap-4">
                  {'documentAScore' in result ? (
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Doc A: {result.documentAScore}/100
                      </Badge>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Doc B: {result.documentBScore}/100
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Score: {result.finalScore}/100
                    </Badge>
                  )}
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-w-none">
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-white p-6 rounded-lg border overflow-auto max-h-[600px] text-black">
                  {'finalReport' in result ? result.finalReport : result.formattedReport}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}