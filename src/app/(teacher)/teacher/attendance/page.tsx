import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { TeacherAttendanceClient } from '@/components/attendance/TeacherAttendanceClient';

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId } });
  if (!teacher) redirect('/login');

  const scheduleRows = await db.schoolSchedule.findMany({
    where: { teacherId: userId, isActive: true },
    select: { trade: true, level: true, section: true },
  });

  const combos = [
    ...new Map(
      scheduleRows.map((row) => [
        `${row.trade ?? ''}|${row.level ?? ''}|${row.section ?? ''}`,
        { trade: row.trade ?? '', level: row.level ?? '', section: row.section ?? '' },
      ])
    ).values(),
  ];

  const userIds = combos.length
    ? (
        await db.student.findMany({
          where: {
            OR: combos.map((c) => ({
              trade: c.trade || null,
              level: c.level || null,
              section: c.section || null,
            })),
          },
          select: { id: true, userId: true, studentId: true, trade: true, level: true, section: true, gender: true, user: { select: { fullName: true, username: true } } },
        })
      ).map((student) => student.userId)
        .filter((id): id is number => typeof id === 'number')
    : [];

  const studentRows = userIds.length
    ? await db.student.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, studentId: true, trade: true, level: true, section: true, gender: true, user: { select: { fullName: true, username: true } } },
      })
    : [];

  const classes = combos.map((combo) => {
    const students = studentRows.filter(
      (student) =>
        (student.trade ?? '') === combo.trade &&
        (student.level ?? '') === combo.level &&
        (student.section ?? '') === combo.section
    );
    return {
      id: `class-${combo.trade}|${combo.level}|${combo.section}`,
      name: [combo.trade, combo.level, combo.section].filter(Boolean).join(' ') || 'Unassigned',
      students: students.map((student) => ({
        id: String(student.userId),
        fullName: student.user?.fullName ?? student.user?.username ?? '—',
        studentId: student.studentId ?? '—',
        gender: student.gender ?? '—',
      })),
    };
  });

  const recentAttendance = userIds.length
    ? await db.attendance.findMany({
        where: { studentId: { in: userIds } },
        orderBy: { date: 'desc' },
        take: 20,
        include: { student: { select: { fullName: true, username: true, student: { select: { studentId: true } } } } },
      })
    : [];

  return (
    <TeacherAttendanceClient
      classes={classes}
      recentAttendance={recentAttendance.map((row) => ({
        id: String(row.id),
        date: row.date ?? new Date(0),
        status: String(row.status ?? '').trim().toLowerCase(),
        student: {
          fullName: row.student?.fullName ?? row.student?.username ?? '—',
          studentId: row.student?.student?.studentId ?? '—',
        },
      }))}
      teacherId={String(userId)}
    />
  );
}
