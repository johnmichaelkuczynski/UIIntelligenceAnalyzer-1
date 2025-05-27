import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { MathRenderer } from './MathRenderer';
import { 
  FileEdit, 
  Download, 
  Mail, 
  Eye, 
  CheckSquare, 
  Square,
  RotateCw,
  FileText,
  Printer
} from 'lucide-react';
import { DocumentInput as DocumentInputType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface TextChunk {
  id: number;
  content: string;
  selected: boolean;
  startIndex: number;
  endIndex: number;
}

interface ImmediateRewriteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentInputType;
  selectedProvider: string;
}

const ImmediateRewriteDialog: React.FC<ImmediateRewriteDialogProps> = ({
  isOpen,
  onClose,
  document,
  selectedProvider
}) => {
  const { toast } = useToast();
  
  // Text chunking and selection
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [selectedChunks, setSelectedChunks] = useState<Set<number>>(new Set());
  const [previewChunk, setPreviewChunk] = useState<number | null>(null);
  
  // Rewrite state
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewrittenText, setRewrittenText] = useState('');
  const [showMathView, setShowMathView] = useState(false);
  
  // Email state
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Current tab
  const [activeTab, setActiveTab] = useState('rewrite');

  // Chunk the text when dialog opens
  useEffect(() => {
    if (isOpen && document.content) {
      const textChunks = createTextChunks(document.content);
      setChunks(textChunks);
      setSelectedChunks(new Set(textChunks.map(chunk => chunk.id)));
      setRewrittenText('');
      setActiveTab('rewrite');
    }
  }, [isOpen, document.content]);

  // Create text chunks for large documents
  const createTextChunks = (text: string): TextChunk[] => {
    const CHUNK_SIZE = 2000; // Characters per chunk
    const chunks: TextChunk[] = [];
    
    if (text.length <= CHUNK_SIZE) {
      return [{
        id: 0,
        content: text,
        selected: true,
        startIndex: 0,
        endIndex: text.length
      }];
    }

    let currentIndex = 0;
    let chunkId = 0;

    while (currentIndex < text.length) {
      let endIndex = Math.min(currentIndex + CHUNK_SIZE, text.length);
      
      // Try to break at a sentence or paragraph boundary
      if (endIndex < text.length) {
        const nextPeriod = text.indexOf('.', endIndex - 200);
        const nextNewline = text.indexOf('\n', endIndex - 200);
        const breakPoint = Math.max(nextPeriod, nextNewline);
        
        if (breakPoint > currentIndex && breakPoint < endIndex + 100) {
          endIndex = breakPoint + 1;
        }
      }

      chunks.push({
        id: chunkId,
        content: text.slice(currentIndex, endIndex),
        selected: true,
        startIndex: currentIndex,
        endIndex: endIndex
      });

      currentIndex = endIndex;
      chunkId++;
    }

    return chunks;
  };

  // Toggle chunk selection
  const toggleChunk = (chunkId: number) => {
    const newSelected = new Set(selectedChunks);
    if (newSelected.has(chunkId)) {
      newSelected.delete(chunkId);
    } else {
      newSelected.add(chunkId);
    }
    setSelectedChunks(newSelected);
  };

  // Select all chunks
  const selectAllChunks = () => {
    setSelectedChunks(new Set(chunks.map(chunk => chunk.id)));
  };

  // Deselect all chunks
  const deselectAllChunks = () => {
    setSelectedChunks(new Set());
  };

  // Handle rewrite
  const handleRewrite = async () => {
    if (!rewriteInstructions.trim()) {
      toast({
        title: "Instructions required",
        description: "Please provide rewrite instructions",
        variant: "destructive"
      });
      return;
    }

    if (selectedChunks.size === 0) {
      toast({
        title: "No chunks selected",
        description: "Please select at least one chunk to rewrite",
        variant: "destructive"
      });
      return;
    }

    setIsRewriting(true);

    try {
      const selectedChunkContents = chunks
        .filter(chunk => selectedChunks.has(chunk.id))
        .map(chunk => chunk.content)
        .join('\n\n');

      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: selectedChunkContents,
          options: {
            instruction: rewriteInstructions,
            preserveLength: false,
            preserveDepth: true
          },
          provider: selectedProvider
        })
      });

      if (!response.ok) throw new Error('Rewrite failed');

      const result = await response.json();
      setRewrittenText(result.content);
      setActiveTab('results');

      toast({
        title: "Rewrite complete",
        description: "Your text has been successfully rewritten"
      });

    } catch (error) {
      console.error('Rewrite error:', error);
      toast({
        title: "Rewrite failed",
        description: "Failed to rewrite the text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };

  // Handle PDF download using print functionality
  const handlePrintToPDF = () => {
    if (!rewrittenText) {
      toast({
        title: "No content to download",
        description: "Please rewrite the text first",
        variant: "destructive"
      });
      return;
    }

    // Create a new window with the rewritten content formatted for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rewritten Document</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              max-width: 8.5in; 
              margin: 0 auto; 
              padding: 1in;
              background: white;
            }
            .math-display { margin: 1em 0; text-align: center; }
            .math-inline { }
            @media print {
              body { margin: 0; padding: 0.5in; }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js"></script>
        </head>
        <body>
          <div id="content">${rewrittenText.replace(/\n/g, '<br>')}</div>
          <script>
            // Render any math notation
            document.addEventListener('DOMContentLoaded', function() {
              setTimeout(() => window.print(), 500);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle Word download
  const handleWordDownload = async () => {
    if (!rewrittenText) {
      toast({
        title: "No content to download",
        description: "Please rewrite the text first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: rewrittenText.split('\n\n').map(paragraph => 
            new Paragraph({
              children: [new TextRun(paragraph)]
            })
          )
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = 'rewritten-document.docx';
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your Word document is being downloaded"
      });

    } catch (error) {
      console.error('Word download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download Word document",
        variant: "destructive"
      });
    }
  };

  // Handle email sharing
  const handleEmailShare = async () => {
    if (!emailRecipient.trim() || !rewrittenText) {
      toast({
        title: "Missing information",
        description: "Please provide recipient email and ensure text is rewritten",
        variant: "destructive"
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch('/api/share-simple-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailRecipient,
          subject: emailSubject || 'Rewritten Document',
          content: rewrittenText
        })
      });

      if (!response.ok) throw new Error('Email send failed');

      toast({
        title: "Email sent",
        description: `Document shared with ${emailRecipient}`
      });

      setEmailRecipient('');
      setEmailSubject('');

    } catch (error) {
      console.error('Email error:', error);
      toast({
        title: "Email failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Immediate Rewrite
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rewrite">Rewrite Setup</TabsTrigger>
            <TabsTrigger value="results" disabled={!rewrittenText}>Results & Share</TabsTrigger>
          </TabsList>

          <TabsContent value="rewrite" className="space-y-6">
            {/* Chunk Management */}
            {chunks.length > 1 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Text Chunks ({chunks.length} total)</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllChunks}>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllChunks}>
                      <Square className="h-4 w-4 mr-1" />
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {chunks.map((chunk) => (
                    <div key={chunk.id} className="flex items-start gap-3 p-3 border rounded-md">
                      <Checkbox
                        checked={selectedChunks.has(chunk.id)}
                        onCheckedChange={() => toggleChunk(chunk.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <Badge variant="outline">Chunk {chunk.id + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewChunk(previewChunk === chunk.id ? null : chunk.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {previewChunk === chunk.id ? 'Hide' : 'Preview'}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {chunk.content.substring(0, 100)}...
                        </p>
                        {previewChunk === chunk.id && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm max-h-32 overflow-y-auto">
                            {chunk.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewrite Instructions */}
            <div className="space-y-2">
              <Label htmlFor="rewrite-instructions">Rewrite Instructions</Label>
              <Textarea
                id="rewrite-instructions"
                placeholder="Describe exactly how you want the text rewritten. Example: 'Simplify the language for a general audience' or 'Make it more formal and academic'"
                className="min-h-[100px]"
                value={rewriteInstructions}
                onChange={(e) => setRewriteInstructions(e.target.value)}
              />
            </div>

            {/* Rewrite Button */}
            <Button
              onClick={handleRewrite}
              disabled={isRewriting || selectedChunks.size === 0}
              className="w-full"
            >
              {isRewriting ? (
                <>
                  <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Rewrite Selected Chunks
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {rewrittenText && (
              <>
                {/* Results Display */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Rewritten Text</h3>
                    {rewrittenText.includes('\\') || rewrittenText.includes('^') || rewrittenText.includes('_') || rewrittenText.includes('$') ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMathView(!showMathView)}
                      >
                        {showMathView ? "Normal View" : "View Math"}
                      </Button>
                    ) : null}
                  </div>

                  {showMathView ? (
                    <div className="border rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
                      <MathRenderer content={rewrittenText} />
                    </div>
                  ) : (
                    <Textarea
                      value={rewrittenText}
                      className="min-h-[300px] font-mono text-sm"
                      readOnly
                    />
                  )}
                </div>

                {/* Download Options */}
                <div className="space-y-4">
                  <h4 className="font-medium">Download Options</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrintToPDF}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print/Save as PDF
                    </Button>
                    <Button variant="outline" onClick={handleWordDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Word
                    </Button>
                  </div>
                </div>

                {/* Email Sharing */}
                <div className="space-y-4">
                  <h4 className="font-medium">Share via Email</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-recipient">Recipient Email</Label>
                      <Input
                        id="email-recipient"
                        type="email"
                        placeholder="recipient@example.com"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-subject">Subject (optional)</Label>
                      <Input
                        id="email-subject"
                        placeholder="Rewritten Document"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleEmailShare}
                    disabled={isSendingEmail || !emailRecipient.trim()}
                    className="w-full"
                  >
                    {isSendingEmail ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImmediateRewriteDialog;