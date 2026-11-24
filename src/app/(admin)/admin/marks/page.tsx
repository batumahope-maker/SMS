import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gradeFor } from '@/lib/format';
import { isDemoMode } from '@/lib/demo-mode';
import { AdminMarksClient } from '@/components/marks/AdminMarksClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function AdminMarksPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  if (isDemoMode()) return <AdminMarksClient />;

  const marks = await db.mark.findMany({
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
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marks</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the live <code>marks</code> table. Grade is derived from
          marks / max_marks; the database stores no grade column.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recorded results</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No marks have been recorded yet.
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
