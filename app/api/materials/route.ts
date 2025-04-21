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

    // For PDF files, do the parsing upfront instead of in the background
    // This ensures the parsing is completed before the function terminates
    let parsedContent = null;
    if (fileType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf')) {
      console.log('Parsing PDF content for:', fileUrl);
      try {
        // Parse with timeout to avoid serverless function timeout
        parsedContent = await parsePdfFromUrl(fileUrl, PDF_PARSE_TIMEOUT);
        
        if (parsedContent && parsedContent.length > 0) {
          console.log('PDF parsed successfully, content length:', parsedContent.length);
          
          // Limit parsed content size to prevent database issues
          const maxContentLength = 1000000; // 1MB limit
          if (parsedContent.length > maxContentLength) {
            console.log(`PDF content too large (${parsedContent.length} chars), truncating`);
            parsedContent = parsedContent.substring(0, maxContentLength);
          }
        } else {
          console.log('PDF parsing returned empty content');
        }
      } catch (parseError) {
        console.error('Error parsing PDF:', parseError);
        // Continue with upload even if parsing fails
      }
    }

    // Create upload record with parsed content if available
    try {
      console.log('Creating upload record in database');
      
      const upload = await prisma.upload.create({
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
          parsedContent,
          user: {
            connect: {
              id: session.user.id
            }
          }
        },
      });

      console.log('Upload created successfully, id:', upload.id);
      
      // Double-check if parsedContent was stored (debugging)
      try {
        const checkUpload = await prisma.upload.findUnique({
          where: { id: upload.id },
          select: { id: true, parsedContent: true }
        });
        
        console.log('Verified parsedContent stored:', 
          checkUpload?.parsedContent ? 
          `Yes (length: ${checkUpload.parsedContent.length})` : 
          'No (null)'
        );
      } catch (checkError) {
        console.error('Error verifying parsed content storage:', checkError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Material uploaded successfully',
        uploadId: upload.id,
        parsedContentLength: parsedContent ? parsedContent.length : 0
      });
    } catch (createError) {
      console.error('Error creating upload record:', createError);
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error uploading material:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to upload material', message: errorMessage },
      { status: 500 }
    );
  }
} 