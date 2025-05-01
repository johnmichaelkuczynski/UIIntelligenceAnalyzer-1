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
 * Extract text from a PDF file using pdf-parse
 */
async function extractTextFromPdf(file: Express.Multer.File): Promise<DocumentInput> {
  try {
    console.log(`Starting PDF extraction for file: ${file.originalname}, size: ${file.size} bytes`);
    
    // Import the pdf-parse library
    const pdfParse = await import('pdf-parse');
    console.log("Successfully imported pdf-parse module");
    
    // Process the PDF using the buffer directly
    const result = await pdfParse.default(file.buffer);
    console.log(`Extracted ${result.text.length} characters from PDF with ${result.numpages} pages`);
    
    // Check if we got any meaningful text
    if (!result.text || result.text.trim().length === 0) {
      console.warn("PDF parsed but no text extracted");
      return {
        content: "The PDF was processed but no text could be extracted. The PDF may be scanned or image-based. Please try another file or paste the text directly.",
        filename: file.originalname,
        mimeType: file.mimetype
      };
    }
    
    // Enhance readability of the extracted text
    const cleanedText = result.text
      .replace(/\s+/g, ' ')     // Replace multiple spaces with one
      .replace(/(\. )/g, '.\n') // Add line breaks after periods for readability
      .trim();
    
    console.log(`PDF extraction completed successfully (${cleanedText.length} chars)`);
    return {
      content: cleanedText,
      filename: file.originalname,
      mimeType: file.mimetype
    };
  } catch (error: any) {
    console.error("Error extracting text from PDF:", error);
    
    // Provide a helpful error message
    return {
      content: `Error extracting text from the PDF file: ${error.message || 'Unknown error'}. This may be due to the PDF being encrypted, damaged, or containing only images. Please try another file or paste the text directly.`,
      filename: file.originalname,
      mimeType: file.mimetype
    };
  }
}
