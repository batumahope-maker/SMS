import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { ParentFeesClient } from '@/components/parent/ParentFeesClient';
export const dynamic = 'force-dynamic';

export default async function ParentFeesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'parent') redirect('/login');
  const parent = await db.parent.findFirst({ where: { userId: session.user.id } });
  if (!parent) redirect('/login');
  const parentStudents = await db.parentStudent.findMany({
    where: { parentId: parent.id },
    include: { student: { select: { id: true, fullName: true, studentId: true, feePaid: true, feeBalance: true, payments: { orderBy: { paidAt: 'desc' } } } } },
  });
  return <ParentFeesClient children={parentStudents.map(ps => ps.student)} />;
}
