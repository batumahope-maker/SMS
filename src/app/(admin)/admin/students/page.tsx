import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/format';
import { isDemoMode } from '@/lib/demo-mode';
import { Button } from '@/components/ui/button';
import { AdminStudentsClient } from '@/components/admin/AdminStudentsClient';
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

const PAGE_SIZE = 50;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  // In synthetic demo mode the management UI (StudentsClient) is wired to
  // the server API, which writes into the in-memory demo data. The live
  // build keeps the read-only view.
  if (isDemoMode()) return <AdminStudentsClient />;

  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number.parseInt(rawPage ?? '1', 10);

  const total = await db.student.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Clamp out-of-range or malformed ?page values instead of showing an empty table.
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const students = await db.student.findMany({
    orderBy: { id: 'asc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
          email: true,
          phone: true,
          status: true,
        },
      },
    },
  });

  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = (page - 1) * PAGE_SIZE + students.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the live <code>students</code> and <code>users</code> tables.
          Showing {firstRow}–{lastRow} of {total} records.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Fee balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono text-xs">
                      {student.studentId ?? '—'}
                    </TableCell>
                    <TableCell>
                      {student.user?.fullName ?? student.user?.username ?? '—'}
                    </TableCell>
                    <TableCell>
                      {[student.trade, student.level, student.section]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </TableCell>
                    <TableCell>{student.gender ?? '—'}</TableCell>
                    <TableCell>{student.guardianName ?? '—'}</TableCell>
                    <TableCell>{student.user?.status ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(Number(student.feeBalance ?? 0))}
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No student records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/students?page=${page - 1}`} rel="prev">
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              {page < totalPages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/students?page=${page + 1}`} rel="next">
                    Next
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
