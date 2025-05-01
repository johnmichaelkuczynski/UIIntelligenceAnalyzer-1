import { DocumentInput } from "@/lib/types";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Extract text from a file based on its type
 */
export async function extractTextFromFile(
  file: Express.Multer.File
): Promise<DocumentInput> {
  try {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    switch (fileExtension) {
      case '.txt':
        return extractTextFromTxt(file);
      case '.docx':
        return extractTextFromDocx(file);
      case '.pdf':
        return extractTextFromPdf(file);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw error;
  }
}

/**
 * Extract text from a TXT file
 */
async function extractTextFromTxt(file: Express.Multer.File): Promise<DocumentInput> {
  return {
    content: file.buffer.toString('utf-8'),
    filename: file.originalname,
    mimeType: file.mimetype
  };
}

/**
 * Extract text from a DOCX file using mammoth.js
 */
async function extractTextFromDocx(file: Express.Multer.File): Promise<DocumentInput> {
  try {
    // Save buffer to temporary file
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
    fs.writeFileSync(tempFilePath, file.buffer);
    
    // Use dynamic import for mammoth (not a direct dependency)
    const mammoth = await import('mammoth');
    
    const result = await mammoth.extractRawText({
      path: tempFilePath
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    return {
      content: result.value,
      filename: file.originalname,
      mimeType: file.mimetype
    };
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    // Fallback to basic text extraction
    return {
      content: "Error extracting text from DOCX file. Please try another format or paste the text directly.",
      filename: file.originalname,
      mimeType: file.mimetype
    };
  }
}

/**
 * Extract text from a PDF file using pdfjs-dist
 */
async function extractTextFromPdf(file: Express.Multer.File): Promise<DocumentInput> {
  let tempFilePath = '';
  try {
    console.log(`Starting PDF extraction for file: ${file.originalname}, size: ${file.size} bytes`);
    
    // Import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
    console.log("Successfully imported pdfjs-dist module");
    
    // Set up the worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    console.log("Using CDN for PDF.js worker");

    // Parse the PDF directly from the buffer
    const loadingTask = pdfjsLib.getDocument({ data: file.buffer });
    console.log("PDF loading task created");
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    // Extract text from all pages
    let textContent = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i} of ${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      textContent += strings.join(' ') + '\n';
    }
    
    console.log(`Extracted ${textContent.length} characters of text`);
    
    // Check if we got any meaningful text
    if (!textContent || textContent.trim().length === 0) {
      console.warn("PDF parsed successfully but no text was extracted");
      return {
        content: "The PDF was processed but no text could be extracted. The PDF may be scanned or image-based. Please try another file or paste the text directly.",
        filename: file.originalname,
        mimeType: file.mimetype
      };
    }
    
    console.log("PDF extraction completed successfully");
    return {
      content: textContent,
      filename: file.originalname,
      mimeType: file.mimetype
    };
  } catch (error: any) {
    console.error("Error extracting text from PDF:", error);
    
    // Clean up temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log("Cleaned up temporary file after error");
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
    }
    
    // Fallback to basic text extraction with more helpful error message
    return {
      content: `Error extracting text from the PDF file: ${error.message || 'Unknown error'}. This may be due to the PDF being encrypted, damaged, or containing only images. Please try another file or paste the text directly.`,
      filename: file.originalname,
      mimeType: file.mimetype
    };
  }
}
