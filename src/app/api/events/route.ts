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
    const events = await db.schoolEvent.findMany({
      orderBy: [{ eventDate: 'asc' }, { id: 'asc' }],
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        eventType: true,
        eventDate: true,
        eventTime: true,
        location: true,
        targetAudience: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
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
