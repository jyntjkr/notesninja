import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parsePdfFromUrl } from '@/utils/pdfParser';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Long timeout for PDF parsing with a safety margin
const PDF_PARSE_TIMEOUT = 45000; // 45 seconds (below Vercel's 50s limit)

// Maximum content size to prevent database issues
const MAX_CONTENT_LENGTH = 1000000; // 1MB limit

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
            
            // Since we don't want to block the response, we'll implement
            // a more resilient parsing approach with built-in timeout
            console.log('Beginning PDF content extraction for:', upload.fileUrl);
            
            try {
              // Step 1: Try to parse with standard timeout
              const parsedContent = await parsePdfFromUrl(upload.fileUrl, PDF_PARSE_TIMEOUT);
              
              // Truncate if needed
              const truncatedContent = parsedContent && parsedContent.length > MAX_CONTENT_LENGTH 
                ? parsedContent.substring(0, MAX_CONTENT_LENGTH) 
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
              // If first attempt fails, log but don't set to FAILED yet
              console.error('Initial PDF parsing attempt failed:', parseError);
              
              try {
                console.log('Attempting fallback method for:', upload.id);
                
                // Step 2: Try a more resilient approach - fetch partial content
                // First 10 pages are usually sufficient for test generation
                const options = { maxPages: 10 };
                const partialContent = await parsePdfFromUrl(upload.fileUrl, PDF_PARSE_TIMEOUT, options);
                
                if (partialContent && partialContent.length > 0) {
                  // We at least got some content, which is better than nothing
                  const safeContent = partialContent.length > MAX_CONTENT_LENGTH 
                    ? partialContent.substring(0, MAX_CONTENT_LENGTH) 
                    : partialContent;
                  
                  await prisma.upload.update({
                    where: { id: upload.id },
                    data: { 
                      parsedContent: safeContent,
                      parseStatus: 'COMPLETED' 
                    },
                  });
                  
                  console.log('PDF partial parsing completed successfully for:', upload.id);
                } else {
                  throw new Error('Failed to extract any content');
                }
              } catch (fallbackError) {
                console.error('Fallback PDF parsing failed:', fallbackError);
                
                // Only now set status to failed
                await prisma.upload.update({
                  where: { id: upload.id },
                  data: { parseStatus: 'FAILED' },
                });
              }
            }
          } catch (processError) {
            console.error('Error during PDF parsing process:', processError);
            
            // Ensure we always update status to FAILED if the overall process fails
            try {
              await prisma.upload.update({
                where: { id: upload.id },
                data: { parseStatus: 'FAILED' },
              });
            } catch (dbError) {
              console.error('Failed to update parse status:', dbError);
            }
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