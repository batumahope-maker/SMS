import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';

export const dynamic = 'force-dynamic';

type CountRow = { total: bigint | number };
type SumRow = { total: unknown };

type PaymentRow = {
  id: number;
  amount: unknown;
  reference: string | null;
  payment_date: Date | null;
  full_name: string | null;
  username: string | null;
  student_id: string | null;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const [
    studentCount,
    teacherCount,
    classRows,
    subjectRows,
    paymentTotalRows,
    feeBalanceRows,
    recentPaymentRows,
    recentAnnouncements,
    upcomingEvents,
    todayAttendance,
    genderRows,
  ] = await Promise.all([
    db.student.count(),

    db.teacher.count(),

    // The live schema has no `classes` table. A class is the distinct
    // (trade, level, section) combination carried on each student row.
    db.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM (
        SELECT DISTINCT trade, level, section
        FROM students
        WHERE (trade IS NOT NULL AND trade <> '')
           OR (level IS NOT NULL AND level <> '')
           OR (section IS NOT NULL AND section <> '')
      ) AS class_combinations
    `,

    db.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS total FROM (
        SELECT subject FROM marks WHERE subject IS NOT NULL AND subject <> ''
        UNION
        SELECT subject FROM school_schedule WHERE subject IS NOT NULL AND subject <> ''
      ) AS subject_names
    `,

    db.$queryRaw<SumRow[]>`SELECT COALESCE(SUM(amount), 0) AS total FROM payments`,

    db.$queryRaw<SumRow[]>`SELECT COALESCE(SUM(fee_balance), 0) AS total FROM students`,

    // payments.student_id references users.id (declared FK), not students.id.
    db.$queryRaw<PaymentRow[]>`
      SELECT
        p.id,
        p.amount,
        p.reference,
        p.payment_date,
        u.full_name,
        u.username,
        s.student_id
      FROM payments p
      LEFT JOIN users u ON u.id = p.student_id
      LEFT JOIN students s ON s.user_id = u.id
      ORDER BY p.payment_date DESC, p.id DESC
      LIMIT 5
    `,

    db.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, content: true, priority: true, createdAt: true },
    }),

    db.schoolEvent.findMany({
      where: { isActive: true, eventDate: { gte: startOfToday() } },
      orderBy: { eventDate: 'asc' },
      take: 5,
      select: { id: true, title: true, eventDate: true, location: true },
    }),

    db.attendance.findMany({
      where: { date: startOfToday() },
      select: { status: true },
    }),

    db.student.groupBy({
      by: ['gender'],
      _count: { _all: true },
    }),
  ]);

  const totalAttendance = todayAttendance.length;
  const presentCount = todayAttendance.filter(
    (row) => String(row.status ?? '').trim().toLowerCase() === 'present'
  ).length;

  const attendanceRate =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const genderCount = (name: string) =>
    genderRows
      .filter((row) => String(row.gender ?? '').trim().toLowerCase() === name)
      .reduce((sum, row) => sum + row._count._all, 0);

  const totalMale = genderCount('male');
  const totalFemale = genderCount('female');
  const genderTotal = totalMale + totalFemale;

  const stats = {
    totalStudents: studentCount,
    totalTeachers: teacherCount,
    totalClasses: toNumber(classRows[0]?.total),
    totalSubjects: toNumber(subjectRows[0]?.total),
    totalFeesCollected: toNumber(paymentTotalRows[0]?.total),
    totalFeeBalance: toNumber(feeBalanceRows[0]?.total),
    attendanceRate,

    genderDistribution: {
      male: genderTotal > 0 ? Math.round((totalMale / genderTotal) * 100) : 0,
      female: genderTotal > 0 ? Math.round((totalFemale / genderTotal) * 100) : 0,
    },

    recentPayments: recentPaymentRows.map((payment) => ({
      id: String(payment.id),
      amount: toNumber(payment.amount),
      receiptNumber: payment.reference ?? 'No reference',
      paidAt: payment.payment_date ?? new Date(0),
      student: {
        fullName: payment.full_name ?? payment.username ?? 'Unknown student',
        studentId: payment.student_id ?? payment.username ?? 'N/A',
      },
    })),

    recentAnnouncements: recentAnnouncements.map((announcement) => ({
      id: String(announcement.id),
      title: announcement.title,
      content: announcement.content ?? '',
      priority: String(announcement.priority ?? 'Normal'),
      createdAt: announcement.createdAt,
    })),

    upcomingEvents: upcomingEvents.map((event) => ({
      id: String(event.id),
      title: event.title ?? 'Untitled event',
      date: event.eventDate ?? new Date(0),
      location: event.location,
    })),
  };

  return <AdminDashboard stats={stats} />;
}
