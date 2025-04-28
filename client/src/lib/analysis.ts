import { apiRequest } from "./queryClient";
import { DocumentInput, AIDetectionResult, DocumentAnalysis, DocumentComparison } from "./types";

// Function to analyze a single document
export async function analyzeDocument(
  document: DocumentInput
): Promise<DocumentAnalysis> {
  try {
    const response = await apiRequest("POST", "/api/analyze", document);
    return await response.json();
  } catch (error) {
    console.error("Error analyzing document:", error);
    throw error;
  }
}

// Function to compare two documents
export async function compareDocuments(
  documentA: DocumentInput,
  documentB: DocumentInput
): Promise<{
  analysisA: DocumentAnalysis;
  analysisB: DocumentAnalysis;
  comparison: DocumentComparison;
}> {
  try {
    const response = await apiRequest("POST", "/api/compare", {
      documentA,
      documentB,
    });
    return await response.json();
  } catch (error) {
    console.error("Error comparing documents:", error);
    throw error;
  }
}

// Function to check if a document is AI-generated using GPTZero
export async function checkForAI(
  document: DocumentInput
): Promise<AIDetectionResult> {
  try {
    const response = await apiRequest("POST", "/api/check-ai", document);
    return await response.json();
  } catch (error) {
    console.error("Error checking for AI:", error);
    throw error;
  }
}

// Function to extract text from uploaded file
export async function extractTextFromFile(
  file: File
): Promise<DocumentInput> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/extract-text", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error extracting text: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw error;
  }
}

// Helper function to determine rating color class based on calibrated scoring
export function getRatingColorClass(rating: string): string {
  switch (rating) {
    case "Exceptional":
      return "bg-purple-100 text-purple-900"; // Blueprint-grade (95-98)
    case "Very Strong":
      return "bg-indigo-100 text-indigo-900"; // Blueprint-grade (90-94)
    case "Strong":
      return "bg-blue-100 text-blue-800"; // Advanced critique (85-89)
    case "Moderate":
      return "bg-teal-100 text-teal-800"; // Advanced critique (80-84)
    case "Basic":
      return "bg-green-100 text-green-800"; // Surface polish (70-79)
    case "Weak":
      return "bg-amber-100 text-amber-800"; // Surface polish (60-69)
    case "Very Weak":
      return "bg-orange-100 text-orange-800"; // Fluent but shallow (40-59)
    case "Critically Deficient":
      return "bg-red-100 text-red-800"; // Random noise (0-39)
    default:
      return "bg-gray-100 text-gray-800";
  }
}
