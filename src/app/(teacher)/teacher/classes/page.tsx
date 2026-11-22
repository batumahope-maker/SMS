import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { TeacherClassesClient } from '@/components/classes/TeacherClassesClient';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayIndex(value: string | null): number {
  const index = value ? DAY_NAMES.indexOf(value) : -1;
  return index >= 0 ? index : 0;
}

export default async function TeacherClassesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const teacher = await db.teacher.findFirst({
    where: { userId },
    include: { user: { select: { fullName: true, username: true } } },
  });
  if (!teacher) redirect('/login');

  const scheduleRows = await db.schoolSchedule.findMany({
    where: { teacherId: userId, isActive: true },
    select: { id: true, trade: true, level: true, section: true, subject: true, dayOfWeek: true, startTime: true, endTime: true, roomNumber: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
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
          select: {
            id: true,
            userId: true,
            studentId: true,
            trade: true,
            level: true,
            section: true,
            feePaid: true,
            feeBalance: true,
            user: { select: { fullName: true, username: true } },
          },
        })
      ).map((student) => student.userId)
        .filter((id): id is number => typeof id === 'number')
    : [];

  const students = userIds.length
    ? await db.student.findMany({
        where: { userId: { in: userIds } },
        select: {
          id: true,
          studentId: true,
          trade: true,
          level: true,
          section: true,
          gender: true,
          feePaid: true,
          feeBalance: true,
          user: { select: { fullName: true, username: true } },
        },
        orderBy: { studentId: 'asc' },
      })
    : [];

  const classes = combos.map((combo) => ({
    id: `class-${combo.trade}|${combo.level}|${combo.section}`,
    name: [combo.trade, combo.level, combo.section].filter(Boolean).join(' ') || 'Unassigned',
    trade: combo.trade,
    level: combo.level,
    section: combo.section,
    students: students
      .filter(
        (student) =>
          (student.trade ?? '') === combo.trade &&
          (student.level ?? '') === combo.level &&
          (student.section ?? '') === combo.section
      )
      .map((student) => ({
        id: String(student.id),
        fullName: student.user?.fullName ?? student.user?.username ?? '—',
        studentId: student.studentId ?? '—',
        gender: student.gender ?? '—',
        feePaid: Number(student.feePaid ?? 0),
        feeBalance: Number(student.feeBalance ?? 0),
      })),
    subjects: [...new Set(scheduleRows.filter((row) => row.trade === combo.trade && row.level === combo.level && row.section === combo.section).map((row) => row.subject).filter(Boolean) as string[])].map((name) => ({ id: name, name, code: name })),
    schedules: scheduleRows
      .filter((row) => row.trade === combo.trade && row.level === combo.level && row.section === combo.section)
      .map((row) => ({
        id: String(row.id),
        dayOfWeek: dayIndex(row.dayOfWeek),
        startTime: row.startTime?.toISOString().slice(11, 16) ?? '',
        endTime: row.endTime?.toISOString().slice(11, 16) ?? '',
        subjectName: row.subject ?? 'Lesson',
        room: row.roomNumber ?? null,
      })),
  }));

  return <TeacherClassesClient classes={classes} teacherName={teacher.user?.fullName ?? teacher.user?.username ?? 'Teacher'} />;
}
