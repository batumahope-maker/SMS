import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// GET - Fetch all classes
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classes = await db.class.findMany({
      where: { schoolId: session.user.schoolId },
      include: {
        teacher: { select: { fullName: true, teacherId: true } },
        students: { where: { status: 'active' }, select: { id: true } },
        subjects: { select: { id: true } },
      },
      orderBy: [{ level: 'asc' }, { section: 'asc' }],
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

// POST - Create a new class
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, trade, level, section, combination, systemType, teacherId, academicYear } = body;

    const newClass = await db.class.create({
      data: {
        schoolId: session.user.schoolId,
        name: name || (systemType === 'reb'
          ? `${level}${combination ? ' ' + combination : ''} ${section}`
          : `${trade} ${level} ${section}`),
        systemType: systemType || 'tvet',
        trade: trade || '',
        combination: combination || '',
        level,
        section,
        teacherId: teacherId || null,
        academicYear,
        status: 'active',
      },
      include: {
        teacher: { select: { fullName: true, teacherId: true } },
        students: { select: { id: true } },
        subjects: { select: { id: true } },
      },
    });

    return NextResponse.json({
      ...newClass,
      studentCount: newClass.students.length,
      subjectCount: newClass.subjects.length,
    });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
