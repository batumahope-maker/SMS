import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const WRITE_DISABLED = {
  error: 'Write disabled',
  reason: 'This build is read-only against the live essjt_school_system database.',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) {
    return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
  }

  try {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Students may only read their own record.
    if (
      session.user.role === 'student' &&
      String(student.userId ?? '') !== String(session.user.id)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // IMPORTANT: marks/attendance/payments.student_id reference users.id.
    const userId = student.userId;
    const [marks, attendance, payments] = userId
      ? await Promise.all([
          db.mark.findMany({
            where: { studentId: userId },
            orderBy: { createdAt: 'desc' },
          }),
          db.attendance.findMany({
            where: { studentId: userId },
            orderBy: { date: 'desc' },
            take: 30,
          }),
          db.payment.findMany({
            where: { studentId: userId },
            orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
            take: 10,
          }),
        ])
      : [[], [], []];

    return NextResponse.json({
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
      marks,
      attendance,
      payments,
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(WRITE_DISABLED, { status: 403 });
}

export async function DELETE() {
  return NextResponse.json(WRITE_DISABLED, { status: 403 });
}
