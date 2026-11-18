import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Read-only results.
 *
 * Live `marks`: id, student_id (FK -> users.id), subject (free text),
 * term, year, marks, max_marks, created_at. There is no grade, exam_type,
 * teacher_id or subject table.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedStudentId = searchParams.get('studentId');
  const subject = searchParams.get('subject');
  const term = searchParams.get('term');

  // Students may only read their own marks. student_id is users.id.
  let studentId: number | undefined;
  if (session.user.role === 'student') {
    studentId = Number(session.user.id);
  } else if (requestedStudentId) {
    const parsed = Number(requestedStudentId);
    if (!Number.isInteger(parsed)) {
      return NextResponse.json({ error: 'Invalid studentId' }, { status: 400 });
    }
    studentId = parsed;
  }

  try {
    const marks = await db.mark.findMany({
      where: {
        ...(studentId !== undefined ? { studentId } : {}),
        ...(subject ? { subject } : {}),
        ...(term ? { term } : {}),
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            username: true,
            student: { select: { studentId: true } },
          },
        },
      },
    });

    return NextResponse.json(
      marks.map((mark) => {
        const score = Number(mark.marks ?? 0);
        const max = Number(mark.maxMarks ?? 100);
        const pct = max > 0 ? (score / max) * 100 : 0;
        return {
          id: mark.id,
          studentId: mark.studentId,
          studentName: mark.student?.fullName ?? mark.student?.username ?? '',
          studentNumber: mark.student?.student?.studentId ?? null,
          subject: mark.subject,
          term: mark.term,
          year: mark.year,
          marks: score,
          maxMarks: max,
          percentage: Math.round(pct * 100) / 100,
          grade:
            pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F',
          createdAt: mark.createdAt,
        };
      })
    );
  } catch (error) {
    console.error('Error fetching marks:', error);
    return NextResponse.json({ error: 'Failed to fetch marks' }, { status: 500 });
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
