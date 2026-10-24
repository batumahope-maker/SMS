import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { StudentHomeworkClient } from '@/components/student/StudentHomeworkClient';
export const dynamic = 'force-dynamic';

export default async function StudentHomeworkPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');
  const student = await db.student.findFirst({ where: { userId: session.user.id } });
  if (!student) redirect('/login');
  const homework = await db.homework.findMany({
    where: { classId: student.classId || undefined },
    include: {
      subject: { select: { name: true } },
      teacher: { select: { fullName: true } },
      submissions: { where: { studentId: student.id } },
    },
    orderBy: { dueDate: 'asc' },
  });
  return <StudentHomeworkClient homework={homework} studentId={student.id} />;
}
