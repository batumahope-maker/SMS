import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { ParentAttendanceClient } from '@/components/parent/ParentAttendanceClient';
export const dynamic = 'force-dynamic';

export default async function ParentAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'parent') redirect('/login');
  const parent = await db.parent.findFirst({ where: { userId: session.user.id } });
  if (!parent) redirect('/login');

  const parentStudents = await db.parentStudent.findMany({
    where: { parentId: parent.id },
    include: {
      student: {
        select: {
          id: true, fullName: true, studentId: true,
          attendance: { orderBy: { date: 'desc' }, take: 90 },
        },
      },
    },
  });

  const children = parentStudents.map(ps => ({
    id: ps.student.id, fullName: ps.student.fullName, studentId: ps.student.studentId,
  }));
  const attendanceByChild: Record<string, typeof parentStudents[0]['student']['attendance']> = {};
  parentStudents.forEach(ps => { attendanceByChild[ps.student.id] = ps.student.attendance; });

  return <ParentAttendanceClient children={children} attendanceByChild={attendanceByChild} />;
}
