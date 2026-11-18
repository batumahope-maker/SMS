import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { StudentFeesClient } from '@/components/student/StudentFeesClient';

export const dynamic = 'force-dynamic';

export default async function StudentFeesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const student = await db.student.findFirst({
    where: { userId },
    include: { user: { select: { fullName: true, username: true } } },
  });
  if (!student) redirect('/login');

  // payments.student_id references users.id. Live columns are amount,
  // payment_date, payment_method, reference — there is no receipt_number,
  // paid_for or term column, so those are presented as neutral labels.
  const rows = await db.payment.findMany({
    where: { studentId: userId },
    orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
    take: 200,
  });

  const payments = rows.map((row) => ({
    id: String(row.id),
    amount: Number(row.amount ?? 0),
    paymentMethod: row.paymentMethod ?? 'Unspecified',
    receiptNumber: row.reference ?? '—',
    paidFor: 'School fees',
    term: null,
    paidAt: row.paymentDate ?? row.createdAt ?? new Date(0),
  }));

  return (
    <StudentFeesClient
      payments={payments}
      feePaid={Number(student.feePaid ?? 0)}
      feeBalance={Number(student.feeBalance ?? 0)}
      studentName={student.user?.fullName ?? student.user?.username ?? 'Student'}
    />
  );
}
