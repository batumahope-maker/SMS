import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
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

export default async function AdminAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const records = await db.attendance.findMany({
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
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the live <code>attendance</code> table.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
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
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.status ?? '—'}</TableCell>
                  <TableCell>{row.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No attendance has been recorded yet.
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
