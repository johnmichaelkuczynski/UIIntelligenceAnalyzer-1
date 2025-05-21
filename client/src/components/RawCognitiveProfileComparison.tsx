import React, { useState } from 'react';
import { DocumentAnalysis } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import ShareViaEmailModal from './ShareViaEmailModal';
import ReportDownloadButton from './ReportDownloadButton';

interface RawCognitiveProfileComparisonProps {
  analysisA: DocumentAnalysis;
  analysisB: DocumentAnalysis;
  comparison: any; // Raw comparison result from the API
}

const RawCognitiveProfileComparison: React.FC<RawCognitiveProfileComparisonProps> = ({
  analysisA,
  analysisB,
  comparison,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Cognitive Profile Comparison</h2>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="h-4 w-4" />
            Share via Email
          </Button>
          <ReportDownloadButton
            analysisA={analysisA}
            analysisB={analysisB}
            comparison={comparison}
            mode="compare"
          />
        </div>
      </div>
      
      {/* Direct rendering of the raw cognitive profile comparison */}
      <div className="mb-6">
        <div className="w-full overflow-auto border border-gray-200 rounded-md p-4 bg-white font-serif text-sm whitespace-pre-wrap">
          {comparison.comparisonResult}
        </div>
      </div>
      
      {/* Share via Email Modal */}
      <ShareViaEmailModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        analysisA={analysisA}
        analysisB={analysisB}
        comparison={comparison}
      />
    </div>
  );
};

export default RawCognitiveProfileComparison;