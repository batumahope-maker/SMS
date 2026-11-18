import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { StudentDashboardClient } from '@/components/dashboards/StudentDashboard';

export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function timeLabel(value: Date | null): string {
  if (!value) return '';
  return value.toISOString().slice(11, 16);
}

function gradeFor(score: number, max: number): string | null {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return null;
  const pct = (score / max) * 100;
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'student') {
    redirect('/login');
  }

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const student = await db.student.findFirst({
    where: { userId },
    include: { user: { select: { fullName: true, username: true } } },
  });

  if (!student) redirect('/login');

  const classCombination = [student.trade, student.level, student.section]
    .filter(Boolean)
    .join(' ');

  const scheduleRows = await db.schoolSchedule.findMany({
    where: {
      trade: student.trade ?? undefined,
      level: student.level ?? undefined,
      section: student.section ?? undefined,
      isActive: true,
      dayOfWeek: WEEKDAYS[new Date().getDay()],
    },
    orderBy: { startTime: 'asc' },
  });

  // IMPORTANT: marks.student_id and attendance.student_id reference users.id
  // (declared FK), not students.id. The session id is the users.id.
  const markRows = await db.mark.findMany({
    where: { studentId: userId },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  const attendanceRows = await db.attendance.findMany({
    where: { studentId: userId },
    orderBy: { date: 'desc' },
    take: 30,
  });

  const paymentRows = await db.payment.findMany({
    where: { studentId: userId },
    orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
    take: 5,
  });

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      content: true,
      priority: true,
      createdAt: true,
      targetAudience: true,
    },
  });

  const visibleAnnouncements = announcements.filter((a) => {
    const audience = String(a.targetAudience ?? 'all').trim().toLowerCase();
    return audience === '' || audience === 'all' || audience === 'students' || audience === 'student';
  });

  const attendanceSummary = {
    present: attendanceRows.filter(
      (a) => String(a.status ?? '').toLowerCase() === 'present'
    ).length,
    absent: attendanceRows.filter((a) => String(a.status ?? '').toLowerCase() === 'absent')
      .length,
    late: attendanceRows.filter((a) => String(a.status ?? '').toLowerCase() === 'late').length,
    excused: 0,
  };

  const totalPaid = paymentRows.reduce((sum, p) => sum + toNumber(p.amount), 0);

  const stats = {
    student: {
      id: String(student.id),
      studentId: student.studentId ?? '',
      fullName: student.user?.fullName ?? student.user?.username ?? 'Student',
      trade: student.trade,
      level: student.level,
      section: student.section,
      class: classCombination || null,
      feePaid: toNumber(student.feePaid),
      feeBalance: toNumber(student.feeBalance),
    },
    todaySchedule: scheduleRows.map((row) => ({
      id: String(row.id),
      startTime: timeLabel(row.startTime),
      endTime: timeLabel(row.endTime),
      subjectName: row.subject ?? 'Lesson',
      teacherName: null,
      room: row.roomNumber,
    })),
    recentMarks: markRows.map((row) => ({
      id: String(row.id),
      marks: toNumber(row.marks),
      grade: gradeFor(toNumber(row.marks), toNumber(row.maxMarks)),
      term: row.term ?? '',
      examType: row.term ?? '',
      subject: { name: row.subject ?? '', code: null },
    })),
    attendanceSummary,
    // No homework table exists in the live schema.
    pendingHomework: [],
    recentPayments: paymentRows.map((p) => ({
      id: String(p.id),
      amount: toNumber(p.amount),
      receiptNumber: p.reference ?? 'No reference',
      paidAt: p.paymentDate ?? p.createdAt,
      paidFor: null,
    })),
    announcements: visibleAnnouncements.map((a) => ({
      id: String(a.id),
      title: a.title,
      content: a.content ?? '',
      priority: String(a.priority ?? 'Normal'),
      createdAt: a.createdAt,
    })),
    totalPaid,
  };

  return <StudentDashboardClient stats={stats} />;
}
