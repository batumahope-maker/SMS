import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { ParentDashboardClient } from '@/components/dashboards/ParentDashboard';
export const dynamic = 'force-dynamic';

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'parent') {
    redirect('/login');
  }

  // Get parent info
  const parent = await db.parent.findFirst({
    where: { userId: session.user.id },
    include: {
      parentStudents: {
        include: {
          student: {
            include: {
              class: true,
            },
          },
        },
      },
    },
  });

  if (!parent) {
    redirect('/login');
  }

  // Get children (students linked to this parent)
  const children = parent.parentStudents.map((ps) => ps.student);

  // Get attendance for all children
  const childrenIds = children.map((c) => c.id);
  const recentAttendance = await db.attendance.findMany({
    where: {
      studentId: { in: childrenIds },
    },
    take: 30,
    orderBy: { date: 'desc' },
  });

  // Get recent marks for all children
  const recentMarks = await db.mark.findMany({
    where: {
      studentId: { in: childrenIds },
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { fullName: true, studentId: true } },
      subject: { select: { name: true } },
    },
  });

  // Get fee summary for all children
  const totalFeeBalance = children.reduce((sum, c) => sum + c.feeBalance, 0);
  const totalFeePaid = children.reduce((sum, c) => sum + c.feePaid, 0);

  // Get recent payments
  const recentPayments = await db.payment.findMany({
    where: {
      studentId: { in: childrenIds },
    },
    take: 10,
    orderBy: { paidAt: 'desc' },
    include: {
      student: { select: { fullName: true } },
    },
  });

  // Get announcements for parents
  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { audience: 'all' },
        { audience: 'parents' },
      ],
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  // Get unread messages count
  const unreadMessages = await db.message.count({
    where: {
      receiverId: session.user.id,
      read: false,
    },
  });

  const stats = {
    parent: {
      id: parent.id,
      fullName: parent.fullName,
      phone: parent.phone,
      email: parent.email,
    },
    children: children.map((child) => ({
      id: child.id,
      studentId: child.studentId,
      fullName: child.fullName,
      trade: child.trade,
      level: child.level,
      section: child.section,
      class: child.class?.name,
      feePaid: child.feePaid,
      feeBalance: child.feeBalance,
      gender: child.gender,
    })),
    attendance: {
      present: recentAttendance.filter((a) => a.status === 'present').length,
      absent: recentAttendance.filter((a) => a.status === 'absent').length,
      late: recentAttendance.filter((a) => a.status === 'late').length,
    },
    recentMarks: recentMarks.map((m) => ({
      id: m.id,
      marks: m.marks,
      grade: m.grade,
      student: m.student,
      subject: m.subject,
      createdAt: m.createdAt,
    })),
    feeSummary: {
      totalPaid: totalFeePaid,
      totalBalance: totalFeeBalance,
    },
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paidAt: p.paidAt,
      paidFor: p.paidFor,
      student: p.student,
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      createdAt: a.createdAt,
    })),
    unreadMessages,
  };

  return <ParentDashboardClient stats={stats} />;
}
