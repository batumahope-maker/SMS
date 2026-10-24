import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// GET - Fetch all announcements
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const announcements = await db.announcement.findMany({
      where: { schoolId: session.user.schoolId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// POST - Create a new announcement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, audience, priority, imageUrl } = body;

    const announcement = await db.announcement.create({
      data: {
        schoolId: session.user.schoolId,
        title,
        content,
        audience,
        priority: priority || 'normal',
        imageUrl,
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
