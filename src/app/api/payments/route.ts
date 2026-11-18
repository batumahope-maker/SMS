import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Read-only payments.
 *
 * Live `payments`: id, student_id (FK -> users.id), amount, payment_date,
 * payment_method, reference, created_at. There is no receipt_number,
 * paid_for, term or school_id column.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedStudentId = searchParams.get('studentId');

  let studentId: number | undefined;
  if (session.user.role === 'student') {
    studentId = Number(session.user.id);
  } else if (requestedStudentId) {
    const parsed = Number(requestedStudentId);
    if (!Number.isInteger(parsed)) {
      return NextResponse.json({ error: 'Invalid studentId' }, { status: 400 });
    }
    studentId = parsed;
  }

  try {
    const payments = await db.payment.findMany({
      where: studentId !== undefined ? { studentId } : {},
      orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
      take: 1000,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            username: true,
            student: { select: { studentId: true } },
          },
        },
      },
    });

    return NextResponse.json(
      payments.map((payment) => ({
        id: payment.id,
        studentId: payment.studentId,
        studentName: payment.student?.fullName ?? payment.student?.username ?? '',
        studentNumber: payment.student?.student?.studentId ?? null,
        amount: Number(payment.amount ?? 0),
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        createdAt: payment.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
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
