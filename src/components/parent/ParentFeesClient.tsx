'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

function getGrade(m: number) {
  if (m >= 90) return 'A+'; if (m >= 80) return 'A'; if (m >= 70) return 'B';
  if (m >= 60) return 'C'; if (m >= 50) return 'D'; return 'F';
}
const gradeCls: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-800', A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800',
  C: 'bg-yellow-100 text-yellow-800', D: 'bg-orange-100 text-orange-800', F: 'bg-red-100 text-red-800',
};

// ============ GRADES ============
interface ChildGrades { id: string; fullName: string; studentId: string; marks: { id: string; marks: number; grade: string | null; term: string; examType: string; subject: { name: string } }[] }
export function ParentGradesClient({ children }: { children: ChildGrades[] }) {
  const [selected, setSelected] = useState(children[0]?.id || '');
  const child = children.find(c => c.id === selected);
  const avg = child && child.marks.length > 0 ? Math.round(child.marks.reduce((s, m) => s + m.marks, 0) / child.marks.length) : 0;

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Grades</h1><p className="text-muted-foreground text-sm mt-1">Academic performance of your children</p></div>
      {children.length > 1 && (
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {child && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Average</p><p className="text-2xl font-bold text-blue-600">{avg}%</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Overall grade</p><p className="text-2xl font-bold">{getGrade(avg)}</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Subjects tested</p><p className="text-2xl font-bold">{new Set(child.marks.map(m => m.subject.name)).size}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">{child.fullName}'s marks</CardTitle></CardHeader>
            <CardContent>
              {child.marks.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No marks yet.</p> : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Term</TableHead><TableHead>Type</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                    <TableBody>{child.marks.map(m => { const g = m.grade || getGrade(m.marks); return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.subject.name}</TableCell>
                        <TableCell className="text-sm">{m.term}</TableCell>
                        <TableCell><span className="bg-secondary text-xs px-2 py-0.5 rounded">{m.examType}</span></TableCell>
                        <TableCell className="font-bold">{m.marks}/100</TableCell>
                        <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gradeCls[g]}`}>{g}</span></TableCell>
                      </TableRow>
                    );})}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============ ATTENDANCE ============
interface ChildAtt { id: string; fullName: string; studentId: string; attendance: { id: string; date: Date; status: string; remarks: string | null }[] }
export function ParentAttendanceClient({ children }: { children: ChildAtt[] }) {
  const [selected, setSelected] = useState(children[0]?.id || '');
  const child = children.find(c => c.id === selected);
  const att = child?.attendance || [];
  const present = att.filter(a => a.status === 'present').length;
  const rate = att.length > 0 ? Math.round((present / att.length) * 100) : 0;
  const statusCls: Record<string, string> = { present: 'bg-green-100 text-green-800', absent: 'bg-red-100 text-red-800', late: 'bg-yellow-100 text-yellow-800', excused: 'bg-blue-100 text-blue-800' };

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Attendance</h1><p className="text-muted-foreground text-sm mt-1">Your children's attendance records</p></div>
      {children.length > 1 && <Select value={selected} onValueChange={setSelected}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent></Select>}
      {child && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[{ l: 'Present', v: present, c: 'text-green-600' }, { l: 'Absent', v: att.filter(a => a.status === 'absent').length, c: 'text-red-600' }, { l: 'Late', v: att.filter(a => a.status === 'late').length, c: 'text-yellow-600' }, { l: 'Rate', v: `${rate}%`, c: 'text-blue-600' }].map(s => (
              <Card key={s.l}><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">{s.l}</p><p className={`text-xl font-bold ${s.c}`}>{s.v}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">{child.fullName}'s attendance history</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                  <TableBody>{att.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No records.</TableCell></TableRow> : att.map(a => (
                    <TableRow key={a.id}><TableCell>{format(new Date(a.date), 'EEEE dd MMM yyyy')}</TableCell><TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls[a.status]}`}>{a.status}</span></TableCell><TableCell className="text-sm text-muted-foreground">{a.remarks || '—'}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============ FEES ============
interface ChildFees { id: string; fullName: string; studentId: string; feePaid: number; feeBalance: number; payments: { id: string; amount: number; paymentMethod: string; receiptNumber: string; paidFor: string; paidAt: Date }[] }
export function ParentFeesClient({ children }: { children: ChildFees[] }) {
  const [selected, setSelected] = useState(children[0]?.id || '');
  const child = children.find(c => c.id === selected);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Fees</h1><p className="text-muted-foreground text-sm mt-1">Fee status and payment history</p></div>
      {children.length > 1 && <Select value={selected} onValueChange={setSelected}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent></Select>}
      {child && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Total paid</p><p className="text-xl font-bold text-green-600">{child.feePaid.toLocaleString()} RWF</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Balance</p><p className={`text-xl font-bold ${child.feeBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{child.feeBalance.toLocaleString()} RWF</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-xl font-bold">{child.payments.length}</p></CardContent></Card>
          </div>
          {child.payments.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No payments yet.</CardContent></Card>
            : <Card><CardHeader className="pb-3"><CardTitle className="text-base">Payments for {child.fullName}</CardTitle></CardHeader><CardContent>
                <div className="rounded-md border"><Table>
                  <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Amount</TableHead><TableHead>For</TableHead><TableHead>Method</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>{child.payments.map(p => (
                    <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell><TableCell className="font-bold text-green-600">{p.amount.toLocaleString()} RWF</TableCell><TableCell className="text-sm">{p.paidFor}</TableCell><TableCell><span className="bg-secondary text-xs px-2 py-0.5 rounded">{p.paymentMethod}</span></TableCell><TableCell className="text-sm text-muted-foreground">{format(new Date(p.paidAt), 'dd MMM yyyy')}</TableCell></TableRow>
                  ))}</TableBody>
                </Table></div>
              </CardContent></Card>}
        </>
      )}
    </div>
  );
}
