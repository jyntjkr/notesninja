import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parsePdfFromUrl } from '@/utils/pdfParser';

// Longer timeout for background parsing process
const PDF_PARSE_TIMEOUT = 60000; // 60 seconds

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { uploadId } = body;

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
    }

    // Get the upload record
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Check if this file belongs to the user
    if (upload.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to upload' }, { status: 403 });
    }

    // Check if the file is a PDF
    if (upload.fileType !== 'application/pdf' && !upload.fileUrl.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Not a PDF file' }, { status: 400 });
    }

    // Update status to PROCESSING
    await prisma.upload.update({
      where: { id: uploadId },
      data: { parseStatus: 'PROCESSING' },
    });

    try {
      // Parse PDF with extended timeout
      console.log('Starting PDF parsing for:', upload.fileUrl);
      const parsedContent = await parsePdfFromUrl(upload.fileUrl, PDF_PARSE_TIMEOUT);
      
      // Limit parsed content size to prevent database issues
      const maxContentLength = 1000000; // 1MB limit
      const truncatedContent = parsedContent && parsedContent.length > maxContentLength 
        ? parsedContent.substring(0, maxContentLength) 
        : parsedContent;

      // Update the upload record with parsed content and status
      await prisma.upload.update({
        where: { id: uploadId },
        data: { 
          parsedContent: truncatedContent || '',
          parseStatus: truncatedContent ? 'COMPLETED' : 'FAILED'
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'PDF parsing completed successfully',
        contentLength: truncatedContent?.length || 0 
      });
    } catch (error) {
      console.error('Error parsing PDF:', error);
      
      // Update status to FAILED
      await prisma.upload.update({
        where: { id: uploadId },
        data: { parseStatus: 'FAILED' },
      });
      
      return NextResponse.json({ 
        success: false, 
        error: 'PDF parsing failed' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in parse-pdf API:', error);
    return NextResponse.json({ 
      error: 'An error occurred during PDF parsing' 
    }, { status: 500 });
  }
}

// GET endpoint to check parsing status
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get uploadId from URL
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
    }

    // Get the upload record
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
      select: { 
        id: true,
        parseStatus: true,
        userId: true
      }
    });

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Check if this file belongs to the user
    if (upload.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to upload' }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      parseStatus: upload.parseStatus
    });
  } catch (error) {
    console.error('Error checking parse status:', error);
    return NextResponse.json({ 
      error: 'An error occurred while checking parse status' 
    }, { status: 500 });
  }
} 