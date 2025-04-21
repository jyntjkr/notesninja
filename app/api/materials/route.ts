import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parsePdfFromUrl } from '@/utils/pdfParser';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Long timeout for PDF parsing
const PDF_PARSE_TIMEOUT = 60000; // 60 seconds

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

    // Determine if this is a PDF file
    const isPdf = fileType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf');
    const parseStatus = isPdf ? 'PENDING' : 'COMPLETED';

    // Create upload record without parsed content initially
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
          parseStatus,
          user: {
            connect: {
              id: session.user.id
            }
          }
        },
      });

      console.log('Upload created successfully, id:', upload.id);
      
      // If this is a PDF, start background parsing process
      if (isPdf) {
        console.log('Starting background PDF parsing for:', upload.id);
        
        // Process in background without blocking the response
        (async () => {
          try {
            // Update status to PROCESSING
            await prisma.upload.update({
              where: { id: upload.id },
              data: { parseStatus: 'PROCESSING' },
            });
            
            console.log('Beginning PDF content extraction for:', upload.fileUrl);
            const parsedContent = await parsePdfFromUrl(upload.fileUrl, PDF_PARSE_TIMEOUT);
            
            // Limit content size if needed
            const maxContentLength = 1000000; // 1MB limit
            const truncatedContent = parsedContent && parsedContent.length > maxContentLength 
              ? parsedContent.substring(0, maxContentLength) 
              : parsedContent;
              
            // Update with parsed content
            await prisma.upload.update({
              where: { id: upload.id },
              data: { 
                parsedContent: truncatedContent || '',
                parseStatus: truncatedContent ? 'COMPLETED' : 'FAILED' 
              },
            });
            
            console.log('PDF parsing completed successfully for:', upload.id);
          } catch (parseError) {
            console.error('Error during PDF parsing:', parseError);
            
            // Update status to FAILED
            await prisma.upload.update({
              where: { id: upload.id },
              data: { parseStatus: 'FAILED' },
            });
          }
        })().catch(error => {
          console.error('Unhandled error in background parsing:', error);
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Material uploaded successfully',
        uploadId: upload.id,
        parseStatus,
        isPdf
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