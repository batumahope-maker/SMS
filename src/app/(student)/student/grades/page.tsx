import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { StudentGradesClient } from '@/components/student/StudentGradesClient';
export const dynamic = 'force-dynamic';

export default async function StudentGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');

  const student = await db.student.findFirst({ where: { userId: session.user.id } });
  if (!student) redirect('/login');

  const marks = await db.mark.findMany({
    where: { studentId: student.id },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: [{ term: 'asc' }, { createdAt: 'desc' }],
  });

  return <StudentGradesClient marks={marks} studentName={student.fullName} studentId={student.id} />;
}
