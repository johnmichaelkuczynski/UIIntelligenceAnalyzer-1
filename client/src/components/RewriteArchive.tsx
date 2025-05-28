import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MathRenderer } from './MathRenderer';
import { useToast } from '@/hooks/use-toast';
import { 
  Archive, 
  FileText, 
  RotateCw, 
  Calendar,
  User,
  RefreshCw,
  Eye,
  Trash2,
  Download,
  Copy
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface RewriteEntry {
  id: number;
  originalText: string;
  rewrittenText: string;
  instructions: string;
  provider: string;
  parentRewriteId?: number;
  rewriteLevel: number;
  stats?: any;
  createdAt: string;
}

export const RewriteArchive: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRewrite, setSelectedRewrite] = useState<RewriteEntry | null>(null);
  const [showReRewriteDialog, setShowReRewriteDialog] = useState(false);
  const [reRewriteInstructions, setReRewriteInstructions] = useState('');
  const [reRewriteProvider, setReRewriteProvider] = useState('openai');
  const [isReRewriting, setIsReRewriting] = useState(false);
  const [viewMode, setViewMode] = useState<'normal' | 'math'>('normal');

  // Fetch rewrite archive
  const { data: archiveData, isLoading, refetch } = useQuery({
    queryKey: ['/api/rewrite-archive'],
    queryFn: () => apiRequest('GET', '/api/rewrite-archive')
  });

  const rewrites: RewriteEntry[] = archiveData?.rewrites || [];

  // Save rewrite mutation
  const saveRewriteMutation = useMutation({
    mutationFn: (rewriteData: any) => apiRequest('POST', '/api/save-rewrite', rewriteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewrite-archive'] });
    }
  });

  // Re-rewrite mutation
  const reRewriteMutation = useMutation({
    mutationFn: async ({ text, instructions, provider }: { text: string; instructions: string; provider: string }) => {
      return apiRequest('POST', '/api/rewrite', {
        originalText: text,
        options: { instruction: instructions },
        provider
      });
    },
    onSuccess: (data, variables) => {
      if (selectedRewrite) {
        // Save the re-rewrite to database
        saveRewriteMutation.mutate({
          originalText: selectedRewrite.rewrittenText,
          rewrittenText: data.content,
          instructions: variables.instructions,
          provider: variables.provider,
          parentRewriteId: selectedRewrite.id,
          rewriteLevel: selectedRewrite.rewriteLevel + 1,
          stats: data.stats
        });
        
        toast({
          title: "Re-rewrite complete!",
          description: `Level ${selectedRewrite.rewriteLevel + 1} rewrite has been created and saved.`
        });
        
        setShowReRewriteDialog(false);
        setReRewriteInstructions('');
      }
    },
    onError: (error) => {
      toast({
        title: "Re-rewrite failed",
        description: "Failed to create re-rewrite. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleReRewrite = () => {
    if (!selectedRewrite || !reRewriteInstructions.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a rewrite and provide instructions.",
        variant: "destructive"
      });
      return;
    }

    setIsReRewriting(true);
    reRewriteMutation.mutate({
      text: selectedRewrite.rewrittenText,
      instructions: reRewriteInstructions,
      provider: reRewriteProvider
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text copied to clipboard"
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRewriteChain = (rewrite: RewriteEntry): RewriteEntry[] => {
    const chain = [rewrite];
    let current = rewrite;
    
    while (current.parentRewriteId) {
      const parent = rewrites.find(r => r.id === current.parentRewriteId);
      if (parent) {
        chain.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return chain;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading archive...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-purple-800">Rewrite Archive</h2>
          <Badge variant="secondary">{rewrites.length} rewrites</Badge>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {rewrites.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No rewrites in archive yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Rewrites will appear here automatically when you create them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rewrites.map((rewrite) => {
            const chain = getRewriteChain(rewrite);
            const isChainHead = chain[chain.length - 1].id === rewrite.id;
            
            return (
              <Card key={rewrite.id} className="border-purple-200 hover:border-purple-300 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <CardTitle className="text-sm font-medium">
                        Level {rewrite.rewriteLevel} Rewrite
                        {rewrite.parentRewriteId && (
                          <Badge variant="outline" className="ml-2">
                            Re-rewrite
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {rewrite.provider}
                      </Badge>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(rewrite.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <strong>Instructions:</strong> {rewrite.instructions}
                  </p>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 mb-1 block">
                        REWRITTEN TEXT
                      </Label>
                      <div className="border rounded-md p-3 bg-green-50 max-h-40 overflow-y-auto">
                        {viewMode === 'math' ? (
                          <MathRenderer content={rewrite.rewrittenText} />
                        ) : (
                          <pre className="whitespace-pre-wrap text-sm text-gray-700">
                            {rewrite.rewrittenText.substring(0, 500)}
                            {rewrite.rewrittenText.length > 500 && '...'}
                          </pre>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewMode(viewMode === 'normal' ? 'math' : 'normal')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {viewMode === 'normal' ? 'View Math' : 'Normal View'}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyText(rewrite.rewrittenText)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      
                      <Dialog open={showReRewriteDialog} onOpenChange={setShowReRewriteDialog}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => setSelectedRewrite(rewrite)}
                          >
                            <RotateCw className="h-3 w-3 mr-1" />
                            Re-Rewrite
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Create Re-Rewrite (Level {(selectedRewrite?.rewriteLevel || 0) + 1})</DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <Label>Current Text (will be re-rewritten)</Label>
                              <ScrollArea className="h-32 border rounded-md p-3 bg-gray-50">
                                <pre className="whitespace-pre-wrap text-sm">
                                  {selectedRewrite?.rewrittenText.substring(0, 300)}
                                  {(selectedRewrite?.rewrittenText.length || 0) > 300 && '...'}
                                </pre>
                              </ScrollArea>
                            </div>
                            
                            <div>
                              <Label htmlFor="rerewrite-instructions">Re-Rewrite Instructions</Label>
                              <Textarea
                                id="rerewrite-instructions"
                                placeholder="Enter instructions for re-rewriting this text..."
                                value={reRewriteInstructions}
                                onChange={(e) => setReRewriteInstructions(e.target.value)}
                                rows={4}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="rerewrite-provider">AI Provider</Label>
                              <Select value={reRewriteProvider} onValueChange={setReRewriteProvider}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                  <SelectItem value="perplexity">Perplexity</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setShowReRewriteDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleReRewrite}
                                disabled={reRewriteMutation.isPending || !reRewriteInstructions.trim()}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                {reRewriteMutation.isPending ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Re-Rewriting...
                                  </>
                                ) : (
                                  <>
                                    <RotateCw className="h-4 w-4 mr-2" />
                                    Create Re-Rewrite
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};