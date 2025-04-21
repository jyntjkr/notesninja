import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
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

    // Check if parsed content exists and is valid
    if (!material.parsedContent || material.parsedContent.trim() === '') {
      console.log('No parsed content available for material ID:', materialId);
      return NextResponse.json({ 
        error: 'This material has not been parsed yet. Please wait a moment and try again as parsing may still be in progress, or select a different material.',
        code: 'CONTENT_NOT_PARSED'
      }, { status: 400 });
    }

    console.log('Using parsed content from database, length:', material.parsedContent.length);
    
    try {
      // Generate the test using the existing parsed content
      console.log('Generating test with content length:', material.parsedContent.length);
      const generatedTest = await generateTest(material.parsedContent, testConfig as TestConfig);

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