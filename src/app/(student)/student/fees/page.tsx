import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { StudentFeesClient } from '@/components/student/StudentFeesClient';
export const dynamic = 'force-dynamic';

export default async function StudentFeesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');
  const student = await db.student.findFirst({ where: { userId: session.user.id } });
  if (!student) redirect('/login');
  const payments = await db.payment.findMany({
    where: { studentId: student.id },
    orderBy: { paidAt: 'desc' },
  });
  return <StudentFeesClient payments={payments} feePaid={student.feePaid} feeBalance={student.feeBalance} studentName={student.fullName} />;
}
