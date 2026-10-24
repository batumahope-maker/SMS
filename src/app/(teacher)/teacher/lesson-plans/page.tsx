import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { LessonPlansClient } from '@/components/lesson-plans/LessonPlansClient';
export const dynamic = 'force-dynamic';

export default async function LessonPlansPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) redirect('/login');

  const [plans, subjects] = await Promise.all([
    db.lessonPlan.findMany({
      where: { teacherId: teacher.id },
      include: { subject: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    db.subject.findMany({
      where: { teacherId: teacher.id, status: 'active' },
      select: { id: true, name: true },
    }),
  ]);

  return <LessonPlansClient plans={plans} subjects={subjects} teacherId={teacher.id} />;
}
