import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MathRenderer } from './MathRenderer';
import {
  Download,
  FileText,
  Mail,
  RotateCw,
  ClipboardCopy,
  CheckCircle,
  Edit3,
  Plus,
  ChevronDown,
  ChevronUp,
  Printer
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

interface RewriteChunk {
  id: string;
  content: string;
  isSelected: boolean;
  position: number;
}

interface EnhancedRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  rewrittenText: string;
  onRewriteUpdate: (newText: string) => void;
}

// Rewrite mode options
const REWRITE_MODES = [
  { 
    value: "rewrite_existing", 
    label: "Rewrite Existing Only", 
    description: "Only modify existing content chunks" 
  },
  { 
    value: "add_new", 
    label: "Add New Content Only", 
    description: "Keep existing text and add new chunks" 
  },
  { 
    value: "hybrid", 
    label: "Hybrid: Rewrite + Add", 
    description: "Both rewrite existing and add new content" 
  }
];

// AI Provider options
const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI (GPT-4)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "perplexity", label: "Perplexity" }
];

const EnhancedRewriteModal: React.FC<EnhancedRewriteModalProps> = ({
  isOpen,
  onClose,
  originalText,
  rewrittenText,
  onRewriteUpdate
}) => {
  const { toast } = useToast();
  
  // State for rewrite configuration
  const [rewriteMode, setRewriteMode] = useState<string>("rewrite_existing");
  const [selectedProvider, setSelectedProvider] = useState<string>("openai");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [rewriteProgress, setRewriteProgress] = useState<number>(0);
  
  // State for chunk management
  const [textChunks, setTextChunks] = useState<RewriteChunk[]>([]);
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
  const [showChunkSelection, setShowChunkSelection] = useState<boolean>(false);
  
  // State for current rewrite display
  const [currentRewrite, setCurrentRewrite] = useState<string>(rewrittenText);
  const [downloadLinkRef] = useState(useRef<HTMLAnchorElement | null>(null));
  
  // Email sharing state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("Rewritten Document");
  const [isEmailSending, setIsEmailSending] = useState<boolean>(false);
  
  // Initialize chunks when modal opens
  useEffect(() => {
    if (isOpen) {
      // Always clear when opening modal for fresh start
      setCurrentRewrite("");
      setTextChunks([]);
      setRewriteMode("hybrid");
      setCustomInstructions("");
      setSelectedProvider("openai");
      setShowChunkSelection(false);
    }
  }, [isOpen, originalText]);
  
  // Set up download link
  useEffect(() => {
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    downloadLinkRef.current = link;
    
    return () => {
      if (link && document.body.contains(link)) {
        document.body.removeChild(link);
      }
    };
  }, []);
  
  // Create text chunks from rewritten text
  const createTextChunks = (text: string): RewriteChunk[] => {
    // Split text into logical chunks (paragraphs, sections, etc.)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    return paragraphs.map((paragraph, index) => ({
      id: `chunk-${index}`,
      content: paragraph.trim(),
      isSelected: false,
      position: index
    }));
  };
  
  // Handle chunk selection
  const handleChunkToggle = (chunkId: string) => {
    const newSelected = new Set(selectedChunks);
    if (newSelected.has(chunkId)) {
      newSelected.delete(chunkId);
    } else {
      newSelected.add(chunkId);
    }
    setSelectedChunks(newSelected);
  };
  
  // Select all chunks
  const handleSelectAll = () => {
    if (selectedChunks.size === textChunks.length) {
      setSelectedChunks(new Set());
    } else {
      setSelectedChunks(new Set(textChunks.map(chunk => chunk.id)));
    }
  };
  
  // Perform enhanced rewrite
  const handleEnhancedRewrite = async () => {
    if (!customInstructions.trim()) {
      toast({
        title: "Instructions required",
        description: "Please provide custom rewrite instructions",
        variant: "destructive"
      });
      return;
    }
    
    setIsRewriting(true);
    setRewriteProgress(0);
    
    try {
      let textToRewrite = currentRewrite;
      
      // For rewrite_existing mode, use the original text (or selected chunks if available)
      if (rewriteMode === "rewrite_existing") {
        if (selectedChunks.size > 0 && showChunkSelection && textChunks.length > 0) {
          const selectedChunkContents = textChunks
            .filter(chunk => selectedChunks.has(chunk.id))
            .map(chunk => chunk.content)
            .join('\n\n');
          textToRewrite = selectedChunkContents;
        } else {
          textToRewrite = originalText; // Use original text if no chunks selected
        }
      } else {
        // For add_new and hybrid modes, always use the original text as the base
        textToRewrite = originalText;
      }
      
      // Progress simulation
      const progressInterval = setInterval(() => {
        setRewriteProgress(prev => prev < 90 ? prev + Math.random() * 10 : prev);
      }, 500);
      
      // Prepare rewrite request based on mode
      let rewriteInstructions = customInstructions;
      
      if (rewriteMode === "add_new") {
        rewriteInstructions = `${customInstructions}\n\nIMPORTANT: Keep all existing content exactly as is. Only ADD new content that enhances or expands on the existing text. Do not modify any existing sentences or paragraphs.`;
      } else if (rewriteMode === "hybrid") {
        rewriteInstructions = `${customInstructions}\n\nYou may both rewrite existing content AND add new content as needed to best fulfill the instructions.`;
      }
      
      // Make the rewrite API call
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: textToRewrite,
          instructions: rewriteInstructions,
          provider: selectedProvider,
          mode: rewriteMode
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.content) {
        throw new Error(data.message || "No content received from rewrite");
      }
      
      let finalRewrite = data.content;
      
      // If we only rewrote selected chunks, merge them back
      if (rewriteMode === "rewrite_existing" && selectedChunks.size > 0 && selectedChunks.size < textChunks.length) {
        const updatedChunks = [...textChunks];
        const rewrittenChunkTexts = finalRewrite.split(/\n\s*\n/);
        let rewriteIndex = 0;
        
        updatedChunks.forEach((chunk, index) => {
          if (selectedChunks.has(chunk.id) && rewriteIndex < rewrittenChunkTexts.length) {
            updatedChunks[index] = {
              ...chunk,
              content: rewrittenChunkTexts[rewriteIndex].trim()
            };
            rewriteIndex++;
          }
        });
        
        finalRewrite = updatedChunks.map(chunk => chunk.content).join('\n\n');
      }
      
      // Clean up progress and update state
      clearInterval(progressInterval);
      setRewriteProgress(100);
      setIsRewriting(false);
      
      // Update the content
      console.log("Setting rewritten content:", finalRewrite.substring(0, 100) + "...");
      setCurrentRewrite(finalRewrite);
      onRewriteUpdate(finalRewrite);
      
      // Update chunks for the new text
      const newChunks = createTextChunks(finalRewrite);
      setTextChunks(newChunks);
      setSelectedChunks(new Set());
      
      // Force a re-render by updating a dummy state
      setRewriteProgress(100);
      
      // Reset progress after a brief moment
      setTimeout(() => {
        setRewriteProgress(0);
      }, 1000);
      
      toast({
        title: "Rewrite completed",
        description: `Successfully rewritten using ${selectedProvider} in ${rewriteMode.replace('_', ' ')} mode`
      });
    } catch (error) {
      console.error("Rewrite error:", error);
      toast({
        title: "Rewrite failed",
        description: error instanceof Error ? error.message : "An error occurred during rewriting",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
      setRewriteProgress(0);
    }
  };
  
  // Copy to clipboard
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
  
  // Print/Save as PDF (preserves math notation)
  const handlePrintToPDF = () => {
    // Create a new window with the content for printing
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
            @media print { 
              body { margin: 0.5in; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="content">${currentRewrite.replace(/\n/g, '<br>')}</div>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait for MathJax to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 2000);
    }
  };
  
  // Download as Word document
  const handleDownloadWord = async () => {
    try {
      // Create a new document
      const doc = new Document({
        sections: [{
          children: currentRewrite.split('\n\n').map(paragraph => 
            new Paragraph({
              children: [new TextRun(paragraph.trim())]
            })
          )
        }]
      });
      
      // Generate the document buffer
      const buffer = await Packer.toBuffer(doc);
      
      // Create download link
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = url;
        downloadLinkRef.current.download = 'rewritten-document.docx';
        downloadLinkRef.current.click();
      }
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast({
        title: "Download started",
        description: "Word document is being downloaded"
      });
    } catch (error) {
      console.error("Word download error:", error);
      toast({
        title: "Download failed",
        description: "Unable to create Word document",
        variant: "destructive"
      });
    }
  };
  
  // Send via email
  const handleSendEmail = async () => {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          subject: emailSubject,
          content: currentRewrite
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Email sent",
          description: `Document sent successfully to ${recipientEmail}`
        });
        setIsEmailDialogOpen(false);
        setRecipientEmail("");
      } else {
        throw new Error(data.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Email error:", error);
      toast({
        title: "Email failed",
        description: error instanceof Error ? error.message : "Unable to send email",
        variant: "destructive"
      });
    } finally {
      setIsEmailSending(false);
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Enhanced Rewrite Studio
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Rewrite Controls */}
            <div className="space-y-4 overflow-y-auto">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Rewrite Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rewrite Mode Selection - PROMINENT */}
                  <div className="space-y-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <Label className="text-lg font-bold text-blue-800">🚀 Choose Your Rewrite Mode</Label>
                    <div className="grid gap-3">
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
                  </div>
                  
                  {/* AI Provider Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Provider</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
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
                    <Label className="text-sm font-medium">
                      {rewriteMode === "rewrite_existing" 
                        ? "Custom Rewrite Instructions" 
                        : rewriteMode === "add_new"
                        ? "Instructions for NEW Content to Add"
                        : "Hybrid Rewrite & Addition Instructions"}
                    </Label>
                    <Textarea
                      placeholder={
                        rewriteMode === "rewrite_existing"
                          ? "Enter specific instructions for how you want the text to be rewritten..."
                          : rewriteMode === "add_new"
                          ? "Specify exactly what NEW content to add. Example: 'Add 3 new paragraphs about advanced mathematical proofs. Add a new section on topology. Add examples with equations.'"
                          : "Specify both how to rewrite existing content AND what new content to add. Example: 'Rewrite existing text to be more technical, AND add 2 new sections on advanced topics with mathematical notation.'"
                      }
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={rewriteMode === "rewrite_existing" ? 4 : 6}
                      className={rewriteMode !== "rewrite_existing" ? "border-green-500 bg-green-50" : ""}
                    />
                    
                    {/* Additional guidance for new content modes */}
                    {rewriteMode === "add_new" && (
                      <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                        <p className="text-sm font-medium text-green-800 mb-2">💡 Tips for Adding New Content:</p>
                        <ul className="text-xs text-green-700 space-y-1">
                          <li>• Specify exactly how many new sections/paragraphs to add</li>
                          <li>• Describe the topic and content for each new section</li>
                          <li>• Mention if you want mathematical notation, examples, or specific formatting</li>
                          <li>• The existing text will remain unchanged</li>
                        </ul>
                      </div>
                    )}
                    
                    {rewriteMode === "hybrid" && (
                      <div className="p-3 bg-purple-100 border border-purple-300 rounded-lg">
                        <p className="text-sm font-medium text-purple-800 mb-2">🚀 Hybrid Mode Guidelines:</p>
                        <ul className="text-xs text-purple-700 space-y-1">
                          <li>• First, describe how to modify existing content</li>
                          <li>• Then, specify what new content to add and where</li>
                          <li>• Example: "Make existing text more formal, AND add 3 new mathematical examples"</li>
                          <li>• Both existing and new content will be processed</li>
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* Chunk Selection for long texts */}
                  {textChunks.length > 1 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Select Chunks to Rewrite</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowChunkSelection(!showChunkSelection)}
                        >
                          {showChunkSelection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {showChunkSelection && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                              {selectedChunks.size === textChunks.length ? "Deselect All" : "Select All"}
                            </Button>
                            <Badge variant="secondary">
                              {selectedChunks.size} of {textChunks.length} chunks selected
                            </Badge>
                          </div>
                          
                          <div className="max-h-40 overflow-y-auto space-y-2 border rounded p-3">
                            {textChunks.map((chunk, index) => (
                              <div key={chunk.id} className="flex items-start gap-2">
                                <Checkbox
                                  checked={selectedChunks.has(chunk.id)}
                                  onCheckedChange={() => handleChunkToggle(chunk.id)}
                                />
                                <div className="text-xs">
                                  <div className="font-medium">Chunk {index + 1}</div>
                                  <div className="text-gray-500 truncate max-w-[200px]">
                                    {chunk.content.substring(0, 50)}...
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Rewrite Progress */}
                  {isRewriting && (
                    <div className="space-y-2">
                      <Label className="text-sm">Rewriting Progress</Label>
                      <Progress value={rewriteProgress} />
                    </div>
                  )}
                  
                  {/* Rewrite Button */}
                  <Button
                    onClick={handleEnhancedRewrite}
                    disabled={isRewriting || !customInstructions.trim()}
                    className="w-full"
                  >
                    {isRewriting ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Rewriting...
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Rewrite with {selectedProvider}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Panel - Rewrite Preview and Actions */}
            <div className="space-y-4 overflow-y-auto">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Rewritten Content
                    {currentRewrite && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    {currentRewrite ? (
                      <MathRenderer content={currentRewrite} />
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium mb-2">No rewrite yet</p>
                        <p className="text-sm">Configure your settings and click "Rewrite" to see results here</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Debug: Content length: {currentRewrite ? currentRewrite.length : 0} characters
                  </div>
                </CardContent>
              </Card>
              
              {/* Action Buttons */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Export & Share</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={handlePrintToPDF}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print/PDF
                    </Button>
                    
                    <Button variant="outline" onClick={handleDownloadWord}>
                      <FileText className="h-4 w-4 mr-2" />
                      Word
                    </Button>
                    
                    <Button variant="outline" onClick={() => setIsEmailDialogOpen(true)} className="col-span-2">
                      <Mail className="h-4 w-4 mr-2" />
                      Send via Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Hidden download link */}
          <a ref={downloadLinkRef} style={{ display: 'none' }} />
        </DialogContent>
      </Dialog>
      
      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send via Email</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={isEmailSending}>
                {isEmailSending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedRewriteModal;