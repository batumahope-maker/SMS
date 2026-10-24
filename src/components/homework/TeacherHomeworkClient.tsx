'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, BookOpen, Clock, Users } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface HomeworkItem {
  id: string; title: string; description: string; dueDate: Date;
  subject: { name: string }; class: { name: string }; _count: { submissions: number }
}
interface ClassData { id: string; name: string; subjects: { id: string; name: string }[]; _count: { students: number } }

interface TeacherHomeworkClientProps { homework: HomeworkItem[]; classes: ClassData[]; teacherId: string }

export function TeacherHomeworkClient({ homework, classes, teacherId }: TeacherHomeworkClientProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', classId: '', subjectId: '', dueDate: '', maxMarks: '' });
  const [saving, setSaving] = useState(false);

  const selectedClassData = classes.find(c => c.id === form.classId);
  const active = homework.filter(h => !isPast(new Date(h.dueDate)));
  const past = homework.filter(h => isPast(new Date(h.dueDate)));

  async function handleSave() {
    if (!form.title || !form.classId || !form.subjectId || !form.dueDate) return;
    setSaving(true);
    try {
      await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, teacherId, maxMarks: form.maxMarks ? parseFloat(form.maxMarks) : null }),
      });
      setOpen(false);
      setForm({ title: '', description: '', classId: '', subjectId: '', dueDate: '', maxMarks: '' });
      window.location.reload();
    } finally { setSaving(false); }
  }

  function HomeworkCard({ h }: { h: HomeworkItem }) {
    const overdue = isPast(new Date(h.dueDate));
    return (
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{h.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${overdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{overdue ? 'Closed' : 'Active'}</span>
        </div>
        <p className="text-sm text-muted-foreground">{h.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{h.subject.name}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{h.class.name}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due: {format(new Date(h.dueDate), 'dd MMM yyyy')}</span>
          <span className="ml-auto font-medium text-blue-600">{h._count.submissions} submissions</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Homework</h1>
          <p className="text-muted-foreground text-sm mt-1">Assign and track homework for your classes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Assign homework</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Assign new homework</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Homework title" /></div>
              <div><Label>Description / instructions</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What should students do?" rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Class *</Label>
                  <Select value={form.classId} onValueChange={v => setForm(p => ({ ...p, classId: v, subjectId: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject *</Label>
                  <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))} disabled={!form.classId}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{selectedClassData?.subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Due date *</Label><Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
                <div><Label>Max marks</Label><Input type="number" value={form.maxMarks} onChange={e => setForm(p => ({ ...p, maxMarks: e.target.value }))} placeholder="e.g. 20" /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Assign homework'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Total assigned</p><p className="text-2xl font-bold">{homework.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{active.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Total submissions</p><p className="text-2xl font-bold text-blue-600">{homework.reduce((s, h) => s + h._count.submissions, 0)}</p></CardContent></Card>
      </div>

      {active.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base text-green-700">Active homework ({active.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">{active.map(h => <HomeworkCard key={h.id} h={h} />)}</CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base text-muted-foreground">Past homework ({past.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">{past.slice(0, 10).map(h => <HomeworkCard key={h.id} h={h} />)}</CardContent>
        </Card>
      )}

      {homework.length === 0 && (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No homework assigned yet. Click "Assign homework" to get started.</CardContent></Card>
      )}
    </div>
  );
}
