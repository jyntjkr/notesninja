import PDFParser from 'pdf2json';

interface PDFText {
  R: Array<{ T: string }>;
}

interface PDFPage {
  Texts: PDFText[];
}

interface PDFData {
  Pages: PDFPage[];
}

/**
 * Parses a PDF file from a URL with size limits and timeout handling
 * @param fileUrl - The URL of the PDF file
 * @returns The text content of the PDF
 */
export async function parsePdfFromUrl(fileUrl: string): Promise<string> {
  try {
    // Fetch the PDF file with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch(fileUrl, { 
      signal: controller.signal 
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    // Convert to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Check file size and limit if necessary
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_SIZE) {
      console.warn(`PDF file is large (${buffer.length} bytes), this may cause performance issues`);
    }
    
    // Parse PDF using pdf2json with timeout protection
    const pdfParser = new PDFParser();
    
    const pdfText = await new Promise<string>((resolve, reject) => {
      // Add parser timeout
      const parserTimeout = setTimeout(() => {
        reject(new Error('PDF parsing timed out'));
      }, 120000); // 2 minute timeout for parsing
      
      pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
        clearTimeout(parserTimeout);
        
        try {
          // Process the PDF data with a page limit for very large documents
          const MAX_PAGES = 50;
          const pagesToProcess = pdfData.Pages.slice(0, MAX_PAGES);
          
          if (pdfData.Pages.length > MAX_PAGES) {
            console.warn(`PDF has ${pdfData.Pages.length} pages, but only processing ${MAX_PAGES} to avoid timeout`);
          }
          
          const text = decodeURIComponent(
            pagesToProcess.map((page: PDFPage) => 
              page.Texts.map((text: PDFText) => 
                text.R.map((r) => r.T).join(' ')
              ).join(' ')
            ).join('\n')
          );
          resolve(text);
        } catch (err) {
          reject(err);
        }
      });
      
      pdfParser.on('pdfParser_dataError', (error) => {
        clearTimeout(parserTimeout);
        reject(error);
      });
      
      try {
        pdfParser.parseBuffer(buffer);
      } catch (error) {
        clearTimeout(parserTimeout);
        reject(error);
      }
    });
    
    return pdfText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 