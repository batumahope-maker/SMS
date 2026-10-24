import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - Fetch all teachers
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teachers = await db.teacher.findMany({
      where: { schoolId: session.user.schoolId },
      include: {
        user: { select: { email: true, phone: true } },
        classes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

// POST - Create a new teacher
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teacherId, fullName, gender, phone, subjects, department, qualification, salary, email } = body;

    // Check if teacher ID already exists
    const existingTeacher = await db.teacher.findUnique({
      where: { teacherId },
    });

    if (existingTeacher) {
      return NextResponse.json({ error: 'Teacher ID already exists' }, { status: 400 });
    }

    // Create user account
    const passwordHash = await bcrypt.hash('teacher123', 10);
    const user = await db.user.create({
      data: {
        username: teacherId.toLowerCase(),
        email: email || `${teacherId.toLowerCase()}@essjt.edu.rw`,
        password: passwordHash,
        role: 'teacher',
        schoolId: session.user.schoolId,
        status: 'active',
      },
    });

    // Create teacher profile
    const teacher = await db.teacher.create({
      data: {
        userId: user.id,
        schoolId: session.user.schoolId,
        teacherId,
        fullName,
        gender,
        phone,
        subjects,
        department,
        qualification,
        salary: salary || 0,
        status: 'active',
      },
      include: {
        user: { select: { email: true } },
      },
    });

    return NextResponse.json(teacher);
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}
