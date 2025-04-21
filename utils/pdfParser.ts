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
 * Parses a PDF file from a URL
 * @param fileUrl - The URL of the PDF file
 * @returns The text content of the PDF
 */
export async function parsePdfFromUrl(fileUrl: string): Promise<string> {
  try {
    // Fetch the PDF file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText} (${response.status})`);
    }
    
    // Convert to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse PDF using pdf2json
    const pdfParser = new PDFParser();
    
    const pdfText = await new Promise<string>((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
        try {
          if (!pdfData || !pdfData.Pages || !Array.isArray(pdfData.Pages)) {
            reject(new Error('Invalid PDF data structure'));
            return;
          }
          
          const text = decodeURIComponent(
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
          resolve(text);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          reject(new Error(`Error processing PDF data: ${errorMessage}`));
        }
      });
      
      pdfParser.on('pdfParser_dataError', (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });
      
      try {
        pdfParser.parseBuffer(buffer);
      } catch (error: unknown) {
        reject(new Error(`Error parsing PDF buffer: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
    
    return pdfText || '';
  } catch (error: unknown) {
    console.error('Error parsing PDF:', error);
    // Return an empty string instead of throwing to make the function more robust
    return '';
  }
} 