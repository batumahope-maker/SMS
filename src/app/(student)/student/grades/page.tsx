import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gradeFor } from '@/lib/format';
import { StudentGradesClient } from '@/components/student/StudentGradesClient';

export const dynamic = 'force-dynamic';

export default async function StudentGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const student = await db.student.findFirst({
    where: { userId },
    include: { user: { select: { fullName: true, username: true } } },
  });
  if (!student) redirect('/login');

  // Live `marks`: subject (free text), term, year, marks, max_marks.
  // There is no grade, exam_type or subjects table, so those fields are
  // derived here rather than invented in the database.
  const rows = await db.mark.findMany({
    where: { studentId: userId },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });

  const marks = rows.map((row) => {
    const score = Number(row.marks ?? 0);
    const max = Number(row.maxMarks ?? 100);
    return {
      id: String(row.id),
      marks: score,
      grade: gradeFor(score, max),
      term: row.term ?? '',
      examType: row.term ?? '',
      academicYear: row.year != null ? String(row.year) : '',
      subject: { name: row.subject ?? 'Unspecified subject', code: null },
    };
  });

  return (
    <StudentGradesClient
      marks={marks}
      studentName={student.user?.fullName ?? student.user?.username ?? 'Student'}
    />
  );
}
