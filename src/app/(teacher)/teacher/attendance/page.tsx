import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId } });
  if (!teacher) redirect('/login');

  // school_schedule.teacher_id references users.id. The live schema has no
  // classes table, so a "class" is the (trade, level, section) combination.
  const scheduleRows = await db.schoolSchedule.findMany({
    where: { teacherId: userId, isActive: true },
    select: { trade: true, level: true, section: true },
  });

  const combos = [
    ...new Map(
      scheduleRows.map((row) => [
        `${row.trade ?? ''}|${row.level ?? ''}|${row.section ?? ''}`,
        { trade: row.trade, level: row.level, section: row.section },
      ])
    ).values(),
  ];

  const students = combos.length
    ? await db.student.findMany({
        where: {
          OR: combos.map((c) => ({
            trade: c.trade ?? null,
            level: c.level ?? null,
            section: c.section ?? null,
          })),
        },
        select: { userId: true },
      })
    : [];

  const userIds = students
    .map((s) => s.userId)
    .filter((id): id is number => typeof id === 'number');

  // attendance has no marked_by column, so records are scoped by the students
  // in this teacher's schedule combinations.
  const records = userIds.length
    ? await db.attendance.findMany({
        where: { studentId: { in: userIds } },
        orderBy: { date: 'desc' },
        take: 200,
        include: {
          student: {
            select: {
              fullName: true,
              username: true,
              student: { select: { studentId: true } },
            },
          },
        },
      })
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Attendance recorded for students in your classes
          {combos.length ? ` (${combos.length} class combination${combos.length === 1 ? '' : 's'})` : ''}.
        </p>
      </div>

      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="outline">Read-only</Badge>
            Marking attendance is disabled in this build
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The live <code>essjt_school_system</code> database is not written to
            by this build. Recorded attendance is shown below; marking will be
            enabled in a later stage with explicit approval.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.student?.fullName ?? row.student?.username ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.student?.student?.studentId ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.status ?? '—'}</TableCell>
                  <TableCell>{row.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {combos.length === 0
                      ? 'No classes are assigned to you in school_schedule.'
                      : 'No attendance has been recorded yet.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
