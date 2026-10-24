import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { ReportsClient } from '@/components/reports/ReportsClient';
import { format, subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');
  const schoolId = session.user.schoolId;

  const [students, teachers, classes, subjects, allMarks, allAttendance, allPayments] = await Promise.all([
    db.student.count({ where: { schoolId, status: 'active' } }),
    db.teacher.count({ where: { schoolId, status: 'active' } }),
    db.class.count({ where: { schoolId, status: 'active' } }),
    db.subject.count({ where: { schoolId, status: 'active' } }),
    db.mark.findMany({ where: { student: { schoolId } }, select: { marks: true, grade: true, studentId: true, student: { select: { fullName: true, studentId: true, class: { select: { name: true } } } } } }),
    db.attendance.findMany({ where: { student: { schoolId }, date: { gte: subDays(new Date(), 30) } }, select: { date: true, status: true } }),
    db.payment.findMany({ where: { schoolId }, select: { amount: true, paidAt: true } }),
  ]);

  // Grade distribution
  const gradeCounts: Record<string, number> = {};
  allMarks.forEach(m => {
    const g = m.grade || (m.marks >= 90 ? 'A+' : m.marks >= 80 ? 'A' : m.marks >= 70 ? 'B' : m.marks >= 60 ? 'C' : m.marks >= 50 ? 'D' : 'F');
    gradeCounts[g] = (gradeCounts[g] || 0) + 1;
  });
  const gradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count })).sort((a, b) => b.count - a.count);

  // Attendance trend
  const attByDate: Record<string, { present: number; total: number }> = {};
  allAttendance.forEach(a => {
    const d = format(new Date(a.date), 'MM/dd');
    if (!attByDate[d]) attByDate[d] = { present: 0, total: 0 };
    attByDate[d].total++;
    if (a.status === 'present') attByDate[d].present++;
  });
  const attendanceData = Object.entries(attByDate).slice(-14).map(([date, v]) => ({
    date, present: v.present, absent: v.total - v.present, rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));

  // Fee data by month
  const feeByMonth: Record<string, number> = {};
  allPayments.forEach(p => {
    const m = format(new Date(p.paidAt), 'MMM');
    feeByMonth[m] = (feeByMonth[m] || 0) + p.amount;
  });
  const feeData = Object.entries(feeByMonth).slice(-6).map(([month, collected]) => ({ month, collected, balance: 0 }));

  // Top students
  const studentMarks: Record<string, { marks: number[]; name: string; id: string; class: string }> = {};
  allMarks.forEach(m => {
    if (!studentMarks[m.studentId]) studentMarks[m.studentId] = { marks: [], name: m.student.fullName, id: m.student.studentId, class: m.student.class?.name || '—' };
    studentMarks[m.studentId].marks.push(m.marks);
  });
  const topStudents = Object.values(studentMarks)
    .map(s => ({ name: s.name, id: s.id, class: s.class, avg: Math.round(s.marks.reduce((a, b) => a + b, 0) / s.marks.length) }))
    .sort((a, b) => b.avg - a.avg).slice(0, 10);

  // Subject performance
  const subjectMarks = await db.mark.groupBy({
    by: ['subjectId'],
    _avg: { marks: true },
    _count: { marks: true },
    where: { student: { schoolId } },
  });
  const subjectIds = subjectMarks.map(s => s.subjectId);
  const subjectNames = await db.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } });
  const nameMap = Object.fromEntries(subjectNames.map(s => [s.id, s.name]));
  const subjectPerformance = subjectMarks.map(s => ({
    subject: (nameMap[s.subjectId] || 'Unknown').substring(0, 15),
    avg: Math.round(s._avg.marks || 0),
    entries: s._count.marks,
  })).sort((a, b) => b.avg - a.avg).slice(0, 8);

  return (
    <ReportsClient
      overview={{ students, teachers, classes, subjects }}
      feeData={feeData}
      attendanceData={attendanceData}
      gradeDistribution={gradeDistribution}
      topStudents={topStudents}
      subjectPerformance={subjectPerformance}
    />
  );
}
