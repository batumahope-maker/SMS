import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { demoDb } from '@/lib/demo-db';
import { isDemoMode } from '@/lib/demo-mode';
import { TeacherHomeworkClient } from '@/components/homework/TeacherHomeworkClient';

export const dynamic = 'force-dynamic';

export default async function TeacherHomeworkPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId } });
  if (!teacher) redirect('/login');

  const scheduleRows = await db.schoolSchedule.findMany({
    where: { teacherId: userId, isActive: true },
    select: { trade: true, level: true, section: true, subject: true },
  });

  const classCombos = [
    ...new Map(
      scheduleRows.map((row) => [
        `${row.trade ?? ''}|${row.level ?? ''}|${row.section ?? ''}`,
        { trade: row.trade ?? '', level: row.level ?? '', section: row.section ?? '' },
      ])
    ).values(),
  ];

  const classes = classCombos.map((combo) => {
    const name = [combo.trade, combo.level, combo.section].filter(Boolean).join(' ') || 'Unassigned';
    return {
      id: name,
      name,
      subjects: [...new Set(scheduleRows.filter((row) => row.trade === combo.trade && row.level === combo.level && row.section === combo.section).map((row) => row.subject).filter(Boolean) as string[])].map((subject) => ({ id: subject, name: subject })),
      _count: { students: 0 },
    };
  });

  const homework = isDemoMode()
    ? await demoDb.homework.findMany({
        where: { teacherId: userId },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      })
    : [];
  const submissions = isDemoMode() && homework.length
    ? await demoDb.homeworkSubmission.findMany({
        where: { homeworkId: { in: homework.map((item) => item.id) } },
        orderBy: { submittedAt: 'desc' },
      })
    : [];

  const submissionsByHomework = new Map<number, typeof submissions>();
  for (const submission of submissions) {
    const key = Number(submission.homeworkId ?? 0);
    submissionsByHomework.set(key, [...(submissionsByHomework.get(key) ?? []), submission]);
  }

  return (
    <TeacherHomeworkClient
      homework={homework.map((item) => ({
        id: String(item.id),
        title: item.title,
        description: item.description,
        dueDate: item.dueDate ?? new Date(0),
        maxMarks: item.maxMarks,
        subject: { name: item.subject ?? '' },
        class: { name: item.className ?? '' },
        _count: { submissions: submissionsByHomework.get(Number(item.id))?.length ?? 0 },
      }))}
      classes={classes}
      teacherId={String(userId)}
    />
  );
}
