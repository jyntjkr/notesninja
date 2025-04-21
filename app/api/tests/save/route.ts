import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { title, description, subject, content, testConfig, materialId } = body;

    if (!title || !content || !testConfig || !materialId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save the test to the database
    const test = await prisma.test.create({
      data: {
        title,
        description: description || '',
        subject: subject || '',
        content,
        testConfig,
        materialId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        test,
      }
    });
  } catch (error) {
    console.error('Error saving test:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { error: 'An error occurred while saving the test', message: errorMessage }, 
      { status: 500 }
    );
  }
} 