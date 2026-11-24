import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo-mode';
import { WriterError } from '@/lib/db-writer';
import {
  deleteStudentDemo,
  updateStudentDemo,
  UpdateStudentParams,
} from '@/lib/demo-management-writer';
import type { Prisma } from '@prisma/client';

function mapStudent(student: {
  id: number;
  studentId: string | null;
  userId: number | null;
  trade: string | null;
  level: string | null;
  section: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  guardianName: string | null;
  guardianPhone: string | null;
  enrollmentDate: Date | null;
  feePaid: Prisma.Decimal | null;
  feeBalance: Prisma.Decimal | null;
  user: {
    id: number;
    fullName: string | null;
    username: string;
    email: string | null;
    phone: string | null;
    status: string | null;
  } | null;
}) {
  return {
    id: String(student.id),
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
      [student.trade, student.level, student.section]
        .filter(Boolean)
        .join(' ') || null,
  };
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

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
      ...mapStudent(student),
      marks,
      attendance,
      payments,
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

/**
 * PUT — update a student (admin in demo mode; read-only in the live build).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDemoMode()) {
    return NextResponse.json(
      {
        error: 'Write disabled',
        reason: 'This build is read-only against the live essjt_school_system database.',
      },
      { status: 403 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) {
    return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
  }

  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const params: UpdateStudentParams = {
      fullName: typeof body.fullName === 'string' ? body.fullName : undefined,
      gender: typeof body.gender === 'string' ? body.gender : undefined,
      dateOfBirth: body.dateOfBirth ? String(body.dateOfBirth) : undefined,
      trade: typeof body.trade === 'string' ? body.trade : undefined,
      level: typeof body.level === 'string' ? body.level : undefined,
      section: typeof body.section === 'string' ? body.section : undefined,
      phone: toStringOrNull(body.phone),
      email: toStringOrNull(body.email),
    };
    await updateStudentDemo(Number(student.userId), params);

    const updated = await db.student.findUnique({
      where: { id: studentId },
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
    return NextResponse.json(mapStudent(updated!));
  } catch (error) {
    if (error instanceof WriterError) {
      if (error.code === 'RECORD_NOT_FOUND') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      if (error.code === 'WRITER_INPUT_INVALID') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

/**
 * DELETE — remove a student (admin in demo mode; read-only in the live build).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDemoMode()) {
    return NextResponse.json(
      {
        error: 'Write disabled',
        reason: 'This build is read-only against the live essjt_school_system database.',
      },
      { status: 403 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) {
    return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
  }

  try {
    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    await deleteStudentDemo(Number(student.userId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WriterError) {
      if (error.code === 'RECORD_NOT_FOUND') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
    }
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
