import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface FictionAssessmentResult {
  worldCoherence: number;
  emotionalPlausibility: number;
  thematicDepth: number;
  narrativeStructure: number;
  proseControl: number;
  overallFictionScore: number;
  detailedAssessment: string;
}

interface FictionAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent: string;
  documentTitle: string;
}

export function FictionAssessmentModal({ isOpen, onClose, documentContent, documentTitle }: FictionAssessmentModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FictionAssessmentResult | null>(null);

  const handleAssessment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/fiction-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: documentContent,
          provider: selectedProvider
        })
      });
      
      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error performing fiction assessment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    
    const reportContent = `FICTION ASSESSMENT REPORT
Document: ${documentTitle}
Provider: ${selectedProvider}
Generated: ${new Date().toLocaleString()}

OVERALL FICTION SCORE: ${result.overallFictionScore}/100

DIMENSION BREAKDOWN:
World Coherence: ${result.worldCoherence}/100 - How consistent and believable is the fictional world
Emotional Plausibility: ${result.emotionalPlausibility}/100 - Authenticity of characters' emotions and responses
Thematic Depth: ${result.thematicDepth}/100 - Meaningful exploration of underlying themes
Narrative Structure: ${result.narrativeStructure}/100 - Effectiveness of story construction and pacing
Prose Control: ${result.proseControl}/100 - Mastery of language and writing craft

DETAILED ASSESSMENT:
${result.detailedAssessment}`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiction-assessment-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fiction Assessment: {documentTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select AI Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="perplexity">Perplexity</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleAssessment}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Analyzing Fiction...' : 'Assess Fiction'}
            </Button>
            
            {result && (
              <Button
                onClick={downloadReport}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            )}
          </div>

          {result && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">
                    Overall Fiction Score: {result.overallFictionScore}/100
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={result.overallFictionScore} className="h-3" />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">World Coherence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Progress value={result.worldCoherence} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{result.worldCoherence}/100</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Consistency and believability of the fictional world
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Emotional Plausibility</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Progress value={result.emotionalPlausibility} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{result.emotionalPlausibility}/100</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Authenticity of characters' emotions and responses
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Thematic Depth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Progress value={result.thematicDepth} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{result.thematicDepth}/100</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Meaningful exploration of underlying themes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Narrative Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Progress value={result.narrativeStructure} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{result.narrativeStructure}/100</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Effectiveness of story construction and pacing
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm">Prose Control</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Progress value={result.proseControl} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{result.proseControl}/100</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Mastery of language and writing craft
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">
                      {result.detailedAssessment}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}