import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { ParentChildrenClient } from '@/components/parent/ParentChildrenClient';
export const dynamic = 'force-dynamic';

export default async function ParentChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'parent') redirect('/login');
  const parent = await db.parent.findFirst({ where: { userId: session.user.id } });
  if (!parent) redirect('/login');
  const parentStudents = await db.parentStudent.findMany({
    where: { parentId: parent.id },
    include: { student: { include: { class: { select: { name: true } }, marks: { orderBy: { createdAt: 'desc' }, take: 5, include: { subject: { select: { name: true } } } }, attendance: { orderBy: { date: 'desc' }, take: 30 } } } },
  });
  return <ParentChildrenClient children={parentStudents.map(ps => ps.student)} />;
}
