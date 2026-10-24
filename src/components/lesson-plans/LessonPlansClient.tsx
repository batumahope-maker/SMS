'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText, BookOpen, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Plan { id: string; title: string; objectives: string | null; content: string; date: Date; duration: number | null; subject: { name: string } }
interface LessonPlansClientProps { plans: Plan[]; subjects: { id: string; name: string }[]; teacherId: string }

export function LessonPlansClient({ plans, subjects, teacherId }: LessonPlansClientProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', subjectId: '', objectives: '', content: '', resources: '', date: '', duration: '60' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = plans.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.subject.name.toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.title || !form.subjectId || !form.date) return;
    setSaving(true);
    try {
      await fetch('/api/lesson-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, teacherId, duration: parseInt(form.duration) }),
      });
      setOpen(false);
      setForm({ title: '', subjectId: '', objectives: '', content: '', resources: '', date: '', duration: '60' });
      window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" />Lesson plans</h1>
          <p className="text-muted-foreground text-sm mt-1">Plan and document your lessons</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />New lesson plan</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create lesson plan</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
              <div><Label>Lesson title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Introduction to Algebra" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Subject *</Label>
                  <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} min="15" step="5" />
                </div>
              </div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Learning objectives</Label><Textarea value={form.objectives} onChange={e => setForm(p => ({ ...p, objectives: e.target.value }))} placeholder="What will students learn?" rows={2} /></div>
              <div><Label>Content / activities *</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Lesson content and teaching activities..." rows={4} /></div>
              <div><Label>Resources needed</Label><Input value={form.resources} onChange={e => setForm(p => ({ ...p, resources: e.target.value }))} placeholder="e.g. Textbook p.45, projector, worksheets" /></div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save lesson plan'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Total plans</p><p className="text-2xl font-bold text-blue-600">{plans.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">This month</p><p className="text-2xl font-bold">{plans.filter(p => { const d = new Date(p.date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">All lesson plans</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search plans..." value={search} onChange={e => setSearch(e.target.value)} />
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{plans.length === 0 ? 'No lesson plans yet. Create your first one!' : 'No plans match your search.'}</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="border rounded-lg p-4 space-y-2 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium">{p.title}</h3>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(p.date), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{p.subject.name}</span>
                    {p.duration && <span>{p.duration} min</span>}
                  </div>
                  {p.objectives && <p className="text-sm text-muted-foreground line-clamp-2">{p.objectives}</p>}
                  <p className="text-sm line-clamp-2">{p.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
