import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo-mode';
import { WriterError } from '@/lib/db-writer';
import {
  createTeacherDemo,
  CreateTeacherParams,
  findDemoTeacherWithUser,
} from '@/lib/demo-management-writer';
import type { Prisma } from '@prisma/client';

/**
 * Read-only teacher records.
 * Live `teachers`: id, user_id, teacher_id, subject, department, hire_date.
 * The teacher name lives on users.full_name.
 *
 * Writes: in synthetic demo mode creating teachers works via the in-memory
 * demo data (demo-management-writer). In the live build this route stays
 * read-only because there is no approved write procedure.
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

    return NextResponse.json(teachers.map((teacher) => mapTeacher(teacher)));
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

function mapTeacher(teacher: {
  id: number;
  teacherId: string | null;
  userId: number | null;
  subject: string | null;
  department: string | null;
  hireDate: Date | null;
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
    id: String(teacher.id),
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
  };
}

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    const params: CreateTeacherParams = {
      teacherId: typeof body.teacherId === 'string' ? body.teacherId : null,
      fullName: String(body.fullName ?? ''),
      gender: typeof body.gender === 'string' ? body.gender : 'Male',
      phone: body.phone ? String(body.phone) : null,
      subjects: typeof body.subjects === 'string' ? body.subjects : '',
      department: typeof body.department === 'string' ? body.department : '',
      email: body.email ? String(body.email) : null,
      hireDate: body.hireDate ? String(body.hireDate) : null,
    };

    const created = await createTeacherDemo(params);
    const teacher = isDemoMode()
      ? findDemoTeacherWithUser(created.userId)
      : await db.teacher.findFirst({
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
    if (!teacher) {
      return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
    }
    return NextResponse.json(mapTeacher(teacher));
  } catch (error) {
    if (error instanceof WriterError) {
      if (error.code === 'DUPLICATE_STUDENT_ID') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.code === 'WRITER_INPUT_INVALID') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}
