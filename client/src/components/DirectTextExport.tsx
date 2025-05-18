import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { DocumentAnalysis } from "@/lib/types";

interface DirectTextExportProps {
  analysis: DocumentAnalysis;
  originalText: string;
}

const DirectTextExport: React.FC<DirectTextExportProps> = ({ analysis, originalText }) => {
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const exportToTxt = () => {
    // Direct export of the analysis exactly as provided by the API
    const content = `
INTELLIGENCE ANALYSIS REPORT
============================
Overall Intelligence Score: ${analysis.overallScore}/100

${analysis.summary || ''}

Analyzed Text:
${originalText}
`;

    // Create a blob with the raw text content
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    if (downloadLinkRef.current) {
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.download = `intelligence-analysis-${new Date().toISOString().slice(0, 10)}.txt`;
      downloadLinkRef.current.click();
    }
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <>
      <a ref={downloadLinkRef} style={{ display: 'none' }}></a>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportToTxt}
        className="flex gap-1 items-center"
      >
        <Download className="h-4 w-4" />
        Export as TXT
      </Button>
    </>
  );
};

export default DirectTextExport;