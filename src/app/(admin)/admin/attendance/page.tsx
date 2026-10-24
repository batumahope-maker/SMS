import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { AttendanceClient } from '@/components/attendance/AttendanceClient';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const thirtyDaysAgo = subDays(new Date(), 30);

  const [records, classes, counts] = await Promise.all([
    db.attendance.findMany({
      where: {
        student: { schoolId: session.user.schoolId },
        date: { gte: thirtyDaysAgo },
      },
      select: {
        id: true, date: true, status: true, remarks: true,
        student: { select: { fullName: true, studentId: true } },
        class: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    }),
    db.class.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.attendance.groupBy({
      by: ['status'],
      where: { student: { schoolId: session.user.schoolId }, date: { gte: thirtyDaysAgo } },
      _count: { status: true },
    }),
  ]);

  const summary = {
    present: counts.find(c => c.status === 'present')?._count.status || 0,
    absent: counts.find(c => c.status === 'absent')?._count.status || 0,
    late: counts.find(c => c.status === 'late')?._count.status || 0,
    excused: counts.find(c => c.status === 'excused')?._count.status || 0,
    total: counts.reduce((s, c) => s + c._count.status, 0),
  };

  return <AttendanceClient records={records} classes={classes} summary={summary} />;
}
