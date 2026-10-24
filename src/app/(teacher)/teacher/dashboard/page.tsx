import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { TeacherDashboardClient } from '@/components/dashboards/TeacherDashboard';
export const dynamic = 'force-dynamic';

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'teacher') {
    redirect('/login');
  }

  // Get teacher info
  const teacher = await db.teacher.findFirst({
    where: { userId: session.user.id },
    include: {
      classes: {
        include: {
          students: { where: { status: 'active' } },
        },
      },
      subjectTeaching: true,
    },
  });

  if (!teacher) {
    redirect('/login');
  }

  // Get my classes
  const myClasses = await db.class.findMany({
    where: {
      teacherId: teacher.id,
      status: 'active',
    },
    include: {
      students: { where: { status: 'active' } },
      subjects: true,
    },
  });

  // Get today's schedule
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const schedules = await db.schedule.findMany({
    where: {
      classId: { in: myClasses.map((c) => c.id) },
      dayOfWeek: dayOfWeek,
    },
    orderBy: { startTime: 'asc' },
  });

  // Get recent attendance marked
  const recentAttendance = await db.attendance.findMany({
    where: { markedBy: teacher.id },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { fullName: true, studentId: true } },
    },
  });

  // Get homework assigned
  const homeworkAssigned = await db.homework.findMany({
    where: { teacherId: teacher.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
  });

  // Get marks entered recently
  const recentMarks = await db.mark.findMany({
    where: { teacherId: teacher.id },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { fullName: true, studentId: true } },
      subject: { select: { name: true } },
    },
  });

  // Get total students in my classes
  const totalStudents = myClasses.reduce((acc, c) => acc + c.students.length, 0);

  // Get today's attendance status
  const todayAttendance = await db.attendance.findMany({
    where: {
      date: new Date(new Date().setHours(0, 0, 0, 0)),
      classId: { in: myClasses.map((c) => c.id) },
    },
  });

  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;

  const stats = {
    teacher: {
      id: teacher.id,
      fullName: teacher.fullName,
      teacherId: teacher.teacherId,
      subjects: teacher.subjects,
      department: teacher.department,
    },
    totalClasses: myClasses.length,
    totalStudents,
    totalSubjects: teacher.subjectTeaching.length,
    todayAttendanceRate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
    myClasses: myClasses.map((c) => ({
      id: c.id,
      name: c.name,
      studentCount: c.students.length,
      subjects: c.subjects.length,
    })),
    todaySchedule: schedules,
    recentAttendance: recentAttendance.map((a) => ({
      id: a.id,
      date: a.date,
      status: a.status,
      student: a.student,
    })),
    homeworkAssigned: homeworkAssigned.map((h) => ({
      id: h.id,
      title: h.title,
      dueDate: h.dueDate,
      subject: h.subject,
      class: h.class,
      submissionCount: h._count.submissions,
    })),
    recentMarks: recentMarks.map((m) => ({
      id: m.id,
      marks: m.marks,
      grade: m.grade,
      student: m.student,
      subject: m.subject,
      createdAt: m.createdAt,
    })),
  };

  return <TeacherDashboardClient stats={stats} />;
}
