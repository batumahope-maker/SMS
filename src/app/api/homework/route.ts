import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { demoDb } from '@/lib/demo-db';
import { isDemoMode } from '@/lib/demo-mode';

async function loadHomeworkForUser(role: string, userId: number) {
  const homework = await demoDb.homework.findMany({
    where: role === 'teacher' ? { teacherId: userId } : { studentId: userId },
    orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
  });
  const submissions = homework.length
    ? await demoDb.homeworkSubmission.findMany({
        where: { homeworkId: { in: homework.map((item) => item.id) } },
        orderBy: { submittedAt: 'desc' },
      })
    : [];

  const submissionsByHomework = new Map<number, typeof submissions>();
  for (const submission of submissions) {
    const key = Number(submission.homeworkId ?? 0);
    submissionsByHomework.set(key, [...(submissionsByHomework.get(key) ?? []), submission]);
  }

  return homework.map((item) => ({
    id: String(item.id),
    title: item.title,
    description: item.description,
    dueDate: item.dueDate ?? new Date(0),
    maxMarks: item.maxMarks,
    subject: { name: item.subject ?? '' },
    class: { name: item.className ?? '' },
    teacher: { fullName: item.teacherId ? 'Demo Teacher' : '' },
    _count: { submissions: submissionsByHomework.get(Number(item.id))?.length ?? 0 },
  }));
}

export async function GET(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Not available' }, { status: 501 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'teacher' && session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(await loadHomeworkForUser(session.user.role, Number(session.user.id)));
}

export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Not available' }, { status: 501 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = Number(session.user.id);
  try {
    const body = await request.json() as {
      title?: unknown;
      description?: unknown;
      classId?: unknown;
      subjectId?: unknown;
      dueDate?: unknown;
      maxMarks?: unknown;
      teacherId?: unknown;
    };
    const title = String(body.title ?? '').trim();
    const subject = String(body.subjectId ?? '').trim();
    const className = String(body.classId ?? '').trim();
    const dueDateValue = new Date(String(body.dueDate ?? ''));
    if (!title || !subject || !className || Number.isNaN(dueDateValue.getTime())) {
      return NextResponse.json({ error: 'Please fill the required fields.' }, { status: 400 });
    }

    const maxMarks = body.maxMarks == null ? null : Number(body.maxMarks);
    const student = await demoDb.student.findFirst({ select: { userId: true } });
    const result = await demoDb.homework.create({
      data: {
        teacherId: userId,
        studentId: student?.userId ?? 3001,
        className,
        subject,
        title,
        description: String(body.description ?? ''),
        dueDate: dueDateValue,
        maxMarks: Number.isFinite(maxMarks) ? maxMarks : null,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error('Error creating demo homework:', error);
    return NextResponse.json({ error: 'Failed to save homework.' }, { status: 500 });
  }
}
