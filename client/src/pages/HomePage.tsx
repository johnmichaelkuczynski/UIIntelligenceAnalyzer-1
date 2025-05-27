import React, { useState, useEffect } from "react";
import ModeToggle from "@/components/ModeToggle";
import DocumentInput from "@/components/DocumentInput";
import DocumentResults from "@/components/DocumentResults";
import ComparativeResults from "@/components/ComparativeResults";
import AIDetectionModal from "@/components/AIDetectionModal";
import ProviderSelector, { LLMProvider } from "@/components/ProviderSelector";
import UnifiedRewriteSection from "@/components/UnifiedRewriteSection";
import ImmediateRewriteDialog from "@/components/ImmediateRewriteDialog";

import { Button } from "@/components/ui/button";
import { Brain, Trash2, FileEdit } from "lucide-react";
import { analyzeDocument, compareDocuments, checkForAI } from "@/lib/analysis";
import { AnalysisMode, DocumentInput as DocumentInputType, AIDetectionResult, DocumentAnalysis, DocumentComparison } from "@/lib/types";

const HomePage: React.FC = () => {
  // State for analysis mode
  const [mode, setMode] = useState<AnalysisMode>("single");

  // State for document inputs
  const [documentA, setDocumentA] = useState<DocumentInputType>({ content: "" });
  const [documentB, setDocumentB] = useState<DocumentInputType>({ content: "" });

  // State for analysis results
  const [analysisA, setAnalysisA] = useState<DocumentAnalysis | null>(null);
  const [analysisB, setAnalysisB] = useState<DocumentAnalysis | null>(null);
  const [comparison, setComparison] = useState<DocumentComparison | null>(null);

  // State for rewrite results
  const [rewrittenText, setRewrittenText] = useState<string>("");
  const [rewriteStats, setRewriteStats] = useState<any>(null);

  // State for loading indicators
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isAICheckLoading, setIsAICheckLoading] = useState(false);

  // State for showing results section
  const [showResults, setShowResults] = useState(false);

  // State for AI detection
  const [aiDetectionModalOpen, setAIDetectionModalOpen] = useState(false);
  const [currentAICheckDocument, setCurrentAICheckDocument] = useState<"A" | "B">("A");
  const [aiDetectionResult, setAIDetectionResult] = useState<AIDetectionResult | undefined>(undefined);

  // State for immediate rewrite dialog
  const [showRewriteDialog, setShowRewriteDialog] = useState(false);
  
  // State for LLM provider
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("openai");
  const [apiStatus, setApiStatus] = useState<{
    openai: boolean;
    anthropic: boolean;
    perplexity: boolean;
  }>({
    openai: false,
    anthropic: false,
    perplexity: false
  });
  
  // Check API status when component mounts
  useEffect(() => {
    async function checkApiStatus() {
      try {
        const response = await fetch("/api/check-api");
        const data = await response.json();
        
        if (data.api_keys) {
          setApiStatus({
            openai: data.api_keys.openai === "configured",
            anthropic: data.api_keys.anthropic === "configured",
            perplexity: data.api_keys.perplexity === "configured"
          });
          
          console.log("API Status:", data.api_keys);
        }
      } catch (error) {
        console.error("Error checking API status:", error);
      }
    }
    
    checkApiStatus();
  }, []);

  // Handler for checking if a document is AI-generated
  const handleCheckAI = async (documentId: "A" | "B") => {
    const document = documentId === "A" ? documentA : documentB;
    
    if (!document.content.trim()) {
      alert("Please enter some text before checking for AI.");
      return;
    }

    setCurrentAICheckDocument(documentId);
    setAIDetectionModalOpen(true);
    setIsAICheckLoading(true);
    setAIDetectionResult(undefined);

    try {
      const result = await checkForAI(document);
      setAIDetectionResult(result);
      
      // Update the document analysis with AI detection results if it exists
      if (documentId === "A" && analysisA) {
        setAnalysisA({
          ...analysisA,
          aiDetection: result
        });
      } else if (documentId === "B" && analysisB) {
        setAnalysisB({
          ...analysisB,
          aiDetection: result
        });
      }
    } catch (error) {
      console.error("Error checking for AI:", error);
    } finally {
      setIsAICheckLoading(false);
    }
  };

  // Handler for analyzing documents
  const handleAnalyze = async () => {
    if (!documentA.content.trim()) {
      alert("Please enter some text in Document A.");
      return;
    }

    if (mode === "compare" && !documentB.content.trim()) {
      alert("Please enter some text in Document B for comparison.");
      return;
    }
    
    // Check if the selected provider is available
    if (!apiStatus[selectedProvider]) {
      alert(`The ${selectedProvider} API key is not configured or is invalid. Please select a different provider or ensure the API key is properly set.`);
      return;
    }

    setShowResults(true);
    setIsAnalysisLoading(true);
    
    try {
      if (mode === "single") {
        // Use the selected provider for analysis
        console.log(`Analyzing with ${selectedProvider}...`);
        const result = await analyzeDocument(documentA, selectedProvider);
        setAnalysisA(result);
        setAnalysisB(null);
        setComparison(null);
      } else {
        // Use the selected provider for comparison
        console.log(`Comparing with ${selectedProvider}...`);
        const results = await compareDocuments(documentA, documentB, selectedProvider);
        setAnalysisA(results.analysisA);
        setAnalysisB(results.analysisB);
        setComparison(results.comparison);
      }
    } catch (error) {
      console.error("Error analyzing documents:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Analysis with ${selectedProvider} failed: ${errorMessage}\n\nPlease verify that the ${selectedProvider} API key is correctly configured.`);
    } finally {
      setIsAnalysisLoading(false);
    }
  };
  
  // Handler for rewrite completion
  const handleRewriteComplete = (text: string, stats: any) => {
    setRewrittenText(text);
    setRewriteStats(stats);
  };
  
  // Handler for resetting the entire analysis
  const handleReset = () => {
    // Clear document inputs
    setDocumentA({ content: "" });
    setDocumentB({ content: "" });
    
    // Clear analysis results
    setAnalysisA(null);
    setAnalysisB(null);
    setComparison(null);
    
    // Clear rewrite results
    setRewrittenText("");
    setRewriteStats(null);
    
    // Reset UI states
    setShowResults(false);
    setIsAnalysisLoading(false);
    setIsAICheckLoading(false);
    setAIDetectionResult(undefined);
    
    // Reset to single mode
    setMode("single");
    
    // Scroll to top
    window.scrollTo(0, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Intelligence Analysis Tool</h1>
        <p className="text-gray-600">Analyze, compare, and enhance writing samples with AI-powered intelligence evaluation</p>
      </header>

      {/* Analysis Mode Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Analysis Settings</h2>
        <div className="flex flex-wrap gap-8 items-center">
          <ModeToggle mode={mode} setMode={setMode} />
          <div className="border p-4 rounded-lg bg-white shadow-sm mt-2 md:mt-0">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Choose Your AI Provider</h3>
            <ProviderSelector 
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              label="AI Provider"
              apiStatus={apiStatus}
              className="mb-3"
            />
            
            {/* API Status Indicators */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Provider Status:</h4>
              <div className="flex flex-wrap gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${apiStatus.openai ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span className={`h-2 w-2 rounded-full mr-1.5 ${apiStatus.openai ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  OpenAI: {apiStatus.openai ? 'Active' : 'Inactive'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${apiStatus.anthropic ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span className={`h-2 w-2 rounded-full mr-1.5 ${apiStatus.anthropic ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Anthropic: {apiStatus.anthropic ? 'Active' : 'Inactive'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${apiStatus.perplexity ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span className={`h-2 w-2 rounded-full mr-1.5 ${apiStatus.perplexity ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Perplexity: {apiStatus.perplexity ? 'Active' : 'Inactive'}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">All API providers are active and ready to use. Each offers different analysis capabilities.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Input Section */}
      <div className="mb-8">
        {/* Document A */}
        <DocumentInput
          id="A"
          document={documentA}
          setDocument={setDocumentA}
          onCheckAI={() => handleCheckAI("A")}
        />

        {/* Document B (shown only in compare mode) */}
        {mode === "compare" && (
          <DocumentInput
            id="B"
            document={documentB}
            setDocument={setDocumentB}
            onCheckAI={() => handleCheckAI("B")}
          />
        )}

        {/* Analysis Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleAnalyze}
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 flex items-center"
            disabled={isAnalysisLoading}
          >
            <Brain className="h-5 w-5 mr-2" />
            <span>
              {mode === "single" ? "Analyze Document" : "Analyze Both Documents"}
            </span>
          </Button>
          
          <Button
            onClick={() => setShowRewriteDialog(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 flex items-center"
            disabled={!documentA.content.trim() || isAnalysisLoading}
          >
            <FileEdit className="h-5 w-5 mr-2" />
            <span>Rewrite</span>
          </Button>
          
          <Button
            onClick={handleReset}
            className="px-6 py-3 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 flex items-center"
            disabled={isAnalysisLoading}
          >
            <Trash2 className="h-5 w-5 mr-2" />
            <span>Reset Everything</span>
          </Button>
        </div>
      </div>

      {/* AI Detection Modal */}
      <AIDetectionModal
        isOpen={aiDetectionModalOpen}
        onClose={() => setAIDetectionModalOpen(false)}
        result={aiDetectionResult}
        isLoading={isAICheckLoading}
      />

      {/* Results Section */}
      {showResults && (
        <div id="resultsSection">
          {/* Loading Indicator */}
          {isAnalysisLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Analyzing document content...</p>
            </div>
          ) : (
            <div>
              {/* Document A Results */}
              {analysisA && <DocumentResults id="A" analysis={analysisA} originalDocument={documentA} />}

              {/* Document B Results (only in compare mode) */}
              {mode === "compare" && analysisB && (
                <DocumentResults id="B" analysis={analysisB} originalDocument={documentB} />
              )}

              {/* Comparative Results (only in compare mode) */}
              {mode === "compare" && comparison && analysisA && analysisB && (
                <ComparativeResults
                  analysisA={analysisA}
                  analysisB={analysisB}
                  comparison={comparison}
                />
              )}
              
              {/* Integrated Enhanced Rewrite Section - only shown for single document analysis */}
              {analysisA && mode === "single" && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8 mt-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Enhance Document with Web Search & AI Rewrite</h2>
                  <p className="text-gray-600 mb-6">Use AI to rewrite your document with custom instructions and web search integration</p>
                  
                  <UnifiedRewriteSection
                    originalDocument={documentA}
                    onRewriteComplete={handleRewriteComplete}
                  />
                  
                  {/* Rewrite results are now displayed inside the UnifiedRewriteSection component */}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Immediate Rewrite Dialog */}
      <ImmediateRewriteDialog
        isOpen={showRewriteDialog}
        onClose={() => setShowRewriteDialog(false)}
        document={documentA}
        selectedProvider={selectedProvider}
      />
    </div>
  );
};

export default HomePage;