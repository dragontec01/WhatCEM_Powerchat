import * as fs from 'fs/promises';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let pdfParse: any;
let mammoth: any;
let pdfjsDist: any;

try {
  pdfParse = require('pdf-parse');
} catch (error) {
}

try {
  mammoth = require('mammoth');
} catch (error) {
}

try {
  pdfjsDist = require('pdfjs-dist');
} catch (error) {
}

/**
 * Enhanced document processor with alternative libraries
 * Supports multiple document formats with graceful fallbacks
 */
export class TextDocumentProcessor {
  
  /**
   * Extract text from various file formats
   */
  static async extractText(filePath: string, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'text/plain':
        return this.extractTextFromPlainText(filePath);

      case 'application/pdf':
        return this.extractTextFromPDF(filePath);

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractTextFromDocx(filePath);

      case 'application/msword':
        return this.extractTextFromDoc(filePath);

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  private static async extractTextFromPlainText(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      return content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

    } catch (error) {
      throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF files using pdf-parse
   */
  private static async extractTextFromPDF(filePath: string): Promise<string> {
    if (!pdfParse) {
      throw new Error('PDF processing not available. Please install pdf-parse: npm install pdf-parse');
    }

    try {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);

      return data.text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from .docx files using mammoth
   */
  private static async extractTextFromDocx(filePath: string): Promise<string> {
    if (!mammoth) {
      if (pdfjsDist) {
        return this.extractTextWithPdfJs(filePath);
      }
      throw new Error('Word document processing not available. Please install mammoth: npm install mammoth');
    }

    try {
      const result = await mammoth.extractRawText({ path: filePath });

      return result.value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

    } catch (error) {
      if (pdfjsDist) {
        console.warn('mammoth failed, falling back to pdfjs-dist');
        return this.extractTextWithPdfJs(filePath);
      }
      throw new Error(`Failed to extract text from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from .doc files using mammoth (legacy support)
   */
  private static async extractTextFromDoc(filePath: string): Promise<string> {
    if (!mammoth) {
      throw new Error('Legacy Word document processing not available. Please install mammoth: npm install mammoth');
    }

    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      throw new Error(`Failed to extract text from legacy Word document: ${error instanceof Error ? error.message : 'Unknown error'}. Consider converting to .docx format.`);
    }
  }

  /**
   * Extract text using PDF.js (advanced PDF processing)
   */
  private static async extractTextWithPdfJs(filePath: string): Promise<string> {
    if (!pdfjsDist) {
      throw new Error('Advanced PDF processing not available. Please install pdfjs-dist: npm install pdfjs-dist');
    }

    try {
      const buffer = await fs.readFile(filePath);
      const data = new Uint8Array(buffer);

      const loadingTask = pdfjsDist.getDocument({ data });
      const pdf = await loadingTask.promise;

      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        fullText += pageText + '\n\n';
      }

      return fullText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

    } catch (error) {
      throw new Error(`PDF.js extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate file before processing
   */
  static async validateFile(filePath: string, mimeType: string, maxSize: number = 50 * 1024 * 1024): Promise<void> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.size > maxSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize} bytes)`);
      }

      await fs.access(filePath, fs.constants.R_OK);

      const supportedTypes = this.getSupportedMimeTypes();

      if (!supportedTypes.includes(mimeType)) {
        const availableProcessors = this.getAvailableProcessors();
        let errorMessage = `Unsupported file type: ${mimeType}. `;

        if (mimeType === 'application/pdf' && !availableProcessors.pdf && !availableProcessors.pdfAdvanced) {
          errorMessage += 'Install pdf-parse or pdfjs-dist for PDF support: npm install pdf-parse pdfjs-dist';
        } else if (mimeType.includes('word') && !availableProcessors.docx) {
          errorMessage += 'Install mammoth for Word document support: npm install mammoth';
        } else {
          errorMessage += `Supported types: ${supportedTypes.join(', ')}`;
        }

        throw new Error(errorMessage);
      }
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('File validation failed');
    }
  }

  /**
   * Get file information
   */
  static async getFileInfo(filePath: string): Promise<{
    size: number;
    created: Date;
    modified: Date;
    isReadable: boolean;
  }> {
    try {
      const stats = await fs.stat(filePath);
      
      let isReadable = true;
      try {
        await fs.access(filePath, fs.constants.R_OK);
      } catch {
        isReadable = false;
      }
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isReadable
      };
      
    } catch (error) {
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  }

  /**
   * Check which document processors are available
   */
  static getAvailableProcessors(): {
    pdf: boolean;
    pdfAdvanced: boolean;
    docx: boolean;
    doc: boolean;
  } {
    return {
      pdf: !!pdfParse,
      pdfAdvanced: !!pdfjsDist,
      docx: !!mammoth,
      doc: !!mammoth
    };
  }

  /**
   * Get supported file types based on available processors
   */
  static getSupportedMimeTypes(): string[] {
    const supported = [
      'text/plain',
      'text/txt',
      'application/octet-stream'
    ];

    if (pdfParse || pdfjsDist) {
      supported.push('application/pdf');
    }

    if (mammoth) {
      supported.push('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      supported.push('application/msword');
    }

    return supported;
  }

  /**
   * Estimate processing time based on file size and type
   */
  static estimateProcessingTime(fileSize: number, mimeType: string): number {
    let baseTime = 100;

    switch (mimeType) {
      case 'text/plain':
        baseTime = 50;
        break;
      case 'application/pdf':
        baseTime = 500;
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        baseTime = 300;
        break;
    }

    const sizeMultiplier = Math.max(1, fileSize / (1024 * 1024));

    return Math.round(baseTime * sizeMultiplier);
  }
}

export default TextDocumentProcessor;
