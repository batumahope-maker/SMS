import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Read-only teacher records.
 * Live `teachers`: id, user_id, teacher_id, subject, department, hire_date.
 * The teacher name lives on users.full_name.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const teachers = await db.teacher.findMany({
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
      teachers.map((teacher) => ({
        id: teacher.id,
        teacherId: teacher.teacherId,
        userId: teacher.userId,
        fullName: teacher.user?.fullName ?? teacher.user?.username ?? '',
        username: teacher.user?.username ?? '',
        email: teacher.user?.email ?? '',
        phone: teacher.user?.phone ?? null,
        status: teacher.user?.status ?? null,
        subject: teacher.subject,
        department: teacher.department,
        hireDate: teacher.hireDate,
      }))
    );
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
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
