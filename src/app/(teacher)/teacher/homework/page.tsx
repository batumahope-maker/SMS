import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { TeacherHomeworkClient } from '@/components/homework/TeacherHomeworkClient';
export const dynamic = 'force-dynamic';

export default async function TeacherHomeworkPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) redirect('/login');

  const [homework, classes] = await Promise.all([
    db.homework.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.class.findMany({
      where: { teacherId: teacher.id, status: 'active' },
      include: { subjects: { select: { id: true, name: true } }, _count: { select: { students: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return <TeacherHomeworkClient homework={homework} classes={classes} teacherId={teacher.id} />;
}
