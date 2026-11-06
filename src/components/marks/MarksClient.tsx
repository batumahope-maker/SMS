'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Download, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Mark {
  id: string; marks: number; grade: string | null; term: string; examType: string; academicYear: string;
  student: { fullName: string; studentId: string };
  subject: { name: string; code: string | null };
  teacher: { fullName: string } | null;
}
interface MarksClientProps {
  marks: Mark[];
  students: { id: string; fullName: string; studentId: string }[];
  subjects: { id: string; name: string; code: string | null }[];
  stats: { avg: number; highest: number; lowest: number; total: number };
}

function calcGrade(m: number): string {
  if (m >= 90) return 'A+'; if (m >= 80) return 'A'; if (m >= 70) return 'B';
  if (m >= 60) return 'C'; if (m >= 50) return 'D'; return 'F';
}

const gradeColor: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-800', A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800', C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-orange-100 text-orange-800', F: 'bg-red-100 text-red-800',
};

export function MarksClient({ marks, students, subjects, stats }: MarksClientProps) {
  const [search, setSearch] = useState('');
  const [termFilter, setTermFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ studentId: '', subjectId: '', marks: '', term: 'Term 1', examType: 'Test', academicYear: new Date().getFullYear().toString() });
  const [saving, setSaving] = useState(false);

  const filtered = marks.filter(m => {
    const ms = m.student.fullName.toLowerCase().includes(search.toLowerCase()) || m.subject.name.toLowerCase().includes(search.toLowerCase());
    const mt = termFilter === 'all' || m.term === termFilter;
    const me = examFilter === 'all' || m.examType === examFilter;
    return ms && mt && me;
  });

  async function handleSave() {
    if (!form.studentId || !form.subjectId || !form.marks) return;
    setSaving(true);
    try {
      await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, marks: parseFloat(form.marks) }),
      });
      setOpen(false);
      setForm({ studentId: '', subjectId: '', marks: '', term: 'Term 1', examType: 'Test', academicYear: new Date().getFullYear().toString() });
      window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marks & Grades</h1>
          <p className="text-muted-foreground text-sm mt-1">View, enter and manage student academic marks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add marks</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enter marks</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Student</Label>
                  <Select value={form.studentId} onValueChange={v => setForm(p => ({ ...p, studentId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.studentId})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Subject</Label>
                  <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Term</Label>
                    <Select value={form.term} onValueChange={v => setForm(p => ({ ...p, term: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Term 1">Term 1</SelectItem><SelectItem value="Term 2">Term 2</SelectItem><SelectItem value="Term 3">Term 3</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Exam type</Label>
                    <Select value={form.examType} onValueChange={v => setForm(p => ({ ...p, examType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Test">Test</SelectItem><SelectItem value="CAT">CAT</SelectItem><SelectItem value="Exam">Exam</SelectItem><SelectItem value="Assignment">Assignment</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Marks (out of 100)</Label>
                  <Input type="number" min="0" max="100" value={form.marks} onChange={e => setForm(p => ({ ...p, marks: e.target.value }))} placeholder="e.g. 78" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save marks'}</Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total entries', value: stats.total, color: 'text-blue-600' },
          { label: 'Class average', value: `${stats.avg}%`, color: 'text-green-600' },
          { label: 'Highest score', value: `${stats.highest}%`, color: 'text-emerald-600' },
          { label: 'Lowest score', value: `${stats.lowest}%`, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">All marks</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search student or subject..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All terms</SelectItem>
                <SelectItem value="Term 1">Term 1</SelectItem><SelectItem value="Term 2">Term 2</SelectItem><SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Exam type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Test">Test</SelectItem><SelectItem value="CAT">CAT</SelectItem><SelectItem value="Exam">Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Term</TableHead>
                  <TableHead>Type</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead><TableHead>Teacher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No marks found</TableCell></TableRow>
                  : filtered.map(m => {
                    const grade = m.grade || calcGrade(m.marks);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.student.fullName}<p className="text-xs text-muted-foreground">{m.student.studentId}</p></TableCell>
                        <TableCell>{m.subject.name}<p className="text-xs text-muted-foreground">{m.subject.code}</p></TableCell>
                        <TableCell>{m.term}</TableCell>
                        <TableCell><span className="bg-secondary text-xs px-2 py-0.5 rounded">{m.examType}</span></TableCell>
                        <TableCell className="font-bold text-lg">{m.marks}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor[grade] || gradeColor.F}`}>{grade}</span></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.teacher?.fullName || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {marks.length} entries</p>
        </CardContent>
      </Card>
    </div>
  );
}
