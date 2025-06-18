import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Mail } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface ChunkRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onRewriteUpdate: (newText: string) => void;
}

type LLMProvider = "openai" | "anthropic" | "perplexity" | "deepseek";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI (GPT-4)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "perplexity", label: "Perplexity AI" },
  { value: "deepseek", label: "DeepSeek" }
] as const;

const ChunkRewriteModal: React.FC<ChunkRewriteModalProps> = ({
  isOpen,
  onClose,
  originalText,
  onRewriteUpdate
}) => {
  const { toast } = useToast();
  const [instructions, setInstructions] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("openai");
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentChunk, setCurrentChunk] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [rewrittenChunks, setRewrittenChunks] = useState<string[]>([]);
  const [fullResult, setFullResult] = useState<string>("");

  // Clear everything when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setInstructions("");
      setProgress(0);
      setCurrentChunk(0);
      setTotalChunks(0);
      setRewrittenChunks([]);
      setFullResult("");
    }
  }, [isOpen]);

  // Split text into manageable chunks
  const splitIntoChunks = (text: string, maxChunkSize: number = 2000): string[] => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim() + '.');
        currentChunk = sentence;
      } else {
        currentChunk += sentence + '.';
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  };

  const handleChunkRewrite = async () => {
    if (!instructions.trim()) {
      toast({
        title: "Instructions required",
        description: "Please enter rewrite instructions",
        variant: "destructive"
      });
      return;
    }

    setIsRewriting(true);
    setProgress(0);
    setRewrittenChunks([]);
    setFullResult("");
    
    const chunks = splitIntoChunks(originalText);
    setTotalChunks(chunks.length);
    
    console.log(`🔄 Processing ${chunks.length} chunks for large document rewrite`);
    
    const processedChunks: string[] = [];
    
    try {
      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunk(i + 1);
        console.log(`📝 Processing chunk ${i + 1}/${chunks.length}`);
        
        const response = await fetch('/api/rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalText: chunks[i],
            instructions: instructions,
            provider: selectedProvider
          })
        });

        if (!response.ok) {
          throw new Error(`Chunk ${i + 1} failed: ${response.status}`);
        }

        const data = await response.json();
        let rewrittenChunk = data.content || data.rewrittenText || chunks[i];
        
        // Clean markup formatting
        rewrittenChunk = rewrittenChunk
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/^#+\s*/gm, '')
          .trim();
        
        processedChunks.push(rewrittenChunk);
        setRewrittenChunks([...processedChunks]);
        
        // Update progress
        const progressPercent = ((i + 1) / chunks.length) * 100;
        setProgress(progressPercent);
        
        // Add to chat dialog immediately
        if ((window as any).addChatChunk) {
          (window as any).addChatChunk(rewrittenChunk, i + 1, chunks.length);
        }
        
        // Small delay to prevent rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Combine all chunks
      const finalResult = processedChunks.join('\n\n');
      setFullResult(finalResult);
      onRewriteUpdate(finalResult);
      
      toast({
        title: "🎉 Chunk rewrite completed!",
        description: `Successfully processed ${chunks.length} chunks. Content saved to chat below.`
      });

    } catch (error) {
      console.error("Chunk rewrite error:", error);
      toast({
        title: "Chunk rewrite failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const downloadAsPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rewritten Document</title>
          <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
          <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
          <script>
            window.MathJax = {
              tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
              }
            };
          </script>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 1in; }
            @media print { body { margin: 0.5in; } }
          </style>
        </head>
        <body>
          <h1>Rewritten Document</h1>
          ${fullResult.split('\n').map(line => `<p>${line}</p>`).join('')}
          <script>
            window.onload = function() {
              setTimeout(() => { window.print(); window.close(); }, 2000);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const shareViaEmail = async () => {
    const recipientEmail = prompt("Enter recipient email:");
    if (!recipientEmail || !fullResult) return;

    try {
      const response = await fetch('/api/share-simple-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail,
          subject: "Rewritten Document",
          content: fullResult
        }),
      });

      if (response.ok) {
        toast({ title: "Email sent successfully" });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Email failed to send",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Chunk-Based Document Rewriter</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left Panel - Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">AI Provider</label>
              <Select value={selectedProvider} onValueChange={(value: LLMProvider) => setSelectedProvider(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rewrite Instructions</label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter rewrite instructions for all chunks..."
                className="min-h-32"
              />
            </div>

            <Button 
              onClick={handleChunkRewrite} 
              disabled={isRewriting || !instructions.trim()}
              className="w-full"
            >
              {isRewriting ? `Processing Chunk ${currentChunk}/${totalChunks}...` : "Start Chunk Rewrite"}
            </Button>

            {isRewriting && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  Chunk {currentChunk} of {totalChunks} ({Math.round(progress)}%)
                </p>
              </div>
            )}

            {fullResult && (
              <div className="flex space-x-2">
                <Button onClick={downloadAsPDF} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button onClick={shareViaEmail} variant="outline" className="flex-1">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
              </div>
            )}
          </div>

          {/* Right Panel - Live Results */}
          <div className="space-y-4">
            <label className="block text-sm font-medium">Live Rewrite Progress</label>
            <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
              {rewrittenChunks.length > 0 ? (
                <div className="space-y-4">
                  {rewrittenChunks.map((chunk, index) => (
                    <div key={index} className="border-b pb-2">
                      <div className="text-xs text-gray-500 mb-1">Chunk {index + 1}:</div>
                      <div className="text-sm">
                        <MathRenderer content={chunk} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center mt-8">
                  {isRewriting ? "Processing chunks..." : "Rewritten chunks will appear here as they complete"}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChunkRewriteModal;