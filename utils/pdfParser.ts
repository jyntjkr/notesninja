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
 * Parses a PDF file from a URL with a timeout
 * @param fileUrl - The URL of the PDF file
 * @param timeoutMs - Timeout in milliseconds (default: 25000)
 * @returns The text content of the PDF
 */
export async function parsePdfFromUrl(fileUrl: string, timeoutMs: number = 25000): Promise<string> {
  // Create a timeout promise
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('PDF parsing timed out')), timeoutMs);
  });
  
  try {
    // Race between parsing and timeout
    return await Promise.race([
      parseWithoutTimeout(fileUrl),
      timeoutPromise
    ]);
  } catch (error: unknown) {
    console.error('Error parsing PDF:', error instanceof Error ? error.message : String(error));
    // Return an empty string instead of throwing to make the function more robust
    return '';
  }
}

/**
 * Internal function to parse PDF without timeout
 */
async function parseWithoutTimeout(fileUrl: string): Promise<string> {
  try {
    // Fetch the PDF file
    const response = await fetch(fileUrl, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/pdf'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText} (${response.status})`);
    }
    
    // Convert to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse PDF using pdf2json
    const pdfParser = new PDFParser(null, false); // Reduced verbosity
    
    const pdfText = await new Promise<string>((resolve, reject) => {
      // Set a 20 second timeout on the parser itself
      const parserTimeout = setTimeout(() => {
        reject(new Error('PDF parser internal timeout'));
      }, 20000);
      
      pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
        clearTimeout(parserTimeout);
        try {
          if (!pdfData || !pdfData.Pages || !Array.isArray(pdfData.Pages)) {
            resolve(''); // Just return empty string on invalid structure
            return;
          }
          
          // Simplified extraction to reduce chance of errors
          let text = '';
          try {
            text = decodeURIComponent(
              pdfData.Pages.map((page: PDFPage) => 
                Array.isArray(page.Texts) ? 
                  page.Texts.map((text: PDFText) => 
                    Array.isArray(text.R) ? 
                      text.R.map((r) => r.T || '').join(' ') 
                      : ''
                  ).join(' ')
                  : ''
              ).join('\n')
            );
          } catch (decodeError: unknown) {
            // If decoding fails, try a simpler approach
            text = pdfData.Pages.map(page => 
              Array.isArray(page.Texts) ? 
                page.Texts.map(t => 
                  Array.isArray(t.R) ? 
                    t.R.map(r => String(r.T || '')).join(' ')
                    : ''
                ).join(' ')
                : ''
            ).join('\n');
          }
          
          resolve(text);
        } catch (error: unknown) {
          clearTimeout(parserTimeout);
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Error processing PDF data: ${errorMessage}`);
          resolve(''); // Return empty string on error
        }
      });
      
      pdfParser.on('pdfParser_dataError', (error: unknown) => {
        clearTimeout(parserTimeout);
        console.warn('PDF parser error:', error instanceof Error ? error.message : String(error));
        resolve(''); // Return empty string instead of rejecting
      });
      
      try {
        pdfParser.parseBuffer(buffer);
      } catch (error: unknown) {
        clearTimeout(parserTimeout);
        console.warn(`Error parsing PDF buffer: ${error instanceof Error ? error.message : String(error)}`);
        resolve(''); // Return empty string instead of rejecting
      }
    });
    
    return pdfText || '';
  } catch (error: unknown) {
    console.warn('Error in PDF parsing process:', error instanceof Error ? error.message : String(error));
    return '';
  }
} 