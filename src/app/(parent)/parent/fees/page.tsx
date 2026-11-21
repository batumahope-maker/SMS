import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DemoReadOnlyNotice } from '@/components/demo/DemoReadOnlyNotice';
import { formatMoney } from '@/lib/format';
import { parentDemoFees } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export default function ParentFeesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My child's fees</h1>
        <p className="text-sm text-muted-foreground">
          Synthetic fee summary and payments for the demo child.
        </p>
      </div>

      <DemoReadOnlyNotice />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fee paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{parentDemoFees.feePaid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fee balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{parentDemoFees.feeBalance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{parentDemoFees.payments.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Synthetic payments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentDemoFees.payments.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.amount)}
                  </TableCell>
                  <TableCell>{row.reference}</TableCell>
                  <TableCell>{row.method}</TableCell>
                </TableRow>
              ))}
              {parentDemoFees.payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No synthetic payments are available yet.
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
