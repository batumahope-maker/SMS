import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { demoDb } from '@/lib/demo-db';
import { isDemoMode } from '@/lib/demo-mode';
import { StudentHomeworkClient } from '@/components/student/StudentHomeworkClient';

export const dynamic = 'force-dynamic';

export default async function StudentHomeworkPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const student = await db.student.findFirst({ where: { userId } });
  if (!student) redirect('/login');

  const teacher = await db.teacher.findFirst({
    select: { user: { select: { fullName: true } } },
  });

  const homework = isDemoMode()
    ? await demoDb.homework.findMany({
        where: { studentId: userId },
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
    <StudentHomeworkClient
      studentId={String(student.id)}
      homework={homework.map((item) => ({
        id: String(item.id),
        title: item.title,
        description: item.description,
        dueDate: item.dueDate ?? new Date(0),
        maxMarks: item.maxMarks,
        subject: { name: item.subject ?? '' },
        teacher: { fullName: teacher?.user?.fullName ?? 'Demo Teacher' },
        submissions: (submissionsByHomework.get(Number(item.id)) ?? []).map((submission) => ({
          id: String(submission.id),
          submittedAt: submission.submittedAt ?? new Date(0),
          marks: submission.marks,
        })),
      }))}
    />
  );
}
