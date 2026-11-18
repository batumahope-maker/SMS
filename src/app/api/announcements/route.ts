import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const announcements = await db.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        targetAudience: true,
        createdBy: true,
        createdAt: true,
      },
    });
    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Write disabled',
      reason: 'This build is read-only against the live essjt_school_system database.',
    },
    { status: 403 }
  );
}
