import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { SMSClient } from '@/components/sms/SMSClient';
export const dynamic = 'force-dynamic';

export default async function SMSPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [classes, absentToday] = await Promise.all([
    db.class.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      select: { id: true, name: true, _count: { select: { students: true } } },
      orderBy: { name: 'asc' },
    }),
    db.attendance.count({
      where: {
        student: { schoolId: session.user.schoolId },
        status: 'absent',
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  const studentsWithPhone = await db.student.count({
    where: { schoolId: session.user.schoolId, status: 'active', guardianPhone: { not: null } },
  });

  const feeDefaulters = await db.student.count({
    where: { schoolId: session.user.schoolId, status: 'active', feeBalance: { gt: 0 } },
  });

  return (
    <SMSClient
      classes={classes}
      stats={{ absentToday, studentsWithPhone, feeDefaulters }}
      configured={!!(process.env.AT_USERNAME && process.env.AT_API_KEY)}
    />
  );
}
