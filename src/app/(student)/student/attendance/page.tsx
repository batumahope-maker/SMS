import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { StudentAttendanceClient } from '@/components/student/StudentAttendanceClient';
export const dynamic = 'force-dynamic';

export default async function StudentAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');
  const student = await db.student.findFirst({ where: { userId: session.user.id } });
  if (!student) redirect('/login');
  const records = await db.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { date: 'desc' },
    take: 200,
  });
  const summary = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length,
  };
  return <StudentAttendanceClient records={records} summary={summary} />;
}
