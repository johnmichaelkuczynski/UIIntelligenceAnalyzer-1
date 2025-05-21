import React, { useState } from 'react';

export function SimpleCognitiveProfiler() {
  const [text, setText] = useState('');
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [provider, setProvider] = useState('openai');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState('');
  const [comparisonResult, setComparisonResult] = useState('');
  const [activeTab, setActiveTab] = useState('analyze');
  
  const analyzeText = async () => {
    if (!text.trim()) return;
    
    setIsAnalyzing(true);
    setResult('');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, provider })
      });
      
      const data = await response.json();
      setResult(data.formattedReport || 'Analysis failed');
    } catch (error) {
      console.error('Error:', error);
      setResult('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const compareTexts = async () => {
    if (!textA.trim() || !textB.trim()) return;
    
    setIsComparing(true);
    setComparisonResult('');
    
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentA: textA, documentB: textB, provider })
      });
      
      const data = await response.json();
      setComparisonResult(data.comparisonResult || 'Comparison failed');
    } catch (error) {
      console.error('Error:', error);
      setComparisonResult('Comparison failed');
    } finally {
      setIsComparing(false);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-2">Cognitive Profiler</h1>
      <p className="text-center text-gray-600 mb-6">
        Analyze the intelligence and thinking style revealed in any text
      </p>
      
      <div className="mb-6 flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === 'analyze' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          Single Text Analysis
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'compare' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          Text Comparison
        </button>
      </div>
      
      {activeTab === 'analyze' ? (
        <div className="space-y-6">
          <div className="p-6 border rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-4">Analyze Text</h2>
            <p className="mb-4 text-gray-600">Upload or paste text to analyze</p>
            
            <div className="mb-4">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden"
                accept=".txt,.docx,.pdf" 
                onChange={handleFileUpload}
              />
              <label 
                htmlFor="file-upload" 
                className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50"
              >
                <div className="mb-2">📄</div>
                <div className="text-sm font-medium">Drop file here or click to upload</div>
                <div className="text-xs text-gray-500 mt-1">Supports TXT, DOCX, PDF</div>
              </label>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Or paste text</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[200px]"
                placeholder="Enter or paste text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <label className="mr-2 text-sm">AI Model:</label>
                <select 
                  className="border rounded-md p-2"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>
              
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                onClick={analyzeText}
                disabled={isAnalyzing || !text.trim()}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Text"}
              </button>
            </div>
          </div>
          
          {result && (
            <div className="p-6 border rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Cognitive Profile</h2>
              <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                {result}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-6 border rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-4">Compare Texts</h2>
            <p className="mb-4 text-gray-600">Compare cognitive profiles of two texts</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Text A</label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[200px]"
                  placeholder="Enter first text here..."
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Text B</label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[200px]"
                  placeholder="Enter second text here..."
                  value={textB}
                  onChange={(e) => setTextB(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <label className="mr-2 text-sm">AI Model:</label>
                <select 
                  className="border rounded-md p-2"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>
              
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                onClick={compareTexts}
                disabled={isComparing || !textA.trim() || !textB.trim()}
              >
                {isComparing ? "Comparing..." : "Compare Texts"}
              </button>
            </div>
          </div>
          
          {comparisonResult && (
            <div className="p-6 border rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Cognitive Comparison</h2>
              <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                {comparisonResult}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Removed the About section as requested */}
    </div>
  );
}