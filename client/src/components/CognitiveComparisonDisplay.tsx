import React from 'react';

interface CognitiveComparisonDisplayProps {
  comparisonText: string;
  provider: string;
}

const CognitiveComparisonDisplay: React.FC<CognitiveComparisonDisplayProps> = ({
  comparisonText,
  provider
}) => {
  return (
    <div className="mt-6 mb-10">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Cognitive Profile Comparison</h2>
          <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {provider}
          </div>
        </div>
        
        <div className="prose prose-lg max-w-none whitespace-pre-wrap font-serif">
          {comparisonText}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            This comparison treats both texts as forensic evidence, not as content to be graded.
            The AI is evaluating the cognitive patterns revealed in the writing, not the correctness or quality of the content.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CognitiveComparisonDisplay;