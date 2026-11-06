'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord { id: string; date: Date; status: string; remarks: string | null }
interface StudentAttendanceClientProps { records: AttendanceRecord[]; summary: { present: number; absent: number; late: number; excused: number } }

const statusCls: Record<string, string> = {
  present: 'bg-green-100 text-green-800', absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800', excused: 'bg-blue-100 text-blue-800',
};

export function StudentAttendanceClient({ records, summary }: StudentAttendanceClientProps) {
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  const rate = total > 0 ? Math.round((summary.present / total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">My attendance</h1><p className="text-muted-foreground text-sm mt-1">Your attendance record for this year</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present', value: summary.present, color: 'text-green-600', Icon: CheckCircle },
          { label: 'Absent', value: summary.absent, color: 'text-red-600', Icon: XCircle },
          { label: 'Late', value: summary.late, color: 'text-yellow-600', Icon: Clock },
          { label: 'Rate', value: `${rate}%`, color: 'text-blue-600', Icon: TrendingUp },
        ].map(({ label, value, color, Icon }) => (
          <Card key={label}><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><Icon className={`w-5 h-5 ${color}`} /><div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div></div></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Attendance history</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
              <TableBody>
                {records.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No attendance records yet.</TableCell></TableRow>
                  : records.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{format(new Date(r.date), 'EEEE, dd MMM yyyy')}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls[r.status]}`}>{r.status}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.remarks || '—'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
