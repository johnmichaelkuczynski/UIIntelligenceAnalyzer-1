import React, { useState } from 'react';

export function MinimalProfiler() {
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
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/api/extract-text', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.content) {
        setText(data.content);
      } else {
        console.error('No content in response');
      }
    })
    .catch(error => {
      console.error('Error uploading file:', error);
    });
  };
  
  return (
    <div className="max-w-screen-lg mx-auto p-4">
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 ${activeTab === 'analyze' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          Single Text Analysis
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'compare' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          Text Comparison
        </button>
      </div>
      
      {activeTab === 'analyze' ? (
        <div>
          <div className="border rounded-lg p-4 mb-6">
            <div className="mb-4">
              <input 
                type="file" 
                accept=".txt,.docx,.pdf" 
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            
            <div className="mb-4">
              <textarea
                className="w-full h-64 p-2 border rounded-md"
                placeholder="Paste text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              ></textarea>
            </div>
            
            <div className="flex justify-between items-center">
              <select 
                className="p-2 border rounded-md"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
              
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
                onClick={analyzeText}
                disabled={isAnalyzing || !text.trim()}
              >
                {isAnalyzing ? "Processing..." : "Analyze Text"}
              </button>
            </div>
          </div>
          
          {result && (
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">Cognitive Profile</h2>
              <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                {result}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <textarea
                className="w-full h-64 p-2 border rounded-md"
                placeholder="Paste first text here..."
                value={textA}
                onChange={(e) => setTextA(e.target.value)}
              ></textarea>
              
              <textarea
                className="w-full h-64 p-2 border rounded-md"
                placeholder="Paste second text here..."
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
              ></textarea>
            </div>
            
            <div className="flex justify-between items-center">
              <select 
                className="p-2 border rounded-md"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
              
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
                onClick={compareTexts}
                disabled={isComparing || !textA.trim() || !textB.trim()}
              >
                {isComparing ? "Processing..." : "Compare Texts"}
              </button>
            </div>
          </div>
          
          {comparisonResult && (
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">Comparison Results</h2>
              <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                {comparisonResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}