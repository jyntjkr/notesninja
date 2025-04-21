import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parsePdfFromUrl } from '@/utils/pdfParser';
import { generateTest, TestConfig } from '@/utils/geminiAi';

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

    // Parse the PDF content
    const pdfContent = await parsePdfFromUrl(material.fileUrl);

    // Generate the test
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
    
  } catch (error) {
    console.error('Error generating test:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating the test' }, 
      { status: 500 }
    );
  }
} 