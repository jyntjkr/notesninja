import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parsePdfFromUrl } from '@/utils/pdfParser';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Optimize timeouts for serverless execution
const PDF_PARSE_TIMEOUT = 25000; // 25 seconds for initial parsing
const MAX_CONTENT_LENGTH = 800000; // 800KB limit for database storage

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
            
            let parsedContent = '';
            
            // Try progressively with smaller chunks to ensure we get at least some content
            const attempts = [
              { maxPages: 0, timeout: PDF_PARSE_TIMEOUT }, // Try full document first
              { maxPages: 15, timeout: 20000 },           // Try first 15 pages
              { maxPages: 5, timeout: 15000 }            // Last attempt with just 5 pages
            ];
            
            // Try each approach in sequence until one works
            for (const attempt of attempts) {
              try {
                console.log(`Attempt parsing PDF with maxPages=${attempt.maxPages || 'all'}, timeout=${attempt.timeout}ms`);
                const content = await parsePdfFromUrl(upload.fileUrl, attempt.timeout, 
                  attempt.maxPages ? { maxPages: attempt.maxPages } : undefined
                );
                
                if (content && content.length > 0) {
                  parsedContent = content;
                  console.log(`Successfully parsed PDF with ${attempt.maxPages || 'all'} pages approach`);
                  break; // Exit the loop if we got content
                }
              } catch (attemptError) {
                console.error(`PDF parsing attempt failed:`, attemptError);
                // Continue to next attempt
              }
            }
            
            // Limit parsed content size to prevent database issues
            const truncatedContent = parsedContent && parsedContent.length > MAX_CONTENT_LENGTH 
              ? parsedContent.substring(0, MAX_CONTENT_LENGTH) 
              : parsedContent;
              
            // Update database with content (or FAILED status if no content)
            if (truncatedContent && truncatedContent.length > 0) {
              await prisma.upload.update({
                where: { id: upload.id },
                data: { 
                  parsedContent: truncatedContent,
                  parseStatus: 'COMPLETED' 
                },
              });
              console.log(`PDF parsing completed successfully for: ${upload.id}, content size: ${truncatedContent.length}`);
            } else {
              // If all attempts failed, mark as failed
              await prisma.upload.update({
                where: { id: upload.id },
                data: { parseStatus: 'FAILED' },
              });
              console.log(`PDF parsing failed for: ${upload.id}, no content extracted`);
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