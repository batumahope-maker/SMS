import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo-mode';

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

export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json(
      { error: 'Write disabled', reason: 'Live database writes are not configured.' },
      { status: 403 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      records?: Array<{
        studentId?: unknown;
        subjectId?: unknown;
        marks?: unknown;
        term?: unknown;
        examType?: unknown;
        academicYear?: unknown;
      }>;
    };
    if (!Array.isArray(body.records)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const records = body.records
      .map((record) => {
        const studentId = Number(record.studentId);
        const marks = Number(record.marks);
        if (!Number.isInteger(studentId) || studentId <= 0) return null;
        if (!Number.isFinite(marks) || marks < 0 || marks > 100) return null;
        const subject = String(record.subjectId ?? '').trim();
        if (!subject) return null;
        const term = String(record.term ?? 'Term 1').trim() || 'Term 1';
        const examType = String(record.examType ?? 'Test').trim() || 'Test';
        const academicYear = Number(record.academicYear);
        return {
          studentId,
          subject,
          term,
          examType,
          year: Number.isInteger(academicYear) ? academicYear : new Date().getFullYear(),
          marks,
          maxMarks: 100,
          createdAt: new Date(),
        };
      })
      .filter((record): record is NonNullable<typeof record> => record !== null);

    if (records.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    const result = await db.mark.createMany({ data: records });
    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error('Error saving demo marks:', error);
    return NextResponse.json({ error: 'Failed to save marks.' }, { status: 500 });
  }
}
