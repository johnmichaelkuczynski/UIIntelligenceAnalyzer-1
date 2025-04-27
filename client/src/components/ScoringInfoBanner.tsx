import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ScoringInfoBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="absolute top-2 right-2 text-gray-500 h-6 w-6 p-0"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="flex items-start">
        <Info className="h-5 w-5 text-blue-500 mt-1 mr-3 flex-shrink-0" />
        
        <div className="text-sm text-blue-800">
          <h3 className="font-semibold mb-1">About the Intelligence Scoring System</h3>
          <p className="mb-2">
            Our scoring algorithm evaluates writing samples on a scale from 0-100 based on:
          </p>
          
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li><span className="font-medium">Surface Analysis (35%)</span>: Grammar, structure, jargon usage, and readability</li>
            <li><span className="font-medium">Semantic Analysis (65%)</span>: Conceptual depth, logical continuity, and semantic density</li>
          </ul>
          
          <p className="text-xs text-blue-600 italic">
            Calibrated using sample texts: AI-generated content scores 35-45, while exceptional philosophical analyses score 90+
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScoringInfoBanner;