import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch dashboard statistics
  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    totalSubjects,
    totalFeesCollected,
    totalFeeBalance,
    recentPayments,
    recentAnnouncements,
    upcomingEvents,
    todayAttendance,
  ] = await Promise.all([
    db.student.count({
      where: { schoolId: session.user.schoolId, status: 'active' },
    }),
    db.teacher.count({
      where: { schoolId: session.user.schoolId, status: 'active' },
    }),
    db.class.count({
      where: { schoolId: session.user.schoolId, status: 'active' },
    }),
    db.subject.count({
      where: { status: 'active' },
    }),
    db.payment.aggregate({
      where: { schoolId: session.user.schoolId },
      _sum: { amount: true },
    }),
    db.student.aggregate({
      where: { schoolId: session.user.schoolId, status: 'active' },
      _sum: { feeBalance: true },
    }),
    db.payment.findMany({
      where: { schoolId: session.user.schoolId },
      take: 5,
      orderBy: { paidAt: 'desc' },
      include: {
        student: {
          select: { fullName: true, studentId: true },
        },
      },
    }),
    db.announcement.findMany({
      where: { schoolId: session.user.schoolId },
      take: 3,
      orderBy: { createdAt: 'desc' },
    }),
    db.event.findMany({
      where: {
        schoolId: session.user.schoolId,
        date: { gte: new Date() },
        status: 'scheduled',
      },
      take: 5,
      orderBy: { date: 'asc' },
    }),
    db.attendance.findMany({
      where: {
        date: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    }),
  ]);

  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const attendanceRate = todayAttendance.length > 0 
    ? Math.round((presentCount / todayAttendance.length) * 100)
    : 0;

  const stats = {
    totalStudents,
    totalTeachers,
    totalClasses,
    totalSubjects,
    totalFeesCollected: totalFeesCollected._sum.amount || 0,
    totalFeeBalance: totalFeeBalance._sum.feeBalance || 0,
    attendanceRate,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      receiptNumber: p.receiptNumber,
      paidAt: p.paidAt,
      student: p.student,
    })),
    recentAnnouncements,
    upcomingEvents,
  };

  return <AdminDashboard stats={stats} />;
}
