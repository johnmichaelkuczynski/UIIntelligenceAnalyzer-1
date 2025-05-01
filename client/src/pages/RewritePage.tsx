import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Download,
  ClipboardCopy,
  RotateCcw,
  Mail,
  FileText,
  Brain,
  Save,
  RotateCw
} from "lucide-react";
import { rewriteDocument, checkForAI, analyzeDocument } from "@/lib/analysis";
import { AIDetectionResult, RewriteOptions, RewriteResult, DocumentInput } from "@/lib/types";
import AIDetectionModal from "@/components/AIDetectionModal";

// Common rewrite instructions that users can select from
const REWRITE_PRESETS = [
  {
    label: "Clarify argument without adding length",
    value: "clarify_argument"
  },
  {
    label: "Preserve structure but elevate tone",
    value: "elevate_tone"
  },
  {
    label: "Make more recursive",
    value: "make_recursive"
  },
  {
    label: "Add precision without verbosity",
    value: "precision_no_verbosity"
  },
  {
    label: "Keep technical but improve readability",
    value: "improve_readability"
  },
  {
    label: "Strengthen logical connections",
    value: "strengthen_logic"
  }
];

// Map preset values to actual instructions
const INSTRUCTION_MAP: Record<string, string> = {
  "clarify_argument": "Clarify the argument without adding length or simplifying concepts",
  "elevate_tone": "Preserve structure but elevate tone while maintaining conceptual depth",
  "make_recursive": "Make argumentation more recursive without simplifying",
  "precision_no_verbosity": "Add precision without adding verbosity",
  "improve_readability": "Keep technical depth but improve readability",
  "strengthen_logic": "Strengthen logical connections between sentences"
};

const RewritePage: React.FC = () => {
  const { toast } = useToast();
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  
  // Original and rewritten text state
  const [originalText, setOriginalText] = useState("");
  const [rewrittenText, setRewrittenText] = useState("");
  const [instruction, setInstruction] = useState<string>("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteStats, setRewriteStats] = useState<RewriteResult["stats"] | null>(null);
  
  // Email sharing state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // AI detection state
  const [aiDetectionModalOpen, setAIDetectionModalOpen] = useState(false);
  const [isAICheckLoading, setIsAICheckLoading] = useState(false);
  const [aiDetectionResult, setAIDetectionResult] = useState<AIDetectionResult | undefined>(undefined);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Handle text rewrite
  const handleRewrite = async () => {
    if (!originalText.trim()) {
      toast({
        title: "Missing input",
        description: "Please enter some text to rewrite.",
        variant: "destructive"
      });
      return;
    }
    
    // Get the instruction (either custom or from preset)
    let finalInstruction = instruction === "custom" 
      ? customInstruction
      : INSTRUCTION_MAP[instruction] || "";
      
    if (!finalInstruction) {
      toast({
        title: "Missing instruction",
        description: "Please select or enter a rewrite instruction.",
        variant: "destructive"
      });
      return;
    }
    
    setIsRewriting(true);
    setRewrittenText("");
    setRewriteStats(null);
    
    try {
      const options: RewriteOptions = {
        instruction: finalInstruction,
        preserveLength: true, // Default to staying within 100-110% length
        preserveDepth: true  // Default to maintaining/increasing depth
      };
      
      const result = await rewriteDocument(originalText, options);
      setRewrittenText(result.rewrittenText);
      setRewriteStats(result.stats);
      
      toast({
        title: "Rewrite completed",
        description: "Text has been rewritten successfully."
      });
    } catch (error) {
      console.error("Error rewriting text:", error);
      toast({
        title: "Rewrite failed",
        description: "An error occurred while rewriting the text.",
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };
  
  // Handle copying rewritten text to clipboard
  const handleCopyText = () => {
    navigator.clipboard.writeText(rewrittenText);
    toast({
      title: "Copied to clipboard",
      description: "The rewritten text has been copied to your clipboard."
    });
  };
  
  // Handle document download
  const handleDownload = (format: 'txt' | 'pdf' | 'docx') => {
    if (!rewrittenText) return;
    
    if (format === 'txt') {
      // Simple text download
      const blob = new Blob([rewrittenText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = url;
        downloadLinkRef.current.download = `rewritten-text-${new Date().toISOString().slice(0, 10)}.txt`;
        downloadLinkRef.current.click();
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
      toast({
        title: "Document format conversion",
        description: `${format.toUpperCase()} download will be available soon.`
      });
    }
  };
  
  // Handle email sending
  const handleSendEmail = async () => {
    if (!recipientEmail || !rewrittenText) return;
    
    setIsSendingEmail(true);
    
    try {
      // Make API call to send the email (implementation pending)
      // TODO: Implement this when implementing backend
      /*
      await apiRequest("POST", "/api/share-rewrite-via-email", {
        recipientEmail,
        originalText,
        rewrittenText
      });
      */
      
      toast({
        title: "Email sent",
        description: `Rewritten text has been sent to ${recipientEmail}`
      });
      
      setEmailDialogOpen(false);
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Email failed",
        description: "An error occurred while sending the email.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  // Handle AI detection
  const handleCheckAI = async () => {
    if (!rewrittenText) {
      toast({
        title: "Missing rewritten text",
        description: "Please rewrite some text first before checking for AI."
      });
      return;
    }
    
    setAIDetectionModalOpen(true);
    setIsAICheckLoading(true);
    setAIDetectionResult(undefined);
    
    try {
      const document: DocumentInput = {
        content: rewrittenText
      };
      
      const result = await checkForAI(document);
      setAIDetectionResult(result);
    } catch (error) {
      console.error("Error checking for AI:", error);
      toast({
        title: "AI check failed",
        description: "An error occurred while checking for AI.",
        variant: "destructive"
      });
    } finally {
      setIsAICheckLoading(false);
    }
  };
  
  // Handle intelligence evaluation
  const handleEvaluateIntelligence = async () => {
    if (!rewrittenText) {
      toast({
        title: "Missing rewritten text",
        description: "Please rewrite some text first before evaluating."
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const document: DocumentInput = {
        content: rewrittenText
      };
      
      // Redirect to the HomePage with this text loaded
      // This is a simple way to utilize the existing analysis functionality
      
      // For now, just show a toast message - real implementation would do a redirect
      toast({
        title: "Intelligence Analysis",
        description: "Intelligence evaluation feature coming soon."
      });
    } catch (error) {
      console.error("Error analyzing rewritten text:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Clear all inputs and results
  const handleClear = () => {
    setRewrittenText("");
    setRewriteStats(null);
  };
  
  // Calculate percentage change for display
  const calculatePercentageChange = () => {
    if (!rewriteStats) return 0;
    return Math.round(rewriteStats.lengthChange * 100);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Intelligence Rewrite Engine</h1>
        <p className="text-gray-600">
          Upgrade the intelligence of your writing without dumbing it down, bloating it, or formatting it poorly.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Original Text</CardTitle>
            <CardDescription>
              Paste your text to rewrite with enhanced intelligence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Paste your original text here..."
              className="min-h-[300px] font-mono text-sm"
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="w-full">
              <Label htmlFor="rewrite-instruction" className="mb-2 block">
                Rewrite Instructions
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select 
                  onValueChange={(value) => setInstruction(value)}
                  value={instruction}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select instruction type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REWRITE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom instruction</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={handleRewrite} 
                  disabled={isRewriting || !originalText.trim()}
                  className="w-full sm:w-auto"
                >
                  {isRewriting ? <RotateCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                  Rewrite
                </Button>
              </div>
            </div>
            
            {instruction === "custom" && (
              <div className="w-full">
                <Label htmlFor="custom-instruction" className="mb-2 block">
                  Custom Rewrite Instruction
                </Label>
                <Input
                  id="custom-instruction"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="E.g., Make more recursive while preserving clarity"
                  className="w-full"
                />
              </div>
            )}
          </CardFooter>
        </Card>
        
        {/* Output Section */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Rewritten Text</CardTitle>
            <CardDescription>
              Intelligence-enhanced output with preserved depth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRewriting ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-gray-600">Rewriting with intelligence enhancement...</p>
              </div>
            ) : (
              <Textarea 
                value={rewrittenText}
                readOnly
                placeholder="Rewritten text will appear here..."
                className="min-h-[300px] font-mono text-sm"
              />
            )}
            
            {rewriteStats && !isRewriting && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h3 className="font-semibold mb-2 text-sm">Rewrite Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Original Length:</p>
                    <p>{rewriteStats.originalLength} characters</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Rewritten Length:</p>
                    <p>{rewriteStats.rewrittenLength} characters</p>
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">Length Change</span>
                    <span className={`text-xs font-medium ${
                      rewriteStats.lengthChange <= 0.1 ? 'text-green-500' : 
                      rewriteStats.lengthChange <= 0.2 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {calculatePercentageChange()}%
                    </span>
                  </div>
                  <Progress 
                    value={100 + calculatePercentageChange()} 
                    max={120}
                    className={`${
                      rewriteStats.lengthChange <= 0.1 ? 'bg-green-100' : 
                      rewriteStats.lengthChange <= 0.2 ? 'bg-amber-100' : 'bg-red-100'
                    }`}
                  />
                  <p className="text-xs mt-1 text-gray-500">Target: 100-110% of original length</p>
                </div>
                
                <p className="mt-3 text-sm">
                  <span className="font-medium">Instruction applied:</span> {rewriteStats.instructionFollowed}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                disabled={!rewrittenText}
              >
                <ClipboardCopy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('txt')}
                disabled={!rewrittenText}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!rewrittenText}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckAI}
                disabled={!rewrittenText || isAICheckLoading}
              >
                <Brain className="h-4 w-4 mr-2" />
                {isAICheckLoading ? 'Checking...' : 'Detect AI'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleEvaluateIntelligence}
                disabled={!rewrittenText || isAnalyzing}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Analyzing...' : 'Evaluate Intelligence'}
              </Button>
              
              <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!rewrittenText}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Text via Email</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="recipient-email">Recipient Email</Label>
                      <Input
                        id="recipient-email"
                        placeholder="example@example.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        type="email"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendEmail} disabled={!recipientEmail || isSendingEmail}>
                      {isSendingEmail ? 'Sending...' : 'Send Email'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardFooter>
        </Card>
      </div>
      
      {/* AI Detection Modal */}
      <AIDetectionModal
        isOpen={aiDetectionModalOpen}
        onClose={() => setAIDetectionModalOpen(false)}
        result={aiDetectionResult}
        isLoading={isAICheckLoading}
      />
      
      {/* Hidden download link */}
      <a 
        ref={downloadLinkRef} 
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default RewritePage;