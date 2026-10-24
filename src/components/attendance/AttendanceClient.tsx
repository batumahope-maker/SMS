'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, AlertCircle, Search, Download, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string; date: Date; status: string; remarks: string | null;
  student: { fullName: string; studentId: string };
  class: { name: string } | null;
}
interface AttendanceClientProps {
  records: AttendanceRecord[];
  classes: { id: string; name: string }[];
  summary: { present: number; absent: number; late: number; excused: number; total: number };
}

const statusCfg: Record<string, { label: string; cls: string }> = {
  present: { label: 'Present', cls: 'bg-green-100 text-green-800' },
  absent:  { label: 'Absent',  cls: 'bg-red-100 text-red-800' },
  late:    { label: 'Late',    cls: 'bg-yellow-100 text-yellow-800' },
  excused: { label: 'Excused', cls: 'bg-blue-100 text-blue-800' },
};

export function AttendanceClient({ records, classes, summary }: AttendanceClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const filtered = records.filter(r => {
    const ms = r.student.fullName.toLowerCase().includes(search.toLowerCase()) || r.student.studentId.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === 'all' || r.status === statusFilter;
    const mc = classFilter === 'all' || r.class?.name === classFilter;
    return ms && mst && mc;
  });

  const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage all student attendance records</p>
        </div>
        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present', value: summary.present, color: 'text-green-600', Icon: CheckCircle },
          { label: 'Absent', value: summary.absent, color: 'text-red-600', Icon: XCircle },
          { label: 'Late', value: summary.late, color: 'text-yellow-600', Icon: Clock },
          { label: 'Rate', value: `${rate}%`, color: 'text-blue-600', Icon: TrendingUp },
        ].map(({ label, value, color, Icon }) => (
          <Card key={label}><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Attendance records</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search student..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(statusCfg).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead><TableHead>ID</TableHead>
                  <TableHead>Class</TableHead><TableHead>Date</TableHead>
                  <TableHead>Status</TableHead><TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No records found</TableCell></TableRow>
                  : filtered.map(r => {
                    const cfg = statusCfg[r.status] || statusCfg.present;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.student.fullName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.student.studentId}</TableCell>
                        <TableCell>{r.class?.name || '—'}</TableCell>
                        <TableCell>{format(new Date(r.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.remarks || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {records.length} records</p>
        </CardContent>
      </Card>
    </div>
  );
}
