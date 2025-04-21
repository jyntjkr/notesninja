import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { id, title, description, subject, content, testConfig, materialId } = body;

    if (!id || !title || !content || !testConfig || !materialId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if the test belongs to the current user
    const existingTest = await prisma.test.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingTest) {
      return NextResponse.json({ error: 'Test not found or unauthorized' }, { status: 404 });
    }

    // Update the test
    const updatedTest = await prisma.test.update({
      where: {
        id,
      },
      data: {
        title,
        description: description || '',
        subject: subject || '',
        content,
        testConfig,
        materialId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        test: updatedTest,
      }
    });
  } catch (error) {
    console.error('Error updating test:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { error: 'An error occurred while updating the test', message: errorMessage }, 
      { status: 500 }
    );
  }
} 