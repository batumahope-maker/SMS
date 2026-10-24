import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

function calcGrade(m: number): string {
  if (m >= 90) return 'A+'; if (m >= 80) return 'A'; if (m >= 70) return 'B';
  if (m >= 60) return 'C'; if (m >= 50) return 'D'; return 'F';
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const classId = searchParams.get('classId');

  const marks = await db.mark.findMany({
    where: {
      student: { schoolId: session.user.schoolId },
      ...(studentId ? { studentId } : {}),
      ...(classId ? { student: { classId } } : {}),
    },
    include: {
      student: { select: { fullName: true, studentId: true } },
      subject: { select: { name: true, code: true } },
      teacher: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(marks);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { studentId, subjectId, marks, term, examType, academicYear } = body;

  if (!studentId || !subjectId || marks === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Get teacher id if role is teacher
  let teacherId: string | undefined;
  if (session.user.role === 'teacher') {
    const teacher = await db.teacher.findFirst({ where: { userId: session.user.id } });
    teacherId = teacher?.id;
  }

  const mark = await db.mark.create({
    data: {
      studentId, subjectId,
      marks: parseFloat(marks),
      grade: calcGrade(parseFloat(marks)),
      term: term || 'Term 1',
      examType: examType || 'Test',
      academicYear: academicYear || new Date().getFullYear().toString(),
      teacherId,
    },
    include: {
      student: { select: { fullName: true, studentId: true } },
      subject: { select: { name: true } },
    },
  });
  return NextResponse.json(mark);
}
