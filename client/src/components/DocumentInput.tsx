import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileInput } from "@/components/ui/file-input";
import { X, Upload, Bot } from "lucide-react";
import { extractTextFromFile } from "@/lib/analysis";
import { DocumentInput as DocumentInputType } from "@/lib/types";

interface DocumentInputProps {
  id: "A" | "B";
  document: DocumentInputType;
  setDocument: (document: DocumentInputType) => void;
  onCheckAI: () => void;
}

const DocumentInput: React.FC<DocumentInputProps> = ({
  id,
  document,
  setDocument,
  onCheckAI,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocument({ ...document, content: e.target.value });
  };

  const handleClearText = () => {
    setDocument({ content: "" });
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      const result = await extractTextFromFile(file);
      setDocument(result);
    } catch (error) {
      console.error("Error extracting text from file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Document {id}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearText}
            className="px-3 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center"
          >
            <X className="h-4 w-4 mr-1" /> Clear Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCheckAI}
            className="px-3 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center"
          >
            <Bot className="h-4 w-4 mr-1" /> Check for AI
          </Button>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-4 mb-4 ${
          isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center py-8">
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Drag and drop your document here</p>
          <p className="text-gray-500 text-sm mb-4">Supports .docx, .pdf, and .txt files</p>
          <div className="flex justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700"
            >
              Browse Files
            </Button>
            <FileInput
              ref={fileInputRef}
              id={`fileInput${id}`}
              accept=".docx,.pdf,.txt"
              onFileSelected={handleFileUpload}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <Textarea
          id={`textInput${id}`}
          placeholder="Type or paste your text here..."
          className="w-full h-40 p-4 border border-gray-300 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
          value={document.content}
          onChange={handleTextChange}
        />
      )}
    </div>
  );
};

export default DocumentInput;
