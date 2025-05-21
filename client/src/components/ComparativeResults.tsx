import React from 'react';
import { DocumentAnalysis } from '@/lib/types';
import CognitiveComparisonDisplay from './CognitiveComparisonDisplay';

interface ComparativeResultsProps {
  analysisA: DocumentAnalysis;
  analysisB: DocumentAnalysis;
  comparison: any; // Raw comparison result from API
}

const ComparativeResults: React.FC<ComparativeResultsProps> = ({
  analysisA,
  analysisB,
  comparison
}) => {
  return (
    <CognitiveComparisonDisplay
      comparisonText={comparison.comparisonResult}
      provider={comparison.provider}
    />
  );
};

export default ComparativeResults;