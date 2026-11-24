import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatMoney } from '@/lib/format';
import { isDemoMode } from '@/lib/demo-mode';
import { AdminPaymentsClient } from '@/components/payments/AdminPaymentsClient';
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

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') redirect('/login');

  if (isDemoMode()) return <AdminPaymentsClient />;

  const payments = await db.payment.findMany({
    orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
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
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the live <code>payments</code> table.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {payment.student?.fullName ?? payment.student?.username ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell>{payment.paymentMethod ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {payment.reference ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(Number(payment.amount ?? 0))}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No payments have been recorded yet.
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
