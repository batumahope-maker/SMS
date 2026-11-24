import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isDemoMode } from '@/lib/demo-mode';
import { demoData } from '@/lib/demo-data';

/**
 * GET /api/lesson-plans — lesson plans for the signed-in teacher.
 *
 * The live schema has no lesson plans table (the teacher lesson-plans page
 * uses the in-memory demo data), so the live view is empty; synthetic demo
 * mode serves the in-memory demo data.
 */
interface LessonPlanRow {
  id: number;
  teacherId: number;
  title: string;
  subject: string;
  objectives: string | null;
  content: string;
  resources: string | null;
  date: Date | null;
  duration: number | null;
  createdAt: Date;
}

function demoLessonPlans(): LessonPlanRow[] {
  return demoData.lessonPlan as LessonPlanRow[];
}

function nextPlanId(): number {
  return Math.max(0, ...demoLessonPlans().map((row) => Number(row.id ?? 0))) + 1;
}

function toPlan(plan: LessonPlanRow) {
  return {
    id: plan.id,
    title: plan.title,
    subject: plan.subject,
    objectives: plan.objectives,
    content: plan.content,
    resources: plan.resources,
    date: plan.date ?? null,
    duration: plan.duration,
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isDemoMode()) {
    return NextResponse.json([]);
  }

  const userId = Number(session.user.id);
  const plans = demoLessonPlans()
    .filter((plan) => Number(plan.teacherId) === userId)
    .sort((left, right) => {
      const a = new Date(left.date ?? 0).getTime();
      const b = new Date(right.date ?? 0).getTime();
      return b - a;
    })
    .slice(0, 200);

  return NextResponse.json(plans.map(toPlan));
}

/**
 * POST /api/lesson-plans — create a lesson plan (synthetic demo only).
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
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title ?? '').trim();
    const subject = String(body.subjectId ?? body.subject ?? '').trim();
    const date = new Date(String(body.date ?? ''));
    if (!title || !subject || Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Please fill in the required fields (title, subject, date).' },
        { status: 400 }
      );
    }

    const duration = Number(body.duration ?? 0);
    const created: LessonPlanRow = {
      id: nextPlanId(),
      teacherId: Number(session.user.id),
      title,
      subject,
      objectives: body.objectives ? String(body.objectives) : null,
      content: String(body.content ?? ''),
      resources: body.resources ? String(body.resources) : null,
      date,
      duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
      createdAt: new Date(),
    };
    demoLessonPlans().push(created);

    return NextResponse.json({ ok: true, id: String(created.id) });
  } catch (error) {
    console.error('Error creating lesson plan:', error);
    return NextResponse.json({ error: 'Failed to save lesson plan.' }, { status: 500 });
  }
}
