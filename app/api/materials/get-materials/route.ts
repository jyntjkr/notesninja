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
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Return the uploads
    return NextResponse.json({ success: true, uploads });
    
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching materials' }, 
      { status: 500 }
    );
  }
} 