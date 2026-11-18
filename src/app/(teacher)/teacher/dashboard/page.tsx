import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { TeacherDashboardClient } from '@/components/dashboards/TeacherDashboard';

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

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeLabel(value: Date | null): string {
  if (!value) return '';
  return value.toISOString().slice(11, 16);
}

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'teacher') {
    redirect('/login');
  }

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  // Live `teachers` has no full_name column; the name lives on users.full_name.
  const teacher = await db.teacher.findFirst({
    where: { userId },
    include: { user: { select: { fullName: true, username: true } } },
  });

  if (!teacher) redirect('/login');

  // school_schedule.teacher_id references users.id (declared FK), not teachers.id.
  const scheduleRows = await db.schoolSchedule.findMany({
    where: { teacherId: userId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  // The live schema has no classes table. A "class" is the distinct
  // (trade, level, section) combination present in the teacher's schedule.
  const classMap = new Map<string, { trade: string; level: string; section: string }>();
  for (const row of scheduleRows) {
    const key = `${row.trade ?? ''}|${row.level ?? ''}|${row.section ?? ''}`;
    if (!classMap.has(key)) {
      classMap.set(key, {
        trade: row.trade ?? '',
        level: row.level ?? '',
        section: row.section ?? '',
      });
    }
  }
  const classCombos = [...classMap.values()];

  const scopedStudents = classCombos.length
    ? await db.student.findMany({
        where: {
          OR: classCombos.map((c) => ({
            trade: c.trade || null,
            level: c.level || null,
            section: c.section || null,
          })),
        },
        select: { id: true, studentId: true, trade: true, level: true, section: true },
      })
    : [];

  const todayName = WEEKDAYS[new Date().getDay()];
  const todaySchedule = scheduleRows
    .filter((row) => row.dayOfWeek === todayName)
    .map((row) => ({
      id: String(row.id),
      startTime: timeLabel(row.startTime),
      endTime: timeLabel(row.endTime),
      subjectName: row.subject ?? 'Lesson',
      room: row.roomNumber,
    }));

  // marks.student_id references users.id; `marks` has no teacher_id column.
  // Recent marks are therefore scoped by the teacher's own subject string.
  const recentMarkRows = await db.mark.findMany({
    where: teacher.subject ? { subject: teacher.subject } : undefined,
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: {
          fullName: true,
          student: { select: { studentId: true } },
        },
      },
    },
  });

  // attendance has no marked_by column. Scope by the students in this teacher's
  // schedule combinations, which is the only teacher-to-student link available.
  const scopedUserIds = scopedStudents.length
    ? (
        await db.student.findMany({
          where: { id: { in: scopedStudents.map((s) => s.id) } },
          select: { userId: true },
        })
      )
        .map((s) => s.userId)
        .filter((id): id is number => typeof id === 'number')
    : [];

  const todayAttendance = scopedUserIds.length
    ? await db.attendance.findMany({
        where: { date: startOfToday(), studentId: { in: scopedUserIds } },
        select: { status: true },
      })
    : [];

  const recentAttendanceRows = scopedUserIds.length
    ? await db.attendance.findMany({
        where: { studentId: { in: scopedUserIds } },
        take: 10,
        orderBy: { date: 'desc' },
        include: {
          student: {
            select: {
              fullName: true,
              student: { select: { studentId: true } },
            },
          },
        },
      })
    : [];

  const presentCount = todayAttendance.filter(
    (row) => String(row.status ?? '').trim().toLowerCase() === 'present'
  ).length;

  const distinctSubjects = new Set(
    scheduleRows.map((row) => row.subject).filter((s): s is string => !!s)
  );
  if (teacher.subject) distinctSubjects.add(teacher.subject);

  const stats = {
    teacher: {
      id: String(teacher.id),
      fullName: teacher.user?.fullName ?? teacher.user?.username ?? 'Teacher',
      teacherId: teacher.teacherId ?? '',
      subjects: teacher.subject ?? '',
      department: teacher.department,
    },
    totalClasses: classCombos.length,
    totalStudents: scopedStudents.length,
    totalSubjects: distinctSubjects.size,
    todayAttendanceRate:
      scopedStudents.length > 0
        ? Math.round((presentCount / scopedStudents.length) * 100)
        : 0,
    myClasses: classCombos.map((c, index) => ({
      id: `combo-${index}`,
      name: [c.trade, c.level, c.section].filter(Boolean).join(' ') || 'Unassigned',
      studentCount: scopedStudents.filter(
        (s) =>
          (s.trade ?? '') === c.trade &&
          (s.level ?? '') === c.level &&
          (s.section ?? '') === c.section
      ).length,
      subjects: new Set(
        scheduleRows
          .filter(
            (r) =>
              (r.trade ?? '') === c.trade &&
              (r.level ?? '') === c.level &&
              (r.section ?? '') === c.section
          )
          .map((r) => r.subject)
      ).size,
    })),
    todaySchedule,
    recentAttendance: recentAttendanceRows.map((row) => ({
      id: String(row.id),
      date: row.date ?? new Date(0),
      status: String(row.status ?? ''),
      student: {
        fullName: row.student?.fullName ?? '',
        studentId: row.student?.student?.studentId ?? '',
      },
    })),
    // No homework table exists in the live schema.
    homeworkAssigned: [],
    recentMarks: recentMarkRows.map((row) => ({
      id: String(row.id),
      marks: Number(row.marks ?? 0),
      grade: null,
      student: {
        fullName: row.student?.fullName ?? '',
        studentId: row.student?.student?.studentId ?? '',
      },
      subject: { name: row.subject ?? '' },
      createdAt: row.createdAt,
    })),
  };

  return <TeacherDashboardClient stats={stats} />;
}
