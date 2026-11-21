import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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

export async function POST() {
  return NextResponse.json(
    {
      error: 'Writes are disabled in demo mode. No data was saved.',
      write_enabled: false,
    },
    { status: 403 }
  );
}
