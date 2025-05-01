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
 * Extract text from a PDF file using a simpler approach with Buffer direct analysis
 */
async function extractTextFromPdf(file: Express.Multer.File): Promise<DocumentInput> {
  let tempFilePath = '';
  try {
    console.log(`Starting PDF extraction for file: ${file.originalname}, size: ${file.size} bytes`);
    
    // Save buffer to temporary file
    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
    fs.writeFileSync(tempFilePath, file.buffer);
    console.log(`Saved temporary file to: ${tempFilePath}`);
    
    // Use child process to extract text using pdftotext (if available)
    let extractedText = '';
    
    try {
      // First try a simple text search in the PDF buffer
      // Look for text patterns in the PDF buffer
      const bufferText = file.buffer.toString('utf-8', 0, Math.min(file.buffer.length, 10000));
      
      // Extract plain text content that might be directly embedded
      const textMatches = bufferText.match(/\(([^)]+)\)/g) || [];
      const possibleText = textMatches
        .map(match => match.slice(1, -1))
        .filter(text => text.length > 3 && /[a-zA-Z]/.test(text))
        .join(' ');
        
      if (possibleText && possibleText.length > 100) {
        console.log(`Extracted ${possibleText.length} characters using direct buffer analysis`);
        extractedText = possibleText;
      } else {
        // Simple heuristic: If the PDF contains BT/ET markers, it has text
        const hasTextMarkers = bufferText.includes('BT') && bufferText.includes('ET');
        
        if (!hasTextMarkers) {
          console.warn("No text markers found in PDF, may be image-only");
          extractedText = "This PDF appears to contain images but no extractable text. Please try another file or paste the text directly.";
        } else {
          // Try to extract readable text segments
          const readableSegments = bufferText
            .split(/[\r\n]/)
            .filter(line => {
              // Keep lines that are mostly printable ASCII characters
              const printableChars = line.replace(/[^\x20-\x7E]/g, '');
              return printableChars.length > 10 && printableChars.length / line.length > 0.7;
            })
            .join(' ');
            
          if (readableSegments.length > 100) {
            console.log(`Extracted ${readableSegments.length} characters as readable segments`);
            extractedText = readableSegments;
          } else {
            extractedText = "Unable to extract meaningful text from this PDF. It may be encrypted, damaged, or contain only images. Please try another file or paste the text directly.";
          }
        }
      }
    } catch (extractError: any) {
      console.error("Error during text extraction:", extractError);
      extractedText = "Error extracting text from PDF. The file may be corrupted or in an unsupported format.";
    }
    
    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("Deleted temporary file");
    }
    
    console.log("PDF extraction completed");
    return {
      content: extractedText,
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
      content: `Could not extract text from this PDF file. Please try uploading a different format (like .docx or .txt) or paste the text directly.`,
      filename: file.originalname,
      mimeType: file.mimetype
    };
  }
}
