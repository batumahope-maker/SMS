import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number.parseInt(rawPage ?? '1', 10);

  const [totals, withBalance, total] = await Promise.all([
    db.student.aggregate({
      _sum: { feePaid: true, feeBalance: true },
    }),
    db.student.count({ where: { feeBalance: { gt: 0 } } }),
    db.student.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  // Highest outstanding balances first — most useful ordering for the office.
  const students = await db.student.findMany({
    orderBy: [{ feeBalance: 'desc' }, { id: 'asc' }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      studentId: true,
      feePaid: true,
      feeBalance: true,
      user: { select: { fullName: true, username: true } },
    },
  });

  const paymentsCount = await db.payment.count();
  const recentPayments = await db.payment.findMany({
    orderBy: { paymentDate: 'desc' },
    take: 10,
    select: {
      id: true,
      amount: true,
      paymentDate: true,
      paymentMethod: true,
      reference: true,
    },
  });

  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = (page - 1) * PAGE_SIZE + students.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fees</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of fee balances stored on the live{' '}
          <code>students</code> table. Showing {firstRow}–{lastRow} of {total}{' '}
          students.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(Number(totals._sum.feePaid ?? 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatMoney(Number(totals._sum.feeBalance ?? 0))}
            </p>
            <p className="text-xs text-muted-foreground">
              {withBalance} of {total} students have a balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recorded payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{paymentsCount}</p>
            <p className="text-xs text-muted-foreground">rows in the live payments table</p>
          </CardContent>
        </Card>
      </div>

      {recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-xs">{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="text-xs">{payment.paymentMethod ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.reference ?? '—'}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(payment.amount ?? 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Student fee balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const balance = Number(student.feeBalance ?? 0);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-xs">
                        {student.studentId ?? '—'}
                      </TableCell>
                      <TableCell>{student.user?.fullName ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(Number(student.feePaid ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(balance)}</TableCell>
                      <TableCell>
                        {balance > 0 ? (
                          <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-800">
                            Outstanding
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            Cleared
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No student fee records found.
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
                  <Link href={`/admin/fees?page=${page - 1}`} rel="prev">
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
                  <Link href={`/admin/fees?page=${page + 1}`} rel="next">
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
