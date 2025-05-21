import React from 'react';

const RawComparison = ({ comparisonResult }: { comparisonResult: string }) => {
  return (
    <div className="mt-10 px-6 mb-10">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Cognitive Intelligence Profile Comparison</h2>
      <div className="bg-white p-6 rounded-lg shadow overflow-auto">
        <div className="prose max-w-none whitespace-pre-wrap font-serif">
          {comparisonResult}
        </div>
      </div>
    </div>
  );
};

export default RawComparison;