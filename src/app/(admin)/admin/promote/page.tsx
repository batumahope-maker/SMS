import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { PromoteStudentsClient } from '@/components/promote/PromoteStudentsClient';
export const dynamic = 'force-dynamic';

export default async function PromotePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [students, classes] = await Promise.all([
    db.student.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      include: {
        class: { select: { name: true, level: true, trade: true } },
        marks: { select: { marks: true } },
      },
      orderBy: [{ class: { name: 'asc' } }, { fullName: 'asc' }],
    }),
    db.class.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const studentsWithStats = students.map(s => {
    const avg = s.marks.length > 0
      ? Math.round(s.marks.reduce((a, m) => a + m.marks, 0) / s.marks.length) : null;
    return {
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      currentClass: s.class?.name || `${s.trade} ${s.level}${s.section}`,
      currentLevel: s.level,
      currentTrade: s.trade,
      currentSection: s.section,
      average: avg,
      passed: avg !== null ? avg >= 50 : null,
      recommendation: avg === null ? 'no_data' : avg >= 50 ? 'promote' : 'repeat',
    };
  });

  const previewData = {
    total: studentsWithStats.length,
    toPromote: studentsWithStats.filter(s => s.recommendation === 'promote').length,
    toRepeat: studentsWithStats.filter(s => s.recommendation === 'repeat').length,
    noData: studentsWithStats.filter(s => s.recommendation === 'no_data').length,
  };

  return <PromoteStudentsClient students={studentsWithStats} classes={classes} previewData={previewData} />;
}
