import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parsePdfFromUrl } from '@/utils/pdfParser';
import { generateTest, TestConfig } from '@/utils/geminiAi';

// Maximum time to allow for PDF parsing in serverless environment (20 seconds)
const PDF_PARSE_TIMEOUT = 20000;

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { materialId, testConfig } = body;

    if (!materialId || !testConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the material from the database
    const material = await prisma.upload.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Get content - either use cached parsed content or parse on demand
    let pdfContent;
    
    if (material.parsedContent && material.parsedContent.trim() !== '') {
      console.log('Using previously parsed content from database');
      pdfContent = material.parsedContent;
    } else {
      console.log('No valid parsed content found, parsing PDF now');
      try {
        pdfContent = await parsePdfFromUrl(material.fileUrl, PDF_PARSE_TIMEOUT);
        
        // Only save if we got actual content
        if (pdfContent && pdfContent.trim() !== '') {
          console.log('PDF parsed successfully, content length:', pdfContent.length);
          
          // Save the parsed content for future use
          try {
            await prisma.upload.update({
              where: { id: materialId },
              data: { parsedContent: pdfContent }
            });
            console.log('Updated material with parsed content');
          } catch (error) {
            console.error('Error saving parsed content:', error);
            // Continue with test generation even if update fails
          }
        } else {
          console.error('PDF parsing returned empty content');
          return NextResponse.json({ 
            error: 'Could not extract content from the PDF file. Please try again or use a different file.' 
          }, { status: 400 });
        }
      } catch (error) {
        console.error('Error parsing PDF:', error);
        return NextResponse.json({ 
          error: 'Failed to parse the PDF file. The file may be corrupted or in an unsupported format.' 
        }, { status: 400 });
      }
    }

    if (!pdfContent || pdfContent.trim() === '') {
      return NextResponse.json({ 
        error: 'No content available from this material. Please try again with a different file.' 
      }, { status: 400 });
    }

    try {
      // Generate the test
      console.log('Generating test with content length:', pdfContent.length);
      const generatedTest = await generateTest(pdfContent, testConfig as TestConfig);

      // Return the generated test
      return NextResponse.json({ 
        success: true, 
        data: {
          test: generatedTest,
          material: {
            title: material.title,
            fileUrl: material.fileUrl,
          }
        } 
      });
    } catch (genError) {
      console.error('Error generating test:', genError);
      return NextResponse.json({ 
        error: 'Failed to generate test. The AI service may be temporarily unavailable or the content may not be suitable.' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in test generation process:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'An error occurred while generating the test', message: errorMessage }, 
      { status: 500 }
    );
  }
} 