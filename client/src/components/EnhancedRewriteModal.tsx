import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Mail } from 'lucide-react';

interface EnhancedRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  rewrittenText: string;
  onRewriteUpdate: (newText: string) => void;
}

type RewriteMode = "rewrite_existing" | "add_new" | "hybrid";
type LLMProvider = "openai" | "anthropic" | "perplexity";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI (GPT-4)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "perplexity", label: "Perplexity AI" }
] as const;

const REWRITE_MODES = [
  { value: "rewrite_existing", label: "Rewrite Existing Only", description: "Only modify existing content chunks" },
  { value: "add_new", label: "Add New Content Only", description: "Keep existing text and add new chunks" },
  { value: "hybrid", label: "Hybrid: Rewrite + Add New", description: "Both rewrite existing and add new content" }
] as const;

const EnhancedRewriteModal: React.FC<EnhancedRewriteModalProps> = ({
  isOpen,
  onClose,
  originalText,
  rewrittenText,
  onRewriteUpdate
}) => {
  const { toast } = useToast();
  
  // Core state
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>("hybrid");
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("openai");
  const [customInstructions, setCustomInstructions] = useState<string>("ADD MORE APPLICATIONS TO FINANCE AND GEOMETRY\nINCLUDE LOTS OF MATH FORMULAS FROM STATISTICS AND CALCULUS AND GEOMETRY");
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [rewriteProgress, setRewriteProgress] = useState<number>(0);
  
  // 🔥 REAL-TIME STREAMING STATE
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [targetChunks, setTargetChunks] = useState<number>(3);
  
  // Content state
  const [currentRewrite, setCurrentRewrite] = useState<string>(rewrittenText);

  // Email sharing state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState<boolean>(false);
  const [isEmailSending, setIsEmailSending] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("Enhanced Document Rewrite");

  // Update current rewrite when prop changes
  useEffect(() => {
    setCurrentRewrite(rewrittenText);
  }, [rewrittenText]);

  // Reset instructions when modal opens for a new document
  useEffect(() => {
    if (isOpen && originalText !== currentRewrite) {
      setCustomInstructions("ADD MORE APPLICATIONS TO FINANCE AND GEOMETRY\nINCLUDE LOTS OF MATH FORMULAS FROM STATISTICS AND CALCULUS AND GEOMETRY");
      setRewriteMode("hybrid");
      setTargetChunks(3);
    }
  }, [isOpen, originalText]);

  // 🔥 REAL-TIME CHUNK STREAMING IMPLEMENTATION
  const handleRewrite = async () => {
    if (!originalText.trim()) {
      toast({
        title: "No content",
        description: "Please provide some content to rewrite",
        variant: "destructive"
      });
      return;
    }

    setIsRewriting(true);
    setIsStreaming(true);
    setRewriteProgress(0);
    setStreamingContent("");
    setChunkProgress({ current: 0, total: 0 });

    let textToRewrite = currentRewrite || originalText;
    let rewriteInstructions = customInstructions;
    
    if (rewriteMode === "add_new") {
      rewriteInstructions = `${customInstructions}\n\nIMPORTANT: Keep all existing content exactly as is. Only ADD ${targetChunks} new content sections that enhance the existing text.`;
    } else if (rewriteMode === "hybrid") {
      rewriteInstructions = `${customInstructions}\n\nYou may both rewrite existing content AND add ${targetChunks} new content sections as needed.`;
    }

    try {
      console.log("🔥 Starting REAL-TIME streaming rewrite...");
      let accumulatedContent = "";
      
      const response = await fetch('/api/rewrite-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: textToRewrite,
          instructions: rewriteInstructions,
          provider: selectedProvider,
          mode: rewriteMode,
          targetChunks: targetChunks,
          preserveMath: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      console.log("📡 Stream established - watching for live chunks...");

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log("✅ All chunks completed!");
          break;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                // 🔥 LIVE CHUNK RECEIVED - DISPLAY IMMEDIATELY
                accumulatedContent += data.content + '\n\n';
                setStreamingContent(accumulatedContent);
                setChunkProgress({ current: data.index, total: data.total });
                setRewriteProgress((data.index / data.total) * 100);
                
                console.log(`🔥 LIVE CHUNK ${data.index}/${data.total} DISPLAYED!`);
                
              } else if (data.type === 'complete') {
                console.log('🎉 Live streaming completed successfully!');
                break;
                
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (parseError) {
              console.error('Error parsing chunk:', parseError);
            }
          }
        }
      }

      // Finalize - PRESERVE THE CONTENT!
      const finalRewrite = accumulatedContent.trim();
      console.log("💾 PRESERVING FINAL CONTENT:", finalRewrite.length, "characters");
      
      // Update all content states to preserve the streamed content
      setCurrentRewrite(finalRewrite);
      setStreamingContent(finalRewrite); // Keep in streaming content too
      onRewriteUpdate(finalRewrite);
      
      // Only clear streaming state after content is preserved
      setIsStreaming(false);
      setIsRewriting(false);
      setRewriteProgress(100);
      
      toast({
        title: "🎉 Live streaming completed!",
        description: `Successfully processed ${chunkProgress.current} chunks with ${selectedProvider}. Content preserved!`
      });

    } catch (error) {
      console.error("❌ Streaming error:", error);
      setIsRewriting(false);
      setIsStreaming(false);
      toast({
        title: "Streaming failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentRewrite);
      toast({
        title: "Copied to clipboard",
        description: "Rewritten text has been copied to your clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handlePrintToPDF = () => {
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
            .math { font-family: 'Times New Roman', serif; }
            @media print { body { margin: 0.5in; } }
          </style>
        </head>
        <body>
          ${currentRewrite.split('\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
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

  const handleEmailShare = async () => {
    if (!recipientEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a recipient email address",
        variant: "destructive"
      });
      return;
    }

    setIsEmailSending(true);

    try {
      const response = await fetch('/api/share-simple-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail,
          subject: emailSubject,
          content: currentRewrite
        }),
      });

      if (response.ok) {
        toast({
          title: "Email sent successfully",
          description: `Document shared with ${recipientEmail}`
        });
        setIsEmailDialogOpen(false);
        setRecipientEmail("");
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Email failed to send",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>🔥 Enhanced Rewrite Studio - LIVE STREAMING</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left Panel - Controls */}
          <div className="space-y-4 overflow-y-auto pr-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🚀 Choose Your Rewrite Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {REWRITE_MODES.map((mode) => (
                    <div
                      key={mode.value}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        rewriteMode === mode.value
                          ? 'border-blue-500 bg-blue-100'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                      onClick={() => setRewriteMode(mode.value)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          checked={rewriteMode === mode.value}
                          onChange={() => setRewriteMode(mode.value)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{mode.label}</div>
                          <div className="text-sm text-gray-600">{mode.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* 🔥 CHUNK CONTROL - URGENT FEATURE */}
            {(rewriteMode === "add_new" || rewriteMode === "hybrid") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">📊 Number of chunks to add: {targetChunks}</CardTitle>
                </CardHeader>
                <CardContent>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={targetChunks} 
                    onChange={(e) => setTargetChunks(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 chunk</span>
                    <span>10 chunks</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Provider Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">AI Provider</Label>
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
            
            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rewrite Instructions</Label>
              <Textarea
                placeholder="Enter specific instructions..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={4}
              />
            </div>

            {/* 🔥 REWRITE BUTTON WITH STREAMING */}
            <Button 
              onClick={handleRewrite} 
              disabled={isRewriting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {isRewriting ? (
                <span>🔄 Streaming chunks live...</span>
              ) : (
                <span>🔥 Start Live Streaming Rewrite</span>
              )}
            </Button>

            {/* Progress Bar */}
            {isRewriting && (
              <div className="space-y-2">
                <Progress value={rewriteProgress} className="w-full" />
                <div className="text-xs text-gray-500 text-center">
                  {rewriteProgress.toFixed(0)}% complete
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - 🔥 LIVE STREAMING RESULTS */}
          <div className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>🔥 Live Streaming Content</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                  {isStreaming ? (
                    <div>
                      {/* 🔥 LIVE PROGRESS INDICATOR */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-800 font-semibold">🔄 Processing chunks LIVE...</span>
                          <span className="text-blue-600 text-sm">
                            Chunk {chunkProgress.current} of {chunkProgress.total}
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: chunkProgress.total > 0 ? `${(chunkProgress.current / chunkProgress.total) * 100}%` : '0%' 
                            }}
                          ></div>
                        </div>
                      </div>
                      {/* 🔥 LIVE STREAMING CONTENT */}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {streamingContent || "Starting live streaming..."}
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {currentRewrite || "No content yet - click 'Start Live Streaming Rewrite' to begin"}
                    </div>
                  )}
                </div>
                
                {/* Export & Share */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrintToPDF}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                    <FileText className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEmailDialogOpen(true)}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Email Dialog */}
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share via Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Recipient Email</Label>
                <input
                  id="email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <input
                  id="subject"
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <Button onClick={handleEmailShare} disabled={isEmailSending} className="w-full">
                {isEmailSending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedRewriteModal;