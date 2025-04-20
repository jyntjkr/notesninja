import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user is a teacher
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can upload materials' }, { status: 403 });
    }

    // Parse request body
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
    } = await request.json();

    // Basic validation
    if (!title || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title and fileUrl are required' },
        { status: 400 }
      );
    }

    // Create new upload record
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
        user: {
          connect: {
            id: session.user.id
          }
        }
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Material uploaded successfully',
      uploadId: upload.id,
    });
  } catch (error) {
    console.error('Error uploading material:', error);
    return NextResponse.json(
      { error: 'Failed to upload material' },
      { status: 500 }
    );
  }
} 