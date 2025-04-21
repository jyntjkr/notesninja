import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parsePdfFromUrl } from '@/utils/pdfParser';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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

    // Parse PDF content if it's a PDF file
    let parsedContent = null;
    try {
      if (fileType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf')) {
        console.log('Parsing PDF content for:', fileUrl);
        parsedContent = await parsePdfFromUrl(fileUrl);
        
        // Limit parsed content size to prevent database issues
        const maxContentLength = 1000000; // 1MB limit
        if (parsedContent && parsedContent.length > maxContentLength) {
          console.log(`PDF content too large (${parsedContent.length} chars), truncating`);
          parsedContent = parsedContent.substring(0, maxContentLength);
        }
        
        console.log('PDF parsed successfully, content length:', parsedContent?.length || 0);
      }
    } catch (error) {
      console.error('Error parsing PDF:', error);
      // Continue with upload even if parsing fails
    }

    // Create new upload record
    try {
      console.log('Creating upload record in database');
      
      // Check database connection
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
      
      // First try to create without parsed content if it's available
      let upload;
      
      if (parsedContent) {
        try {
          // First log the data structure being sent
          const uploadData = {
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
          };
          
          console.log('Upload data structure (without parsed content):', 
            JSON.stringify({...uploadData, parsedContent: `[Content length: ${parsedContent.length}]`}, null, 2)
          );
          
          upload = await prisma.upload.create({
            data: uploadData
          });
        } catch (contentError) {
          console.error('Error saving with parsed content:', contentError);
          
          // If that fails, try without parsed content
          console.log('Retrying without parsed content');
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
            }
          });
          
          // Try to update with parsed content separately
          try {
            if (parsedContent) {
              await prisma.upload.update({
                where: { id: upload.id },
                data: { parsedContent }
              });
              console.log('Updated record with parsed content');
            }
          } catch (updateError) {
            console.error('Error updating with parsed content:', updateError);
            // Continue without parsed content
          }
        }
      } else {
        // No parsed content, create record normally
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
          }
        });
      }

      console.log('Upload created successfully, id:', upload.id);
      return NextResponse.json({
        success: true,
        message: 'Material uploaded successfully',
        uploadId: upload.id,
      });
    } catch (dbError) {
      console.error('Database error when saving material:', dbError);
      // Get detailed error information
      const errorDetails = dbError instanceof Error ? {
        name: dbError.name,
        message: dbError.message,
        stack: dbError.stack
      } : String(dbError);
      console.error('Error details:', JSON.stringify(errorDetails, null, 2));
      
      if (dbError instanceof PrismaClientKnownRequestError) {
        console.error('Prisma error code:', dbError.code);
      }
      
      return NextResponse.json(
        { error: 'Failed to save material to database', details: errorDetails },
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