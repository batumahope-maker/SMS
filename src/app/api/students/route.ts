import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Read-only student records.
 *
 * The live `students` table has no full_name / class_id / phone columns.
 * The name and contact details live on `users`; a "class" is the
 * (trade, level, section) combination.
 *
 * Writes are refused: this build must not modify the live database.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin' && session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const students = await db.student.findMany({
      orderBy: { id: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(
      students.map((student) => ({
        id: student.id,
        studentId: student.studentId,
        userId: student.userId,
        fullName: student.user?.fullName ?? student.user?.username ?? '',
        username: student.user?.username ?? '',
        email: student.user?.email ?? '',
        phone: student.user?.phone ?? null,
        status: student.user?.status ?? null,
        trade: student.trade,
        level: student.level,
        section: student.section,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        enrollmentDate: student.enrollmentDate,
        feePaid: Number(student.feePaid ?? 0),
        feeBalance: Number(student.feeBalance ?? 0),
        className:
          [student.trade, student.level, student.section].filter(Boolean).join(' ') || null,
      }))
    );
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Write disabled',
      reason:
        'This build is read-only against the live essjt_school_system database.',
    },
    { status: 403 }
  );
}
