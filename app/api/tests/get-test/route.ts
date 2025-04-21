import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get test ID from the URL
    const searchParams = req.nextUrl.searchParams;
    const testId = searchParams.get('id');

    if (!testId) {
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    // Fetch the test
    const test = await prisma.test.findUnique({
      where: {
        id: testId,
        userId: session.user.id, // Ensure user can only access their own tests
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        test,
      }
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { error: 'An error occurred while fetching the test', message: errorMessage }, 
      { status: 500 }
    );
  }
} 