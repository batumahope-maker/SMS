'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface Payment { id: string; amount: number; paymentMethod: string; receiptNumber: string; paidFor: string; term: string | null; paidAt: Date }
interface StudentFeesClientProps { payments: Payment[]; feePaid: number; feeBalance: number; studentName: string }

export function StudentFeesClient({ payments, feePaid, feeBalance, studentName }: StudentFeesClientProps) {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">My fees</h1><p className="text-muted-foreground text-sm mt-1">Fee status and payment history for {studentName}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Total paid</p><p className="text-xl font-bold text-green-600">{feePaid.toLocaleString()} RWF</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><AlertCircle className={`w-5 h-5 ${feeBalance > 0 ? 'text-red-600' : 'text-green-600'}`} /><div><p className="text-xs text-muted-foreground">Balance</p><p className={`text-xl font-bold ${feeBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{feeBalance.toLocaleString()} RWF</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Payments made</p><p className="text-xl font-bold text-blue-600">{payments.length}</p></div></div></CardContent></Card>
      </div>
      {feeBalance > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div><p className="font-medium text-red-700">Outstanding balance</p><p className="text-sm text-red-600">You have an outstanding balance of {feeBalance.toLocaleString()} RWF. Please contact the school office to make payment.</p></div>
        </div>
      )}
      {feeBalance === 0 && payments.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="font-medium text-green-700">All fees paid — your account is up to date!</p>
        </div>
      )}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0
            ? <p className="text-center py-10 text-muted-foreground text-sm">No payments recorded yet.</p>
            : <div className="rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Receipt #</TableHead><TableHead>Amount</TableHead><TableHead>For</TableHead><TableHead>Method</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                        <TableCell className="font-bold text-green-600">{p.amount.toLocaleString()} RWF</TableCell>
                        <TableCell className="text-sm">{p.paidFor}</TableCell>
                        <TableCell><span className="bg-secondary text-xs px-2 py-0.5 rounded">{p.paymentMethod}</span></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(p.paidAt), 'dd MMM yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>}
        </CardContent>
      </Card>
    </div>
  );
}
