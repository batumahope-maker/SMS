import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gradeFor } from '@/lib/format';
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

export default async function TeacherMarksPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') redirect('/login');

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) redirect('/login');

  const teacher = await db.teacher.findFirst({ where: { userId } });
  if (!teacher) redirect('/login');

  // `marks` has no teacher_id column, so the only teacher link available is
  // the subject string on the teacher record and on school_schedule.
  const scheduleRows = await db.schoolSchedule.findMany({
    where: { teacherId: userId, isActive: true },
    select: { subject: true },
  });

  const subjects = [
    ...new Set(
      [teacher.subject, ...scheduleRows.map((r) => r.subject)].filter(
        (s): s is string => !!s && s.trim().length > 0
      )
    ),
  ];

  const marks = subjects.length
    ? await db.mark.findMany({
        where: { subject: { in: subjects } },
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
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
        <h1 className="text-3xl font-bold tracking-tight">Marks</h1>
        <p className="text-sm text-muted-foreground">
          Results recorded for your subject
          {subjects.length ? `: ${subjects.join(', ')}` : ''}.
        </p>
      </div>

      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="outline">Read-only</Badge>
            Recording marks is disabled in this build
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The live <code>essjt_school_system</code> database is not written to
            by this build. Recorded results are shown below; entry and editing
            will be enabled in a later stage with explicit approval.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recorded results</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marks.map((mark) => {
                const score = Number(mark.marks ?? 0);
                const max = Number(mark.maxMarks ?? 100);
                return (
                  <TableRow key={mark.id}>
                    <TableCell>
                      {mark.student?.fullName ?? mark.student?.username ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {mark.student?.student?.studentId ?? '—'}
                    </TableCell>
                    <TableCell>{mark.subject ?? '—'}</TableCell>
                    <TableCell>{mark.term ?? '—'}</TableCell>
                    <TableCell>{mark.year ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {score} / {max}
                    </TableCell>
                    <TableCell>{gradeFor(score, max)}</TableCell>
                  </TableRow>
                );
              })}
              {marks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No results have been recorded yet.
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
