import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { StudentAttendanceClient } from '@/components/student/StudentAttendanceClient';

export const dynamic = 'force-dynamic';

export default async function StudentAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const student = await db.student.findFirst({ where: { userId } });
  if (!student) redirect('/login');

  // attendance.student_id references users.id. Status values in the live
  // enum are Present / Absent / Late (capitalised); the client expects
  // lowercase keys, so normalise on read without touching stored data.
  const rows = await db.attendance.findMany({
    where: { studentId: userId },
    orderBy: { date: 'desc' },
    take: 200,
  });

  const records = rows.map((row) => ({
    id: String(row.id),
    date: row.date ?? new Date(0),
    status: String(row.status ?? '').trim().toLowerCase(),
    remarks: row.notes,
  }));

  const summary = {
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    excused: 0,
  };

  return <StudentAttendanceClient records={records} summary={summary} />;
}
