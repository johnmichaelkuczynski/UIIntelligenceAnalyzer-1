import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText } from 'lucide-react';

interface SimpleRewriteModalProps {
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

const SimpleRewriteModal: React.FC<SimpleRewriteModalProps> = ({
  isOpen,
  onClose,
  originalText,
  onRewriteUpdate
}) => {
  const { toast } = useToast();
  const [instructions, setInstructions] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("openai");
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");

  // Clear instructions when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setInstructions("");
      setResult("");
    }
  }, [isOpen]);

  const handleRewrite = async () => {
    if (!instructions.trim()) {
      toast({
        title: "Instructions required",
        description: "Please enter rewrite instructions",
        variant: "destructive"
      });
      return;
    }

    setIsRewriting(true);
    
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: originalText,
          instructions: instructions,
          provider: selectedProvider
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const rewrittenText = data.content || data.rewrittenText || "";
      
      // Clean any markup formatting
      const cleanText = rewrittenText
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^#+\s*/gm, '')
        .trim();
      
      setResult(cleanText);
      onRewriteUpdate(cleanText);
      
      // Add to chat dialog
      if ((window as any).addChatChunk) {
        (window as any).addChatChunk(cleanText, 1, 1);
      }
      
      toast({
        title: "Rewrite completed!",
        description: "Content has been rewritten and saved to chat below"
      });

    } catch (error) {
      console.error("Rewrite error:", error);
      toast({
        title: "Rewrite failed",
        description: "Please try again with different instructions",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const handleUseResult = () => {
    onRewriteUpdate(result);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Simple Rewrite Tool</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left Panel - Input */}
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
                placeholder="Enter your rewrite instructions here..."
                className="min-h-32"
              />
            </div>

            <Button 
              onClick={handleRewrite} 
              disabled={isRewriting || !instructions.trim()}
              className="w-full"
            >
              {isRewriting ? "Rewriting..." : "Start Rewrite"}
            </Button>
          </div>

          {/* Right Panel - Result */}
          <div className="space-y-4">
            <label className="block text-sm font-medium">Rewritten Content</label>
            <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
              {result ? (
                <div className="whitespace-pre-wrap text-sm">
                  {result}
                </div>
              ) : (
                <div className="text-gray-500 text-center mt-8">
                  Rewritten content will appear here
                </div>
              )}
            </div>
            
            {result && (
              <div className="flex space-x-2">
                <Button onClick={handleUseResult} className="flex-1">
                  Use This Result
                </Button>
                <Button variant="outline" onClick={() => setResult("")}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleRewriteModal;