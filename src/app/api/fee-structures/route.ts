import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// GET - Fetch all fee structures
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feeStructures = await db.feeStructure.findMany({
      where: { schoolId: session.user.schoolId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(feeStructures);
  } catch (error) {
    console.error('Error fetching fee structures:', error);
    return NextResponse.json({ error: 'Failed to fetch fee structures' }, { status: 500 });
  }
}

// POST - Create a new fee structure
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, term, academicYear, dueDate } = body;

    const feeStructure = await db.feeStructure.create({
      data: {
        schoolId: session.user.schoolId,
        name,
        amount,
        term,
        academicYear,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(feeStructure);
  } catch (error) {
    console.error('Error creating fee structure:', error);
    return NextResponse.json({ error: 'Failed to create fee structure' }, { status: 500 });
  }
}
