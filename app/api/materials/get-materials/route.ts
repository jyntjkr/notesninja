import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user is a teacher
    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can access materials' }, { status: 403 });
    }

    // Get query parameters (for filtering/sorting later)
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'latest';

    // Fetch materials uploaded by this teacher
    const materials = await prisma.upload.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: sort === 'latest' ? 'desc' : 'asc'
      },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
          }
        }
      }
    });

    // Calculate days since upload for each material
    const materialWithDaysAgo = materials.map(material => {
      const daysAgo = Math.floor((Date.now() - new Date(material.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      let dateDisplay = '';
      
      if (daysAgo === 0) {
        dateDisplay = 'Added today';
      } else if (daysAgo === 1) {
        dateDisplay = 'Added yesterday';
      } else if (daysAgo < 7) {
        dateDisplay = `Added ${daysAgo} days ago`;
      } else if (daysAgo < 30) {
        const weeks = Math.floor(daysAgo / 7);
        dateDisplay = `Added ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      } else {
        const months = Math.floor(daysAgo / 30);
        dateDisplay = `Added ${months} ${months === 1 ? 'month' : 'months'} ago`;
      }
      
      return {
        ...material,
        daysAgo,
        dateDisplay
      };
    });

    return NextResponse.json({
      materials: materialWithDaysAgo
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
} 