import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { StudentDashboardClient } from '@/components/dashboards/StudentDashboard';
export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'student') {
    redirect('/login');
  }

  // Get student info
  const student = await db.student.findFirst({
    where: { userId: session.user.id },
    include: {
      class: {
        include: {
          subjects: true,
        },
      },
    },
  });

  if (!student) {
    redirect('/login');
  }

  // Get today's schedule
  const today = new Date();
  const dayOfWeek = today.getDay();
  const schedules = student.classId
    ? await db.schedule.findMany({
        where: {
          classId: student.classId,
          dayOfWeek: dayOfWeek,
        },
        orderBy: { startTime: 'asc' },
      })
    : [];

  // Get recent marks
  const recentMarks = await db.mark.findMany({
    where: { studentId: student.id },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      subject: { select: { name: true, code: true } },
    },
  });

  // Get attendance summary
  const attendance = await db.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { date: 'desc' },
    take: 30,
  });

  const attendanceSummary = {
    present: attendance.filter((a) => a.status === 'present').length,
    absent: attendance.filter((a) => a.status === 'absent').length,
    late: attendance.filter((a) => a.status === 'late').length,
    excused: attendance.filter((a) => a.status === 'excused').length,
  };

  // Get pending homework
  const pendingHomework = await db.homework.findMany({
    where: {
      classId: student.classId || undefined,
      dueDate: { gte: new Date() },
    },
    take: 5,
    orderBy: { dueDate: 'asc' },
    include: {
      subject: { select: { name: true } },
      submissions: {
        where: { studentId: student.id },
      },
    },
  });

  // Get fee summary
  const payments = await db.payment.findMany({
    where: { studentId: student.id },
    orderBy: { paidAt: 'desc' },
    take: 5,
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Get announcements
  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { audience: 'all' },
        { audience: 'students' },
      ],
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    student: {
      id: student.id,
      studentId: student.studentId,
      fullName: student.fullName,
      trade: student.trade,
      level: student.level,
      section: student.section,
      class: student.class?.name,
      feePaid: student.feePaid,
      feeBalance: student.feeBalance,
    },
    todaySchedule: schedules,
    recentMarks: recentMarks.map((m) => ({
      id: m.id,
      marks: m.marks,
      grade: m.grade,
      term: m.term,
      examType: m.examType,
      subject: m.subject,
    })),
    attendanceSummary,
    pendingHomework: pendingHomework.map((h) => ({
      id: h.id,
      title: h.title,
      dueDate: h.dueDate,
      subject: h.subject,
      submitted: h.submissions.length > 0,
    })),
    recentPayments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      receiptNumber: p.receiptNumber,
      paidAt: p.paidAt,
      paidFor: p.paidFor,
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      createdAt: a.createdAt,
    })),
    totalPaid,
  };

  return <StudentDashboardClient stats={stats} />;
}
