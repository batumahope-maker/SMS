import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo-mode';
import { WriterError } from '@/lib/db-writer';
import {
  createStudentDemo,
  demoStudentRows,
  findDemoStudentWithUser,
  demoUserByUserId,
  CreateStudentParams,
} from '@/lib/demo-management-writer';
import type { Prisma } from '@prisma/client';

/**
 * Read-only student records.
 *
 * The live `students` table has no full_name / class_id / phone columns.
 * The name and contact details live on `users`; a "class" is the
 * (trade, level, section) combination.
 *
 * Writes: in synthetic demo mode creating/editing/deleting students works via
 * the in-memory demo data (demo-management-writer). In the live build this
 * route stays read-only because there is no approved write procedure.
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
    const rows = isDemoMode()
      ? demoStudentRows()
      : await db.student.findMany({
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
      rows.map((student) =>
        mapStudent(
          isDemoMode()
            ? { ...student, user: demoUserByUserId(student.userId ?? 0) }
            : student
        )
      )
    );
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

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
  user?: {
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

export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json(
      {
        error: 'Write disabled',
        reason:
          'This build is read-only against the live essjt_school_system database.',
      },
      { status: 403 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const params: CreateStudentParams = {
      studentId: typeof body.studentId === 'string' ? body.studentId : null,
      fullName: String(body.fullName ?? ''),
      gender: typeof body.gender === 'string' ? body.gender : 'Male',
      dateOfBirth: body.dateOfBirth ? String(body.dateOfBirth) : null,
      phone: body.phone ? String(body.phone) : null,
      trade: String(body.trade ?? ''),
      level: String(body.level ?? ''),
      section: String(body.section ?? ''),
      guardianName: body.guardianName ? String(body.guardianName) : null,
      guardianPhone: body.guardianPhone ? String(body.guardianPhone) : null,
      email: body.email ? String(body.email) : null,
      enrollmentDate: body.enrollmentDate ? String(body.enrollmentDate) : null,
      feePaid: Number(body.feePaid ?? 0) || 0,
      feeBalance: Number(body.feeBalance ?? 0) || 0,
    };

    const created = await createStudentDemo(params);
    const student = isDemoMode()
      ? findDemoStudentWithUser(created.userId)
      : await db.student.findFirst({
          where: { userId: created.userId },
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
    if (!student) {
      return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
    }
    return NextResponse.json(mapStudent(student));
  } catch (error) {
    if (error instanceof WriterError) {
      if (error.code === 'DUPLICATE_STUDENT_ID') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.code === 'WRITER_INPUT_INVALID') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
