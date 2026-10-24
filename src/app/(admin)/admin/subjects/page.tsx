import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { SubjectsPageClient } from '@/components/subjects/SubjectsClient';
export const dynamic = 'force-dynamic';

export default async function SubjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [subjects, classes, teachers] = await Promise.all([
    db.subject.findMany({
      where: { schoolId: session.user.schoolId },
      include: { class: { select: { name: true } }, teacher: { select: { fullName: true } }, _count: { select: { marks: true } } },
      orderBy: { name: 'asc' },
    }),
    db.class.findMany({ where: { schoolId: session.user.schoolId, status: 'active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.teacher.findMany({ where: { schoolId: session.user.schoolId, status: 'active' }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }),
  ]);

  return <SubjectsPageClient subjects={subjects} classes={classes} teachers={teachers} />;
}
