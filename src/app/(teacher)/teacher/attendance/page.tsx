import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { TeacherAttendanceClient } from '@/components/attendance/TeacherAttendanceClient';
export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) redirect('/login');

  const classes = await db.class.findMany({
    where: { teacherId: teacher.id, status: 'active' },
    include: { students: { where: { status: 'active' }, select: { id: true, fullName: true, studentId: true }, orderBy: { fullName: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  const recentAttendance = await db.attendance.findMany({
    where: { markedBy: teacher.id },
    include: { student: { select: { fullName: true, studentId: true } } },
    orderBy: { date: 'desc' },
    take: 50,
  });

  return <TeacherAttendanceClient classes={classes} recentAttendance={recentAttendance} teacherId={teacher.id} />;
}
