import pdfParse from 'pdf-parse';

interface PDFParseResult {
  text: string;
  numpages: number;
  info: {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  };
  metadata: any;
  version: string;
}

interface PDFParserOptions {
  maxPages?: number;
  timeout?: number;
}

/**
 * Parses a PDF file from a URL with timeout and error handling
 * @param fileUrl The URL of the PDF file
 * @param timeoutMs Timeout in milliseconds
 * @param options Additional parsing options
 * @returns The extracted text or empty string on failure
 */
export async function parsePdfFromUrl(
  fileUrl: string,
  timeoutMs: number = 30000,
  options?: PDFParserOptions
): Promise<string> {
  // Create a controller for the fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log(`[PDF Parser] Fetching PDF from ${fileUrl}`);
    const response = await fetch(fileUrl, { 
      signal: controller.signal,
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    // Get PDF as ArrayBuffer
    const pdfBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(pdfBuffer);
    
    console.log(`[PDF Parser] PDF fetched successfully, size: ${buffer.length} bytes`);
    
    // Configure PDF parse options
    const parseOptions: any = {
      // Set dataDir to null to prevent looking for test files
      dataDir: null
    };
    
    // Limit to specific page range if maxPages is specified
    if (options?.maxPages) {
      parseOptions.max = options.maxPages;
      console.log(`[PDF Parser] Limiting parsing to first ${options.maxPages} pages`);
    }
    
    // Add custom timeout for parsing
    const parseTimeout = options?.timeout || Math.max(timeoutMs - 5000, 10000);
    console.log(`[PDF Parser] Using parse timeout of ${parseTimeout}ms`);
    
    // Create parsing timeout
    const parsePromise = pdfParse(buffer, parseOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF parsing timed out')), parseTimeout);
    });
    
    // Race parsing against timeout
    const result = await Promise.race([parsePromise, timeoutPromise]) as PDFParseResult;
    clearTimeout(timeoutId);
    
    if (!result || !result.text) {
      console.log('[PDF Parser] No text extracted from PDF');
      return '';
    }
    
    console.log(`[PDF Parser] Successfully extracted ${result.text.length} characters from ${result.numpages} pages`);
    return result.text;
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PDF Parser] Error parsing PDF: ${errorMessage}`);
    
    return '';
  }
} 