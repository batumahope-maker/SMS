import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');

  const homework = await db.homework.findMany({
    where: {
      class: { schoolId: session.user.schoolId },
      ...(classId ? { classId } : {}),
    },
    include: {
      subject: { select: { name: true, code: true } },
      class: { select: { name: true } },
      teacher: { select: { fullName: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(homework);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, description, subjectId, classId, dueDate, maxMarks } = body;

  if (!title || !subjectId || !classId || !dueDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const teacher = await db.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

  const homework = await db.homework.create({
    data: {
      title,
      description: description || null,
      subjectId,
      classId,
      teacherId: teacher.id,
      dueDate: new Date(dueDate),
      maxMarks: maxMarks ? parseFloat(maxMarks) : null,
    },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
  });
  return NextResponse.json(homework);
}
