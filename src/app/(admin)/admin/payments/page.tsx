import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { PaymentsClient } from '@/components/payments/PaymentsClient';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [payments, students, totals] = await Promise.all([
    db.payment.findMany({
      where: { schoolId: session.user.schoolId },
      select: {
        id: true, amount: true, paymentMethod: true, receiptNumber: true,
        paidFor: true, term: true, paidAt: true,
        student: { select: { fullName: true, studentId: true, class: { select: { name: true } } } },
      },
      orderBy: { paidAt: 'desc' },
      take: 100,
    }),
    db.student.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      select: { id: true, fullName: true, studentId: true },
      orderBy: { fullName: 'asc' },
    }),
    db.payment.aggregate({
      where: { schoolId: session.user.schoolId },
      _sum: { amount: true },
    }),
  ]);

  const now = new Date();
  const thisMonth = payments
    .filter(p => {
      const d = new Date(p.paidAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, p) => s + p.amount, 0);

  return (
    <PaymentsClient
      payments={payments}
      students={students}
      totalCollected={totals._sum.amount || 0}
      thisMonth={thisMonth}
    />
  );
}
