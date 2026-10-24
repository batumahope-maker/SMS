import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - Fetch all students
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const students = await db.student.findMany({
      where: { schoolId: session.user.schoolId },
      include: {
        class: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST - Create new student
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      studentId,
      fullName,
      gender,
      systemType,
      trade,
      combination,
      level,
      section,
      classId,
      phone,
      guardianName,
      guardianPhone,
      guardianEmail,
      email,
    } = body;

    // Check if student ID already exists
    const existingStudent = await db.student.findUnique({
      where: { studentId },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: 'A student with this ID already exists' },
        { status: 400 }
      );
    }

    // Create user account for student if email provided
    let userId = null;
    if (email) {
      const passwordHash = await bcrypt.hash('student123', 10);
      const user = await db.user.create({
        data: {
          username: studentId.toLowerCase(),
          email: email,
          password: passwordHash,
          role: 'student',
          schoolId: session.user.schoolId,
          phone: phone,
        },
      });
      userId = user.id;
    }

    // Create student
    const student = await db.student.create({
      data: {
        studentId,
        userId: userId,
        schoolId: session.user.schoolId,
        fullName,
        gender,
        systemType: systemType || 'tvet',
        trade: trade || '',
        combination: combination || '',
        level: level || '',
        section: section || '',
        classId: classId || null,
        phone: phone || null,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
        guardianEmail: guardianEmail || null,
      },
      include: {
        class: true,
      },
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
