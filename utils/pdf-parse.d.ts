declare module 'pdf-parse/lib/pdf-parse.js' {
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

  function pdfParse(
    buffer: Buffer,
    options?: {
      max?: number;
      pagerender?: Function;
      version?: string;
    }
  ): Promise<PDFParseResult>;

  export default pdfParse;
} 