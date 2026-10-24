import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const date = searchParams.get('date');

  const records = await db.attendance.findMany({
    where: {
      student: { schoolId: session.user.schoolId },
      ...(classId ? { classId } : {}),
      ...(date ? { date: new Date(date) } : {}),
    },
    include: {
      student: { select: { fullName: true, studentId: true } },
      class: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: 500,
  });
  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { records } = body; // Array of { studentId, classId, status, date, remarks }

  if (!records || !Array.isArray(records)) {
    return NextResponse.json({ error: 'records array required' }, { status: 400 });
  }

  let teacherId: string | undefined;
  if (session.user.role === 'teacher') {
    const teacher = await db.teacher.findFirst({ where: { userId: session.user.id } });
    teacherId = teacher?.id;
  }

  const created = await db.$transaction(
    records.map((r: { studentId: string; classId?: string; status: string; date: string; remarks?: string }) =>
      db.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: new Date(r.date) } },
        update: { status: r.status, remarks: r.remarks, markedBy: teacherId },
        create: {
          studentId: r.studentId,
          classId: r.classId,
          date: new Date(r.date),
          status: r.status,
          remarks: r.remarks,
          markedBy: teacherId,
        },
      })
    )
  );
  return NextResponse.json({ count: created.length, records: created });
}
