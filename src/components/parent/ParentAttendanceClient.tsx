'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Rec { id: string; date: Date; status: string; remarks: string | null }
interface Child { id: string; fullName: string; studentId: string }
export function ParentAttendanceClient({ children, attendanceByChild }: { children: Child[]; attendanceByChild: Record<string, Rec[]> }) {
  const [sel, setSel] = useState(children[0]?.id || '');
  const records = attendanceByChild[sel] || [];
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
  const sCls: Record<string, string> = { present: 'bg-green-100 text-green-800', absent: 'bg-red-100 text-red-800', late: 'bg-yellow-100 text-yellow-800', excused: 'bg-blue-100 text-blue-800' };
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Attendance</h1><p className="text-muted-foreground text-sm mt-1">Track attendance for your children</p></div>
      {children.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card> : (
        <>
          <Select value={sel} onValueChange={setSel}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent></Select>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ label: 'Present', value: present, color: 'text-green-600', Icon: CheckCircle }, { label: 'Absent', value: absent, color: 'text-red-600', Icon: XCircle }, { label: 'Late', value: late, color: 'text-yellow-600', Icon: Clock }, { label: 'Rate', value: `${rate}%`, color: 'text-blue-600', Icon: TrendingUp }].map(({ label, value, color, Icon }) => (
              <Card key={label}><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><Icon className={`w-5 h-5 ${color}`} /><div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div></div></CardContent></Card>
            ))}
          </div>
          {absent > 3 && <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200"><XCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700 font-medium">Your child has been absent {absent} times. Please contact the school if there are any issues.</p></div>}
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Attendance records</CardTitle></CardHeader><CardContent>
            {records.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No records yet.</p>
              : <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                  <TableBody>{records.map(r => <TableRow key={r.id}><TableCell>{format(new Date(r.date), 'EEEE, dd MMM yyyy')}</TableCell><TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sCls[r.status] || ''}`}>{r.status}</span></TableCell><TableCell className="text-sm text-muted-foreground">{r.remarks || '—'}</TableCell></TableRow>)}</TableBody>
                </Table></div>}
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
