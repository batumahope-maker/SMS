import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// GET - Fetch single student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const student = await db.student.findUnique({
      where: { id },
      include: {
        class: true,
        user: true,
        marks: {
          include: {
            subject: true,
          },
        },
        attendance: {
          take: 30,
          orderBy: { date: 'desc' },
        },
        payments: {
          take: 10,
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

// PUT - Update student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
      status,
    } = body;

    // Check if student exists
    const existingStudent = await db.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if new studentId conflicts with another student
    if (studentId && studentId !== existingStudent.studentId) {
      const conflict = await db.student.findUnique({
        where: { studentId },
      });
      if (conflict) {
        return NextResponse.json(
          { error: 'A student with this ID already exists' },
          { status: 400 }
        );
      }
    }

    // Update student
    const student = await db.student.update({
      where: { id },
      data: {
        studentId: studentId || existingStudent.studentId,
        fullName: fullName || existingStudent.fullName,
        gender: gender || existingStudent.gender,
        systemType: systemType !== undefined ? systemType : existingStudent.systemType,
        trade: trade !== undefined ? trade : existingStudent.trade,
        combination: combination !== undefined ? combination : existingStudent.combination,
        level: level !== undefined ? level : existingStudent.level,
        section: section !== undefined ? section : existingStudent.section,
        classId: classId !== undefined ? classId : existingStudent.classId,
        phone: phone !== undefined ? phone : existingStudent.phone,
        guardianName: guardianName !== undefined ? guardianName : existingStudent.guardianName,
        guardianPhone: guardianPhone !== undefined ? guardianPhone : existingStudent.guardianPhone,
        guardianEmail: guardianEmail !== undefined ? guardianEmail : existingStudent.guardianEmail,
        status: status || existingStudent.status,
      },
      include: {
        class: true,
      },
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

// DELETE - Delete student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if student exists
    const student = await db.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete related records first
    await db.mark.deleteMany({ where: { studentId: id } });
    await db.attendance.deleteMany({ where: { studentId: id } });
    await db.payment.deleteMany({ where: { studentId: id } });
    await db.homeworkSubmission.deleteMany({ where: { studentId: id } });
    await db.bookIssue.deleteMany({ where: { studentId: id } });
    await db.transportAssignment.deleteMany({ where: { studentId: id } });
    await db.roomAllocation.deleteMany({ where: { studentId: id } });
    await db.reportCard.deleteMany({ where: { studentId: id } });

    // Delete student
    await db.student.delete({ where: { id } });

    // Delete associated user if exists
    if (student.userId) {
      await db.user.delete({ where: { id: student.userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
