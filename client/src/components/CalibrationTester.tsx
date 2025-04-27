import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Beaker } from "lucide-react";

interface CalibrationResult {
  sample: string;
  actualScore: number;
  expectedScore: number;
  difference: number;
  evaluation: any;
}

const CalibrationTester: React.FC = () => {
  const [results, setResults] = useState<CalibrationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCalibration = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-calibration');
      
      if (!response.ok) {
        throw new Error(`Calibration test failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to run calibration tests');
      console.error('Calibration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Calibration Tester</h2>
        <Button 
          onClick={runCalibration} 
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Beaker className="mr-2 h-4 w-4" />
          Run Calibration Tests
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <span className="ml-3">Running calibration tests...</span>
        </div>
      )}
      
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Calibration Results</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={index} className={Math.abs(result.difference) > 10 ? "bg-red-50" : Math.abs(result.difference) < 5 ? "bg-green-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.sample}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.expectedScore}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.actualScore}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${result.difference > 0 ? 'text-red-500' : result.difference < 0 ? 'text-blue-500' : 'text-gray-500'}`}>
                      {result.difference > 0 ? `+${result.difference}` : result.difference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4">
            <h4 className="text-md font-medium text-gray-800 mb-2">Calibration Summary</h4>
            <p className="text-sm text-gray-600">
              Average Difference: {
                Math.round(results.reduce((sum, r) => sum + Math.abs(r.difference), 0) / results.length * 10) / 10
              } points
            </p>
            <p className="text-sm text-gray-600">
              Maximum Deviation: {
                Math.max(...results.map(r => Math.abs(r.difference)))
              } points
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationTester;