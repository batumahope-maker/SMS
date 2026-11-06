'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Save, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';

interface Student { id: string; fullName: string; studentId: string }
interface ClassWithStudents { id: string; name: string; students: Student[] }
interface RecentRecord { id: string; date: Date; status: string; student: { fullName: string; studentId: string } }

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface TeacherAttendanceClientProps {
  classes: ClassWithStudents[];
  recentAttendance: RecentRecord[];
  teacherId: string;
}

const statusOptions: { value: AttendanceStatus; label: string; color: string; Icon: React.ElementType }[] = [
  { value: 'present', label: 'Present', color: 'bg-green-500 hover:bg-green-600', Icon: CheckCircle },
  { value: 'absent',  label: 'Absent',  color: 'bg-red-500 hover:bg-red-600',    Icon: XCircle },
  { value: 'late',    label: 'Late',    color: 'bg-yellow-500 hover:bg-yellow-600', Icon: Clock },
  { value: 'excused', label: 'Excused', color: 'bg-blue-500 hover:bg-blue-600',  Icon: AlertCircle },
];

const badgeCls: Record<string, string> = {
  present: 'bg-green-100 text-green-800', absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800', excused: 'bg-blue-100 text-blue-800',
};

export function TeacherAttendanceClient({ classes, recentAttendance, teacherId }: TeacherAttendanceClientProps) {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || '');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentClass = classes.find(c => c.id === selectedClass);
  const today = format(new Date(), 'EEEE, dd MMMM yyyy');

  function markAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {};
    currentClass?.students.forEach(s => { next[s.id] = status; });
    setAttendance(next);
  }

  async function handleSubmit() {
    if (!currentClass) return;
    const records = currentClass.students.map(s => ({
      studentId: s.id,
      classId: selectedClass,
      status: attendance[s.id] || 'absent',
      markedBy: teacherId,
      date: new Date().toISOString(),
    }));
    setSaving(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      if (res.ok) {
        setSaved(true);
        setAttendance({});
        setTimeout(() => { setSaved(false); window.location.reload(); }, 2000);
      }
    } finally { setSaving(false); }
  }

  const marked = Object.keys(attendance).length;
  const total = currentClass?.students.length || 0;
  const presentCount = Object.values(attendance).filter(s => s === 'present').length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6" />Take attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">{today}</p>
      </div>

      {classes.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No classes assigned to you yet. Contact the admin to assign classes.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Select class:</label>
                  <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setAttendance({}); }}>
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.students.length} students)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-green-600">{presentCount} present</span>
                  <span>·</span>
                  <span>{marked}/{total} marked</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentClass && currentClass.students.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base">{currentClass.name} — {total} students</CardTitle>
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground self-center">Mark all:</span>
                    {statusOptions.map(s => (
                      <Button key={s.value} size="sm" variant="outline" onClick={() => markAll(s.value)} className="text-xs h-7 px-2">
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Attendance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentClass.students.map((student, idx) => {
                        const current = attendance[student.id];
                        return (
                          <TableRow key={student.id} className={current === 'present' ? 'bg-green-50' : current === 'absent' ? 'bg-red-50' : current === 'late' ? 'bg-yellow-50' : ''}>
                            <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{student.fullName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{student.studentId}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {statusOptions.map(opt => (
                                  <button
                                    key={opt.value}
                                    onClick={() => setAttendance(prev => ({ ...prev, [student.id]: opt.value }))}
                                    className={`px-3 py-1 rounded text-xs font-medium text-white transition-all ${current === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-current scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSubmit} disabled={saving || saved || marked === 0} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : saved ? 'Saved!' : `Submit attendance (${marked}/${total})`}
                  </Button>
                  {marked < total && <p className="text-sm text-amber-600">{total - marked} students not yet marked</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {currentClass?.students.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No students in this class yet.</CardContent></Card>
          )}
        </>
      )}

      {/* Recent records */}
      {recentAttendance.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent records</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {recentAttendance.slice(0, 20).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.student.fullName}<p className="text-xs text-muted-foreground">{r.student.studentId}</p></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(r.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeCls[r.status]}`}>{r.status}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
