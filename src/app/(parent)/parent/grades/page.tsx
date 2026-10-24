import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { ParentGradesClient } from '@/components/parent/ParentGradesClient';
export const dynamic = 'force-dynamic';

export default async function ParentGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'parent') redirect('/login');
  const parent = await db.parent.findFirst({ where: { userId: session.user.id } });
  if (!parent) redirect('/login');

  const parentStudents = await db.parentStudent.findMany({
    where: { parentId: parent.id },
    include: {
      student: {
        select: {
          id: true, fullName: true, studentId: true,
          class: { select: { name: true } },
          marks: { include: { subject: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });

  const children = parentStudents.map(ps => ({
    id: ps.student.id,
    fullName: ps.student.fullName,
    studentId: ps.student.studentId,
    class: ps.student.class?.name || null,
  }));

  const marksByChild: Record<string, typeof parentStudents[0]['student']['marks']> = {};
  parentStudents.forEach(ps => { marksByChild[ps.student.id] = ps.student.marks; });

  return <ParentGradesClient children={children} marksByChild={marksByChild} />;
}
