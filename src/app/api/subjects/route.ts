import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const subjects = await db.subject.findMany({
    where: { schoolId: session.user.schoolId },
    include: {
      class: { select: { name: true } },
      teacher: { select: { fullName: true } },
      _count: { select: { marks: true } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(subjects);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, code, classId, teacherId } = body;

  if (!name) return NextResponse.json({ error: 'Subject name required' }, { status: 400 });

  const subject = await db.subject.create({
    data: {
      name,
      code: code || null,
      schoolId: session.user.schoolId,
      classId: classId || null,
      teacherId: teacherId || null,
      status: 'active',
    },
  });
  return NextResponse.json(subject);
}
