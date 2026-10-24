import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { TeacherClassesClient } from '@/components/classes/TeacherClassesClient';
export const dynamic = 'force-dynamic';

export default async function TeacherClassesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) redirect('/login');

  const classes = await db.class.findMany({
    where: { teacherId: teacher.id, status: 'active' },
    include: {
      students: {
        where: { status: 'active' },
        select: { id: true, fullName: true, studentId: true, gender: true, feePaid: true, feeBalance: true },
        orderBy: { fullName: 'asc' },
      },
      subjects: { select: { id: true, name: true, code: true } },
      schedules: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
    orderBy: { name: 'asc' },
  });

  return <TeacherClassesClient classes={classes} teacherName={teacher.fullName} />;
}
