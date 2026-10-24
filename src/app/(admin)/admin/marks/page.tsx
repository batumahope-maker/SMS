import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { MarksClient } from '@/components/marks/MarksClient';

export const dynamic = 'force-dynamic';

export default async function MarksPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [marks, students, subjects, agg] = await Promise.all([
    db.mark.findMany({
      where: { student: { schoolId: session.user.schoolId } },
      select: {
        id: true, marks: true, grade: true, term: true, examType: true, academicYear: true,
        student: { select: { fullName: true, studentId: true } },
        subject: { select: { name: true, code: true } },
        teacher: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    db.student.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      select: { id: true, fullName: true, studentId: true },
      orderBy: { fullName: 'asc' },
    }),
    db.subject.findMany({
      where: { schoolId: session.user.schoolId, status: 'active' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
    db.mark.aggregate({
      where: { student: { schoolId: session.user.schoolId } },
      _avg: { marks: true },
      _max: { marks: true },
      _min: { marks: true },
      _count: { marks: true },
    }),
  ]);

  const stats = {
    total: agg._count.marks,
    avg: Math.round(agg._avg.marks || 0),
    highest: Math.round(agg._max.marks || 0),
    lowest: Math.round(agg._min.marks || 0),
  };

  return <MarksClient marks={marks} students={students} subjects={subjects} stats={stats} />;
}
