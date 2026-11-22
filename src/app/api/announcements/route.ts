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

/**
 * Post an announcement.
 *
 * Live build: read-only (no writer procedure covers ad-hoc announcement
 * creation). Synthetic demo: writes into the in-memory demo data so the
 * existing create form works in demo mode. Accepts the payload the
 * AnnouncementsClient form posts: { title, content, audience, priority }.
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
      content?: unknown;
      audience?: unknown;
      targetAudience?: unknown;
      priority?: unknown;
    };
    const title = String(body.title ?? '').trim();
    const content = String(body.content ?? '').trim();
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Please fill in the title and content.' },
        { status: 400 }
      );
    }

    const priorityLabels: Record<string, 'Urgent' | 'High' | 'Normal' | 'Low'> = {
      urgent: 'Urgent',
      high: 'High',
      normal: 'Normal',
    };
    const priority =
      priorityLabels[String(body.priority ?? 'normal').trim().toLowerCase()] ??
      'Normal';

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        targetAudience: String(body.targetAudience ?? body.audience ?? 'all'),
        priority,
        createdBy: Number(session.user.id),
        createdAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id: announcement.id });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Failed to create announcement.' }, { status: 500 });
  }
}
