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
        // PDF support has been temporarily removed
        return {
          content: "PDF support is currently unavailable. Please upload a text or Word document instead, or paste your text directly.",
          filename: file.originalname,
          mimeType: file.mimetype
        };
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
