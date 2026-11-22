import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo-mode';

/**
 * Read-only attendance.
 *
 * Live `attendance`: id, student_id (FK -> users.id), date, status
 * (Present/Absent/Late), notes, created_at. There is no class_id, marked_by
 * or remarks column.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedStudentId = searchParams.get('studentId');
  const date = searchParams.get('date');

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
    const records = await db.attendance.findMany({
      where: {
        ...(studentId !== undefined ? { studentId } : {}),
        ...(date ? { date: new Date(date) } : {}),
      },
      orderBy: { date: 'desc' },
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
      records.map((row) => ({
        id: row.id,
        studentId: row.studentId,
        studentName: row.student?.fullName ?? row.student?.username ?? '',
        studentNumber: row.student?.student?.studentId ?? null,
        date: row.date,
        status: row.status,
        notes: row.notes,
        createdAt: row.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

function normalizeStatus(value: unknown): 'Present' | 'Absent' | 'Late' {
  const status = String(value ?? '').trim().toLowerCase();
  if (status === 'present') return 'Present';
  if (status === 'absent') return 'Absent';
  if (status === 'late') return 'Late';
  return 'Present';
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
      records?: Array<{ studentId?: unknown; status?: unknown; notes?: unknown }>;
    };
    if (!Array.isArray(body.records)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const records = body.records
      .map((record) => {
        const studentId = Number(record.studentId);
        if (!Number.isInteger(studentId) || studentId <= 0) return null;
        return {
          studentId,
          status: normalizeStatus(record.status),
          notes: record.notes == null ? null : String(record.notes),
          createdAt: new Date(),
        };
      })
      .filter((record): record is NonNullable<typeof record> => record !== null);

    if (records.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    const result = await db.attendance.createMany({ data: records });
    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error('Error saving demo attendance:', error);
    return NextResponse.json({ error: 'Failed to save attendance.' }, { status: 500 });
  }
}
