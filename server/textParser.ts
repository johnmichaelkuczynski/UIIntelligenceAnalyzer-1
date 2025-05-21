import fs from 'fs';
import { Readable } from 'stream';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';

export interface DocumentInput {
  content: string;
  filename?: string;
  mimeType?: string;
}

/**
 * Extract text from file with proper encoding
 */
export async function parseFileToText(file: Express.Multer.File): Promise<DocumentInput> {
  try {
    // Handle file based on mimetype
    if (file.mimetype === 'application/pdf') {
      return await extractFromPdf(file);
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await extractFromDocx(file);
    } else {
      // Default to text file
      return {
        content: file.buffer.toString('utf8'), // Using utf8 encoding
        filename: file.originalname,
        mimeType: file.mimetype
      };
    }
  } catch (err) {
    console.error('Error parsing file:', err);
    throw new Error('Failed to extract text from file');
  }
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractFromPdf(file: Express.Multer.File): Promise<DocumentInput> {
  try {
    const data = await pdfParse(file.buffer);
    
    return {
      content: data.text,
      filename: file.originalname,
      mimeType: file.mimetype,
      metadata: {
        pageCount: data.numpages,
        info: data.info
      }
    };
  } catch (err) {
    console.error('PDF parsing error:', err);
    throw new Error('Failed to parse PDF');
  }
}

/**
 * Extract text from DOCX using mammoth
 */
async function extractFromDocx(file: Express.Multer.File): Promise<DocumentInput> {
  try {
    const result = await mammoth.extractRawText({ 
      buffer: file.buffer 
    });
    
    return {
      content: result.value,
      filename: file.originalname,
      mimeType: file.mimetype
    };
  } catch (err) {
    console.error('DOCX parsing error:', err);
    throw new Error('Failed to parse DOCX');
  }
}