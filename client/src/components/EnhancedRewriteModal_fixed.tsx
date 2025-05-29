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
  
  // Content state - NEVER CLEAR THIS
  const [currentRewrite, setCurrentRewrite] = useState<string>("");

  // Email sharing state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState<boolean>(false);
  const [isEmailSending, setIsEmailSending] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("Enhanced Document Rewrite");
  
  // 🔥 MINIMIZE STATE
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  
  // 🚨 EMERGENCY FREEZE STATE
  const [isFrozen, setIsFrozen] = useState<boolean>(false);

  // Update current rewrite when prop changes
  useEffect(() => {
    setCurrentRewrite(rewrittenText);
  }, [rewrittenText]);

  // 🔄 CRITICAL: Reset function to clear state when opening for new document
  const resetModalState = () => {
    console.log("🔄 RESETTING MODAL STATE - NO PRESERVED CONTENT");
    setCustomInstructions("ADD MORE APPLICATIONS TO FINANCE AND GEOMETRY\nINCLUDE LOTS OF MATH FORMULAS FROM STATISTICS AND CALCULUS AND GEOMETRY");
    setRewriteProgress(0);
    setIsRewriting(false);
    setIsStreaming(false);
    setStreamingContent("");
    setChunkProgress({ current: 0, total: 0 });
    // DO NOT clear currentRewrite - this preserves user's work
  };

  // Reset when modal opens with different content
  useEffect(() => {
    if (isOpen && originalText && !currentRewrite) {
      resetModalState();
    }
  }, [isOpen, originalText]);

  const handleStartRewrite = async () => {
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
                
                // 🔥 DEPOSIT CHUNK INTO CHAT DIALOG
                if ((window as any).addChatChunk) {
                  (window as any).addChatChunk(data.content, data.index, data.total);
                }
                
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

      // 🚨 EMERGENCY FREEZE - CAPTURE CONTENT BEFORE IT DISAPPEARS
      const finalRewrite = accumulatedContent.trim();
      console.log("💾 CRITICAL PRESERVATION:", finalRewrite.length, "characters");
      console.log("💾 CONTENT PREVIEW:", finalRewrite.substring(0, 200));
      
      // 🚨 ACTIVATE EMERGENCY FREEZE
      setIsFrozen(true);
      
      setIsRewriting(false);
      setRewriteProgress(100);
      
      // Update final content state
      setCurrentRewrite(finalRewrite);
      onRewriteUpdate(finalRewrite);
      
      toast({
        title: "🚨 CONTENT FROZEN!",
        description: `${finalRewrite.length} characters preserved! Check chat dialog below.`
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

  const handleSendEmail = async () => {
    if (!recipientEmail || !currentRewrite) return;

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
        toast({ title: "Email sent successfully" });
        setIsEmailDialogOpen(false);
        setRecipientEmail("");
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Email failed to send",
        variant: "destructive"
      });
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>🔥 Enhanced Rewrite Studio - LIVE STREAMING</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isMinimized ? "📖 Expand" : "📖 Minimize"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {!isMinimized && (
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
                
                {/* Chunk Control */}
                {(rewriteMode === "add_new" || rewriteMode === "hybrid") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">📊 Content Chunks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Label>Number of chunks to add: {targetChunks}</Label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={targetChunks}
                          onChange={(e) => setTargetChunks(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Provider Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🤖 AI Provider</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                {/* Custom Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">✍️ Custom Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Enter your rewrite instructions..."
                      className="min-h-32"
                    />
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleStartRewrite} 
                    disabled={isRewriting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isRewriting ? "🔥 Live Streaming..." : "🚀 Start Rewrite"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEmailDialogOpen(true)}
                    disabled={!currentRewrite}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress Display */}
                {isRewriting && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">🔥 Live Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Progress value={rewriteProgress} className="w-full" />
                        <p className="text-sm text-gray-600">
                          Chunk {chunkProgress.current} of {chunkProgress.total} 
                          {chunkProgress.total > 0 && ` (${Math.round(rewriteProgress)}%)`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Panel - Live Content */}
              <div className="flex flex-col h-full">
                <Card className="flex-1 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {isStreaming ? "🔥 LIVE STREAMING CONTENT" : "📝 Rewritten Content"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-full overflow-y-auto">
                    <div className="whitespace-pre-wrap font-mono text-sm">
                      {isStreaming ? streamingContent : currentRewrite}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 🚨 EMERGENCY FREEZE WARNING */}
      {isFrozen && (
        <div className="fixed inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">🚨 CONTENT PRESERVED!</h2>
            <p className="text-lg mb-4">The rewrite is complete and FROZEN in place!</p>
            <p className="text-sm text-gray-600 mb-4">Check the chat dialog below for the saved content.</p>
            <Button onClick={() => setIsFrozen(false)} className="bg-red-600 hover:bg-red-700 text-white">
              Unfreeze & Continue
            </Button>
          </div>
        </div>
      )}

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
                className="w-full p-2 border rounded-lg"
                placeholder="Enter recipient email"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <input
                id="subject"
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="Email subject"
              />
            </div>
            <Button onClick={handleSendEmail} disabled={isEmailSending || !recipientEmail}>
              {isEmailSending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedRewriteModal;