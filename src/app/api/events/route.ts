import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo-mode';

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

/**
 * Create an event.
 *
 * Live build: read-only (no writer procedure covers ad-hoc event creation).
 * Synthetic demo: writes into the in-memory demo data so the existing
 * create form works in demo mode. Accepts the payload the EventsClient form
 * posts: { title, description, date, time, location, eventType }.
 */
export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json(
      {
        error: 'Write disabled',
        reason: 'This build is read-only against the live essjt_school_system database.',
      },
      { status: 403 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: unknown;
      description?: unknown;
      date?: unknown;
      time?: unknown;
      location?: unknown;
      eventType?: unknown;
      targetAudience?: unknown;
    };
    const title = String(body.title ?? '').trim();
    const eventDate = new Date(String(body.date ?? ''));
    if (!title) {
      return NextResponse.json({ error: 'Please fill in the event title.' }, { status: 400 });
    }
    if (Number.isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: 'A valid event date is required.' }, { status: 400 });
    }

    const event = await db.schoolEvent.create({
      data: {
        title,
        description: String(body.description ?? ''),
        eventType: String(body.eventType ?? 'Activity'),
        eventDate,
        eventTime: body.time ? String(body.time) : null,
        location: body.location ? String(body.location) : null,
        targetAudience: String(body.targetAudience ?? 'all'),
        isActive: true,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id: event.id });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 });
  }
}
