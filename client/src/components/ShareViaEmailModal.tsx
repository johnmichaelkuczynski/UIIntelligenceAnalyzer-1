import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareViaEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportContent: string;
  subjectPrefix?: string;
}

const ShareViaEmailModal: React.FC<ShareViaEmailModalProps> = ({
  isOpen,
  onClose,
  reportContent,
  subjectPrefix = "Cognitive Profile Analysis"
}) => {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [subject, setSubject] = useState(`${subjectPrefix}`);
  const [isSending, setIsSending] = useState(false);
  
  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a recipient email address.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await fetch("/api/share-simple-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          senderEmail: senderEmail.trim() || undefined,
          senderName: senderName.trim() || undefined,
          subject: subject.trim() || "Cognitive Profile Analysis",
          content: reportContent
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Email sent",
          description: "The cognitive profile has been sent successfully."
        });
        onClose();
      } else {
        throw new Error(result.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send email",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Share Cognitive Profile via Email
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipientEmail">Recipient Email <span className="text-red-500">*</span></Label>
              <Input
                id="recipientEmail"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="senderEmail">Your Email (optional)</Label>
              <Input
                id="senderEmail"
                placeholder="you@example.com"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="senderName">Your Name (optional)</Label>
            <Input
              id="senderName"
              placeholder="Your Name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="preview">Content Preview</Label>
            <Textarea
              id="preview"
              className="h-32 font-mono text-sm"
              value={reportContent.substring(0, 200) + (reportContent.length > 200 ? '...' : '')}
              readOnly
            />
            <p className="text-sm text-gray-500 mt-1">
              The complete cognitive profile will be sent in the email.
            </p>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSendEmail}
            disabled={isSending}
            className="ml-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareViaEmailModal;