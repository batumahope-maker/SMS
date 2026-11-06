
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';

export const dynamic = 'force-dynamic';

type PaymentRow = {
  id: number;
  amount: number;
  receiptNumber: string | null;
  paidAt: Date;
  fullName: string;
  studentId: string;
};

type AnnouncementRow = {
  id: number;
  title: string;
  content: string;
  priority: string;
  createdAt: Date;
};

type EventRow = {
  id: number;
  title: string;
  date: Date;
  location: string | null;
};

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const [
    studentCount,
    teacherCount,
    classCount,
    subjectCount,
    paymentTotal,
    recentPayments,
    recentAnnouncements,
    upcomingEvents,
    attendanceRows,
    genderRows,
  ] = await Promise.all([
    db.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total
      FROM public.students s
      INNER JOIN public.users u ON u.id = s.user_id
      WHERE LOWER(TRIM(COALESCE(u.status, ''))) = 'active'
    `,

    db.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total
      FROM public.users
      WHERE LOWER(TRIM(COALESCE(role, ''))) = 'teacher'
        AND LOWER(TRIM(COALESCE(status, ''))) = 'active'
    `,

    db.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT DISTINCT
          COALESCE(class_trade, trade, '') AS trade_name,
          COALESCE(class_level, level, '') AS level_name,
          COALESCE(class_section, section, '') AS section_name
        FROM public.school_schedule
        WHERE COALESCE(class_trade, trade, '') <> ''
           OR COALESCE(class_level, level, '') <> ''
           OR COALESCE(class_section, section, '') <> ''
      ) AS school_classes
    `,

    db.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(DISTINCT subject)::int AS total
      FROM public.school_schedule
      WHERE subject IS NOT NULL AND TRIM(subject) <> ''
    `,

    db.$queryRaw<Array<{ total: number }>>`
      SELECT COALESCE(SUM(amount), 0)::float8 AS total
      FROM public.payments
    `,

    db.$queryRaw<PaymentRow[]>`
      SELECT
        p.id,
        p.amount::float8 AS amount,
        p.receipt_number AS "receiptNumber",
        p.payment_date AS "paidAt",
        COALESCE(u.full_name, u.username, 'Unknown student') AS "fullName",
        COALESCE(u.username, 'N/A') AS "studentId"
      FROM public.payments p
      LEFT JOIN public.students s ON s.id = p.student_id
      LEFT JOIN public.users u ON u.id = s.user_id
      ORDER BY p.payment_date DESC NULLS LAST, p.id DESC
      LIMIT 5
    `,

    db.$queryRaw<AnnouncementRow[]>`
      SELECT
        id,
        title,
        content,
        priority,
        created_at AS "createdAt"
      FROM public.announcements
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT 3
    `,

    db.$queryRaw<EventRow[]>`
      SELECT
        id,
        title,
        event_date AS date,
        location
      FROM public.school_events
      WHERE is_active = TRUE
        AND event_date >= CURRENT_DATE
      ORDER BY event_date ASC, id ASC
      LIMIT 5
    `,

    db.$queryRaw<Array<{ status: string }>>`
      SELECT status
      FROM public.attendance
      WHERE date = CURRENT_DATE
    `,

    db.$queryRaw<Array<{ gender: string; total: number }>>`
      SELECT
        COALESCE(NULLIF(TRIM(gender), ''), 'Unknown') AS gender,
        COUNT(*)::int AS total
      FROM public.students
      GROUP BY COALESCE(NULLIF(TRIM(gender), ''), 'Unknown')
    `,
  ]);

  const totalAttendance = attendanceRows.length;
  const presentCount = attendanceRows.filter(
    (row) => row.status?.trim().toLowerCase() === 'present'
  ).length;

  const attendanceRate =
    totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 100)
      : 0;

  const totalMale = genderRows
    .filter((row) => row.gender.toLowerCase() === 'male')
    .reduce((sum, row) => sum + row.total, 0);

  const totalFemale = genderRows
    .filter((row) => row.gender.toLowerCase() === 'female')
    .reduce((sum, row) => sum + row.total, 0);

  const genderTotal = totalMale + totalFemale;

  const stats = {
    totalStudents: studentCount[0]?.total ?? 0,
    totalTeachers: teacherCount[0]?.total ?? 0,
    totalClasses: classCount[0]?.total ?? 0,
    totalSubjects: subjectCount[0]?.total ?? 0,
    totalFeesCollected: paymentTotal[0]?.total ?? 0,
    totalFeeBalance: null,
    attendanceRate,

    genderDistribution: {
      male: genderTotal > 0
        ? Math.round((totalMale / genderTotal) * 100)
        : 0,
      female: genderTotal > 0
        ? Math.round((totalFemale / genderTotal) * 100)
        : 0,
    },

    recentPayments: recentPayments.map((payment) => ({
      id: String(payment.id),
      amount: payment.amount,
      receiptNumber: payment.receiptNumber ?? 'No receipt',
      paidAt: payment.paidAt,
      student: {
        fullName: payment.fullName,
        studentId: payment.studentId,
      },
    })),

    recentAnnouncements: recentAnnouncements.map((announcement) => ({
      ...announcement,
      id: String(announcement.id),
    })),

    upcomingEvents: upcomingEvents.map((event) => ({
      ...event,
      id: String(event.id),
    })),
  };

  return <AdminDashboard stats={stats} />;
}
