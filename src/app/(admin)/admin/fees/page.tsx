import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { FeesClient } from '@/components/fees/FeesClient';
export const dynamic = 'force-dynamic';

export default async function FeesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch fee structures
  const feeStructures = await db.feeStructure.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch recent payments
  const recentPayments = await db.payment.findMany({
    where: { schoolId: session.user.schoolId },
    take: 20,
    orderBy: { paidAt: 'desc' },
    include: {
      student: {
        select: { fullName: true, studentId: true, class: { select: { name: true } } },
      },
    },
  });

  // Calculate totals
  const totalCollected = await db.payment.aggregate({
    where: { schoolId: session.user.schoolId },
    _sum: { amount: true },
  });

  const totalBalance = await db.student.aggregate({
    where: { schoolId: session.user.schoolId, status: 'active' },
    _sum: { feeBalance: true },
  });

  // Get fee defaulters (students with balance > 0)
  const defaulters = await db.student.findMany({
    where: {
      schoolId: session.user.schoolId,
      status: 'active',
      feeBalance: { gt: 0 },
    },
    take: 10,
    orderBy: { feeBalance: 'desc' },
    select: {
      id: true,
      studentId: true,
      fullName: true,
      feeBalance: true,
      feePaid: true,
      class: { select: { name: true } },
    },
  });

  return (
    <FeesClient
      feeStructures={feeStructures}
      recentPayments={recentPayments}
      totalCollected={totalCollected._sum.amount || 0}
      totalBalance={totalBalance._sum.feeBalance || 0}
      defaulters={defaulters}
    />
  );
}
