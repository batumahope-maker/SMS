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

export default async function TeachersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const teachers = await db.teacher.findMany({
    orderBy: { id: 'asc' },
    include: {
      user: {
        select: { fullName: true, username: true, email: true, phone: true, status: true },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the live <code>teachers</code> table ({teachers.length} records).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Hire date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-mono text-xs">
                    {teacher.teacherId ?? '—'}
                  </TableCell>
                  <TableCell>
                    {teacher.user?.fullName ?? teacher.user?.username ?? '—'}
                  </TableCell>
                  <TableCell>{teacher.subject ?? '—'}</TableCell>
                  <TableCell>{teacher.department ?? '—'}</TableCell>
                  <TableCell>{formatDate(teacher.hireDate)}</TableCell>
                  <TableCell>{teacher.user?.status ?? '—'}</TableCell>
                </TableRow>
              ))}
              {teachers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No teacher records found.
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
