import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user ID from the session
    const userId = session.user.id;

    // Get all uploads for the user
    const uploads = await prisma.upload.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileType: true,
        description: true,
        materialType: true,
        subject: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true,
        parsedContent: true,
        parseStatus: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transform the data to include parsing status
    const transformedUploads = uploads.map(upload => {
      // Check if parsedContent exists and has text content
      const hasParsedContent = upload.parsedContent !== null && typeof upload.parsedContent === 'string' && upload.parsedContent.length > 0;
      
      // Remove the actual parsed content to reduce payload size
      const { parsedContent, ...uploadWithoutContent } = upload;
      
      return {
        ...uploadWithoutContent,
        hasParsedContent,
        isReady: upload.parseStatus === 'COMPLETED' && hasParsedContent,
        isPending: upload.parseStatus === 'PENDING' || upload.parseStatus === 'PROCESSING',
      };
    });

    // Return the uploads with parsing status
    return NextResponse.json({ 
      success: true, 
      uploads: transformedUploads
    });
    
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching materials' }, 
      { status: 500 }
    );
  }
} 