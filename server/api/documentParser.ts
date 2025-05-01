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
  let tempFilePath = '';
  try {
    console.log(`Starting PDF extraction for file: ${file.originalname}, size: ${file.size} bytes`);
    
    // Make sure we have pdf-parse package
    let pdfParse;
    try {
      pdfParse = await import('pdf-parse');
      console.log("Successfully imported pdf-parse module");
    } catch (importError) {
      console.error("Failed to import pdf-parse:", importError);
      throw new Error("PDF parsing module not available");
    }
    
    // Save buffer to temporary file
    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
    fs.writeFileSync(tempFilePath, file.buffer);
    console.log(`Saved temporary file to: ${tempFilePath}`);
    
    // Read file from disk
    const dataBuffer = fs.readFileSync(tempFilePath);
    console.log(`Read ${dataBuffer.length} bytes from temporary file`);
    
    // Parse PDF
    console.log("Starting PDF parsing...");
    const data = await pdfParse.default(dataBuffer);
    console.log(`Successfully parsed PDF, extracted ${data.text.length} characters of text`);
    
    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("Deleted temporary file");
    }
    
    // Validate that we actually got text content
    if (!data.text || data.text.trim().length === 0) {
      console.warn("PDF parsed successfully but no text was extracted");
      return {
        content: "The PDF was processed but no text could be extracted. The PDF may be scanned or image-based. Please try another file or paste the text directly.",
        filename: file.originalname,
        mimeType: file.mimetype
      };
    }
    
    console.log("PDF extraction completed successfully");
    return {
      content: data.text,
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
