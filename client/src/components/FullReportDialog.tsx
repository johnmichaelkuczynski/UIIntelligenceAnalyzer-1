import React from 'react';
import { DocumentAnalysis } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FullReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: DocumentAnalysis;
}

const FullReportDialog: React.FC<FullReportDialogProps> = ({
  open,
  onOpenChange,
  analysis
}) => {
  const { toast } = useToast();

  // Handle copying to clipboard
  const handleCopy = () => {
    // Create a well-formatted report text
    const reportText = `
INTELLIGENCE ANALYSIS REPORT
===========================
Overall Intelligence Score: ${analysis.overallScore}/100

${analysis.analysis || analysis.overallAssessment || ''}
`;

    navigator.clipboard.writeText(reportText);
    toast({
      title: 'Copied to clipboard',
      description: 'Full report copied to clipboard successfully'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-blue-600" />
            <span>Full Intelligence Analysis Report</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {/* Overall Score Section */}
          <div className="rounded-md border p-4 bg-blue-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-blue-900">Overall Intelligence Score</h3>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-blue-800">{analysis.overallScore}</span>
                <span className="text-sm text-blue-600">/100</span>
              </div>
            </div>
            <p className="text-blue-900">{analysis.overallAssessment}</p>
          </div>
          
          {/* Full Analysis Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2">Complete Analysis</h3>
            
            {/* Intelligence Report */}
            {analysis.analysis && (
              <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border">
                {analysis.analysis}
              </div>
            )}
            
            {/* Detailed Metrics */}
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-gray-800 border-b pb-2">Detailed Metrics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Surface Metrics */}
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Grammar</h4>
                  <p className="text-sm">Based on analysis of language correctness</p>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Structure</h4>
                  <p className="text-sm">Organization and flow of document</p>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Jargon Usage</h4>
                  <p className="text-sm">Appropriate technical language</p>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Surface Fluency</h4>
                  <p className="text-sm">Readability and expression</p>
                </div>
                
                {/* Deep Metrics */}
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Conceptual Depth</h4>
                  <p className="text-sm">Sophistication of ideas presented</p>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Inferential Continuity</h4>
                  <p className="text-sm">Logical flow between concepts</p>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Claim Necessity</h4>
                  <p className="text-sm">How well claims are justified</p>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Semantic Compression</h4>
                  <p className="text-sm">Information density in language</p>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Logical Scaffolding</h4>
                  <p className="text-sm">Structural foundation of arguments</p>
                </div>
                <div className="bg-white p-4 rounded-md border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Originality</h4>
                  <p className="text-sm">Novel thinking and insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Report</span>
            </Button>
          </div>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FullReportDialog;