import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { REBClient } from '@/components/reb/REBClient';

export const dynamic = 'force-dynamic';

const OLEVEL = ['S1', 'S2', 'S3'];
const ALEVEL = ['S4', 'S5', 'S6'];

export default async function REBPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [classes, students] = await Promise.all([
    db.class.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'active',
        level: { in: [...OLEVEL, ...ALEVEL] },
      },
      include: {
        teacher: { select: { fullName: true } },
        _count: { select: { students: true, subjects: true } },
      },
      orderBy: [{ level: 'asc' }, { section: 'asc' }],
    }),
    db.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'active',
        level: { in: [...OLEVEL, ...ALEVEL] },
      },
      select: {
        id: true, fullName: true, studentId: true,
        level: true, section: true, combination: true,
        gender: true, feePaid: true, feeBalance: true,
        class: { select: { name: true } },
      },
      orderBy: [{ level: 'asc' }, { fullName: 'asc' }],
    }),
  ]);

  const oLevelClasses = classes.filter(c => OLEVEL.includes(c.level));
  const aLevelClasses = classes.filter(c => ALEVEL.includes(c.level));
  const oLevelStudents = students.filter(s => OLEVEL.includes(s.level));
  const aLevelStudents = students.filter(s => ALEVEL.includes(s.level));

  return (
    <REBClient
      oLevelClasses={oLevelClasses}
      aLevelClasses={aLevelClasses}
      oLevelStudents={oLevelStudents}
      aLevelStudents={aLevelStudents}
    />
  );
}
