import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo-mode';

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

/**
 * Record a payment.
 *
 * Live build: read-only (no writer procedure covers ad-hoc payment posting).
 * Synthetic demo: writes into the in-memory demo data, so the admin "Record
 * payment" form works in demo mode. The stored `studentId` references the
 * users.id, matching the live `payments.student_id` FK.
 */
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
    const body = (await request.json()) as {
      studentId?: unknown;
      amount?: unknown;
      paymentMethod?: unknown;
      notes?: unknown;
    };
    const studentId = Number(body.studentId);
    const amount = Number(body.amount);
    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
      return NextResponse.json({ error: 'Please select a student.' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'A payment amount is required.' }, { status: 400 });
    }

    const known = await db.student.findFirst({
      where: { OR: [{ userId: studentId }, { id: studentId }] },
      select: { id: true },
    });
    if (!known) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const payment = await db.payment.create({
      data: {
        studentId,
        amount,
        paymentDate: new Date(),
        paymentMethod: String(body.paymentMethod ?? 'Cash'),
        reference: String(body.notes ?? ''),
        createdAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id: payment.id, studentId, amount });
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ error: 'Failed to record payment.' }, { status: 500 });
  }
}
