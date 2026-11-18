import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/format';
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

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const [usersByRole, studentAgg, counts, marksCount, attendanceCount] =
    await Promise.all([
      db.user.groupBy({ by: ['role'], _count: { _all: true } }),
      db.student.aggregate({ _sum: { feePaid: true, feeBalance: true } }),
      Promise.all([
        db.student.count(),
        db.teacher.count(),
        db.announcement.count(),
        db.schoolEvent.count(),
        db.payment.count(),
      ]),
      db.mark.count(),
      db.attendance.count(),
    ]);

  const [students, teachers, announcements, events, payments] = counts;
  const roleCount = (role: string) =>
    usersByRole.find((row) => row.role === role)?._count._all ?? 0;

  const feeCollected = Number(studentAgg._sum.feePaid ?? 0);
  const feeOutstanding = Number(studentAgg._sum.feeBalance ?? 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Read-only summary generated from the live database.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrolment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{students}</p>
            <p className="text-xs text-muted-foreground">students · {teachers} teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fees collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(feeCollected)}</p>
            <p className="text-xs text-muted-foreground">
              {formatMoney(feeOutstanding)} outstanding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{announcements + events}</p>
            <p className="text-xs text-muted-foreground">
              {announcements} announcements · {events} events
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead>Accounts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Students</TableCell>
                <TableCell className="text-right">{students}</TableCell>
                <TableCell>{roleCount('student')} user logins</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Teachers</TableCell>
                <TableCell className="text-right">{teachers}</TableCell>
                <TableCell>{roleCount('teacher')} user logins</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Administrators</TableCell>
                <TableCell className="text-right">{roleCount('admin')}</TableCell>
                <TableCell>{roleCount('admin')} user logins</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Marks</TableCell>
                <TableCell className="text-right">{marksCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {marksCount === 0 ? 'no marks recorded yet' : ''}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Attendance</TableCell>
                <TableCell className="text-right">{attendanceCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {attendanceCount === 0 ? 'no attendance recorded yet' : ''}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Payments</TableCell>
                <TableCell className="text-right">{payments}</TableCell>
                <TableCell className="text-muted-foreground">
                  {payments === 0 ? 'no payments recorded yet' : ''}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Announcements</TableCell>
                <TableCell className="text-right">{announcements}</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>Events</TableCell>
                <TableCell className="text-right">{events}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
