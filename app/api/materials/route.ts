import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parsePdfFromUrl } from '@/utils/pdfParser';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Maximum time to allow for PDF parsing in serverless environment (15 seconds)
const PDF_PARSE_TIMEOUT = 15000;

export async function POST(request: Request) {
  console.log('POST /api/materials - Request received');
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    console.log('Session check:', session ? 'Session exists' : 'No session');
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user is a teacher
    console.log('User role check:', session.user.role);
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can upload materials' }, { status: 403 });
    }

    // Parse request body
    console.log('Parsing request body');
    const body = await request.json();
    console.log('Request body:', { 
      title: body.title, 
      type: body.type, 
      subject: body.subject, 
      fileType: body.fileType,
      fileName: body.fileName
    });
    
    const {
      title,
      description,
      type,
      subject,
      fileUrl,
      fileType,
      fileName,
      fileSize,
      fileKey,
    } = body;

    // Basic validation
    if (!title || !fileUrl) {
      console.log('Missing required fields:', { title: !!title, fileUrl: !!fileUrl });
      return NextResponse.json(
        { error: 'Missing required fields: title and fileUrl are required' },
        { status: 400 }
      );
    }

    // Check database connection first to fail fast
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection is active');
    } catch (connError) {
      console.error('Database connection error:', connError);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Create upload record without parsed content first
    let upload;
    try {
      console.log('Creating initial upload record in database');
      upload = await prisma.upload.create({
        data: {
          title,
          fileUrl,
          fileType,
          description: description || '',
          materialType: type || 'notes',
          subject: subject || 'other',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          fileKey: fileKey || '',
          user: {
            connect: {
              id: session.user.id
            }
          }
        },
      });
      console.log('Initial upload created successfully, id:', upload.id);
    } catch (createError) {
      console.error('Error creating upload record:', createError);
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      );
    }

    // Start PDF parsing in background (don't await it)
    // This way the response can be sent back quickly, and parsing continues in background
    if (fileType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf')) {
      console.log('Starting PDF parsing in background for:', fileUrl);
      
      // We don't await this - fire and forget in serverless environment
      (async () => {
        try {
          const parsedContent = await parsePdfFromUrl(fileUrl, PDF_PARSE_TIMEOUT);
          
          if (parsedContent && parsedContent.length > 0) {
            console.log('PDF parsed successfully, content length:', parsedContent.length);
            
            // Limit parsed content size to prevent database issues
            const maxContentLength = 1000000; // 1MB limit
            const trimmedContent = parsedContent.length > maxContentLength 
              ? parsedContent.substring(0, maxContentLength) 
              : parsedContent;
            
            // Update the record with parsed content
            await prisma.upload.update({
              where: { id: upload.id },
              data: { parsedContent: trimmedContent }
            });
            console.log('Updated record with parsed content');
          } else {
            console.log('PDF parsing returned empty content');
          }
        } catch (parseError) {
          console.error('Error in background PDF parsing:', parseError);
        }
      })();
    }

    // Return success immediately, don't wait for parsing
    return NextResponse.json({
      success: true,
      message: 'Material uploaded successfully',
      uploadId: upload.id,
    });
    
  } catch (error) {
    console.error('Error uploading material:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to upload material', message: errorMessage },
      { status: 500 }
    );
  }
} 