import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { TVETClient } from '@/components/tvet/TVETClient';

export const dynamic = 'force-dynamic';

const TVET_LEVELS = ['L3', 'L4', 'L5'];

export default async function TVETPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [classes, students] = await Promise.all([
    db.class.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'active',
        level: { in: TVET_LEVELS },
      },
      include: {
        teacher: { select: { fullName: true } },
        _count: { select: { students: true, subjects: true } },
      },
      orderBy: [{ trade: 'asc' }, { level: 'asc' }, { section: 'asc' }],
    }),
    db.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'active',
        level: { in: TVET_LEVELS },
      },
      select: {
        id: true, fullName: true, studentId: true,
        level: true, section: true, trade: true,
        gender: true, feePaid: true, feeBalance: true,
        class: { select: { name: true } },
      },
      orderBy: [{ trade: 'asc' }, { level: 'asc' }, { fullName: 'asc' }],
    }),
  ]);

  // Group by trade
  const tradeMap: Record<string, typeof classes> = {};
  classes.forEach(c => {
    const trade = c.trade || 'General';
    tradeMap[trade] = tradeMap[trade] || [];
    tradeMap[trade].push(c);
  });

  return <TVETClient classes={classes} students={students} tradeMap={tradeMap} />;
}
