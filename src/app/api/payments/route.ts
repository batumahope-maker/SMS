import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  const payments = await db.payment.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: { select: { fullName: true, studentId: true, class: { select: { name: true } } } },
    },
    orderBy: { paidAt: 'desc' },
    take: 500,
  });
  return NextResponse.json(payments);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { studentId, amount, paymentMethod, paidFor, term, notes } = body;

  if (!studentId || !amount) {
    return NextResponse.json({ error: 'studentId and amount are required' }, { status: 400 });
  }

  const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const payment = await db.payment.create({
    data: {
      studentId,
      schoolId: session.user.schoolId,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'Cash',
      receiptNumber,
      paidFor: paidFor || 'Tuition',
      term: term || null,
      academicYear: new Date().getFullYear().toString(),
      notes: notes || null,
      receivedBy: session.user.name || session.user.username,
    },
    include: {
      student: { select: { fullName: true, studentId: true } },
    },
  });

  // Update student fee balance
  await db.student.update({
    where: { id: studentId },
    data: {
      feePaid: { increment: parseFloat(amount) },
      feeBalance: { decrement: parseFloat(amount) },
    },
  });

  return NextResponse.json(payment);
}
