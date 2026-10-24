import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { TeacherMarksClient } from '@/components/marks/TeacherMarksClient';
export const dynamic = 'force-dynamic';

export default async function TeacherMarksPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) redirect('/login');

  const [classes, recentMarks] = await Promise.all([
    db.class.findMany({
      where: { teacherId: teacher.id, status: 'active' },
      include: {
        students: { where: { status: 'active' }, select: { id: true, fullName: true, studentId: true }, orderBy: { fullName: 'asc' } },
        subjects: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    }),
    db.mark.findMany({
      where: { teacherId: teacher.id },
      include: { student: { select: { fullName: true, studentId: true } }, subject: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return <TeacherMarksClient classes={classes} recentMarks={recentMarks} teacherId={teacher.id} />;
}
