import React from 'react';
import { DocumentAnalysis } from '@/lib/types';
import { Tab, Tabs, TabList, TabPanel } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

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
    <div className="mt-10 mb-10">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Cognitive Profile Comparison</h2>
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="raw_comparison">
            <TabList className="mb-6">
              <Tab value="raw_comparison">Full Cognitive Profile</Tab>
              <Tab value="scores">Intelligence Scores</Tab>
            </TabList>
            
            <TabPanel value="raw_comparison" className="pt-2">
              <div className="prose max-w-none whitespace-pre-wrap font-serif">
                {comparison.comparisonResult}
              </div>
            </TabPanel>
            
            <TabPanel value="scores" className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-blue-800 mb-3">Document A</h3>
                  <div className="flex items-center mb-2">
                    <div className="text-5xl font-bold text-blue-700 mr-2">{analysisA.overallScore}</div>
                    <div className="text-gray-600">/100</div>
                  </div>
                  <p className="text-gray-700">
                    {analysisA.provider} cognitive evaluation
                  </p>
                </div>
                
                <div className="bg-pink-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-pink-800 mb-3">Document B</h3>
                  <div className="flex items-center mb-2">
                    <div className="text-5xl font-bold text-pink-700 mr-2">{analysisB.overallScore}</div>
                    <div className="text-gray-600">/100</div>
                  </div>
                  <p className="text-gray-700">
                    {analysisB.provider} cognitive evaluation
                  </p>
                </div>
              </div>
              
              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Automated Comparison</h3>
                <p className="text-gray-700">
                  This comparison evaluates the cognitive patterns revealed in both documents, not the surface-level writing quality. 
                  A score of 50 represents ordinary college-level reasoning, while 100 represents exceptionally brilliant thinking.
                </p>
              </div>
            </TabPanel>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComparativeResults;