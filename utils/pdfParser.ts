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
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    // Convert to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse PDF using pdf2json
    const pdfParser = new PDFParser();
    
    const pdfText = await new Promise<string>((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
        const text = decodeURIComponent(
          pdfData.Pages.map((page: PDFPage) => 
            page.Texts.map((text: PDFText) => 
              text.R.map((r) => r.T).join(' ')
            ).join(' ')
          ).join('\n')
        );
        resolve(text);
      });
      
      pdfParser.on('pdfParser_dataError', (error) => {
        reject(error);
      });
      
      pdfParser.parseBuffer(buffer);
    });
    
    return pdfText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
} 