import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentAnalysis, DocumentComparison } from '@/lib/types';
import { FileDown, Loader2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { generatePDFReport, generateWordReport, downloadFile } from '@/lib/reportGenerator';
import { useToast } from '@/hooks/use-toast';
import { Packer } from 'docx';

interface ReportDownloadButtonProps {
  analysisA: DocumentAnalysis;
  analysisB?: DocumentAnalysis;
  comparison?: DocumentComparison;
  mode: 'single' | 'compare';
  doughnutARef?: React.RefObject<HTMLDivElement>;
  doughnutBRef?: React.RefObject<HTMLDivElement>;
  barChartRef?: React.RefObject<HTMLDivElement>;
  radarChartRef?: React.RefObject<HTMLDivElement>;
}

const ReportDownloadButton: React.FC<ReportDownloadButtonProps> = ({
  analysisA,
  analysisB,
  comparison,
  mode,
  doughnutARef,
  doughnutBRef,
  barChartRef,
  radarChartRef
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const timestamp = new Date().toISOString().slice(0, 10);
  
  const handleDownload = async (format: 'pdf' | 'docx') => {
    setIsGenerating(true);
    
    try {
      if (format === 'pdf') {
        // Generate PDF
        const doc = await generatePDFReport(
          analysisA,
          analysisB,
          comparison,
          {
            doughnutA: doughnutARef,
            doughnutB: doughnutBRef,
            barChart: barChartRef,
            radarChart: radarChartRef
          }
        );
        
        // Save PDF
        const pdfBlob = doc.output('blob');
        const filename = `intelligence-analysis-${mode}-${timestamp}.pdf`;
        downloadFile(pdfBlob, filename);
        
        toast({
          title: "Report Downloaded",
          description: "Your PDF report has been downloaded successfully.",
        });
      } 
      else if (format === 'docx') {
        // Generate Word document
        const doc = await generateWordReport(
          analysisA,
          analysisB,
          comparison
        );
        
        // Save Word document
        const buffer = await Packer.toBlob(doc);
        const filename = `intelligence-analysis-${mode}-${timestamp}.docx`;
        downloadFile(buffer, filename);
        
        toast({
          title: "Report Downloaded",
          description: "Your Word document has been downloaded successfully.",
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Download Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4 mr-2" />
              Download Report
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('docx')}>
          Word Document
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ReportDownloadButton;