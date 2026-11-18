import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
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

export default async function SubjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  // The live schema has NO subjects table. Subjects exist as free-text values:
  //   - teachers.subject  (60 rows — the real, populated source today)
  //   - school_schedule.subject + class + teacher link (0 rows at audit time)
  //   - marks.subject (0 rows at audit time)
  // All three are surfaced below; empty sources say so honestly.
  const teachers = await db.teacher.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      subject: true,
      department: true,
      user: { select: { fullName: true } },
    },
  });

  // Group teachers by their assigned subject (case-normalised for display
  // grouping, original spelling preserved for the label).
  const bySubject = new Map<string, { label: string; names: string[]; departments: Set<string> }>();
  for (const teacher of teachers) {
    const subject = teacher.subject?.trim();
    if (!subject) continue;
    const key = subject.toLowerCase();
    const entry =
      bySubject.get(key) ??
      { label: subject, names: [], departments: new Set<string>() };
    if (teacher.user?.fullName) entry.names.push(teacher.user.fullName);
    if (teacher.department) entry.departments.add(teacher.department);
    bySubject.set(key, entry);
  }
  const subjects = [...bySubject.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  const scheduled = await db.schoolSchedule.findMany({
    orderBy: [{ subject: 'asc' }, { dayOfWeek: 'asc' }],
    select: {
      id: true,
      subject: true,
      trade: true,
      level: true,
      section: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      roomNumber: true,
      teacher: { select: { fullName: true } },
    },
  });

  const markSubjects = await db.mark.groupBy({
    by: ['subject'],
    _count: { _all: true },
    orderBy: { subject: 'asc' },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view. There is no subjects table in the live database —
          subjects are the free-text values assigned to teachers on{' '}
          <code>teachers.subject</code>, plus those appearing in{' '}
          <code>school_schedule</code> and <code>marks</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Subjects by assigned teachers ({subjects.length} distinct)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teachers</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.label}>
                    <TableCell className="font-medium">{subject.label}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {subject.names.length > 0 ? (
                          subject.names.map((name, index) => (
                            <Badge variant="outline" className="text-xs" key={`${subject.label}-${name}-${index}`}>
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{subject.names.length}</TableCell>
                  </TableRow>
                ))}
                {subjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No teacher subject assignments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timetabled lessons (school_schedule)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduled.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduled.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.subject ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {[row.trade, row.level, row.section].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell>{row.dayOfWeek ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {row.startTime && row.endTime
                          ? `${row.startTime}–${row.endTime}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{row.roomNumber ?? '—'}</TableCell>
                      <TableCell className="text-xs">{row.teacher?.fullName ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No timetabled lessons are recorded in the live{' '}
              <code>school_schedule</code> table yet. When lessons are added,
              they will appear here with subject, class, time and teacher.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subjects seen in recorded marks</CardTitle>
        </CardHeader>
        <CardContent>
          {markSubjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {markSubjects.map((row) => (
                <Badge key={row.subject ?? 'unknown'} variant="outline" className="text-xs">
                  {row.subject ?? '(unspecified)'} · {row._count._all} marks
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No marks are recorded in the live <code>marks</code> table yet, so
              no subjects appear there. The live summary can always be seen on
              the Reports page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
