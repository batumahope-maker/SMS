import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { demoDb } from '@/lib/demo-db';
import { isDemoMode } from '@/lib/demo-mode';
import { LessonPlansClient } from '@/components/lesson-plans/LessonPlansClient';

export const dynamic = 'force-dynamic';

export default async function TeacherLessonPlansPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId } });
  if (!teacher) redirect('/login');

  const plans = isDemoMode()
    ? await demoDb.lessonPlan.findMany({
        where: { teacherId: userId },
        orderBy: [{ date: 'desc' }],
        take: 200,
      })
    : [];

  const subjects = [...new Set(plans.map((plan) => plan.subject).filter(Boolean) as string[])].map((name) => ({
    id: name,
    name,
  }));

  return (
    <LessonPlansClient
      plans={plans.map((plan) => ({
        id: String(plan.id),
        title: plan.title,
        objectives: plan.objectives,
        content: plan.content,
        date: plan.date ?? new Date(0),
        duration: plan.duration,
        subject: { name: plan.subject ?? '' },
      }))}
      subjects={subjects}
      teacherId={String(userId)}
    />
  );
}
