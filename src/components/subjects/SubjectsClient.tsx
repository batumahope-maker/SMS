'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, BookOpen } from 'lucide-react';

interface Subject { id: string; name: string; code: string | null; status: string; class: { name: string } | null; teacher: { fullName: string } | null; _count: { marks: number } }
interface SubjectsPageClientProps {
  subjects: Subject[];
  classes: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
}

export function SubjectsPageClient({ subjects, classes, teachers }: SubjectsPageClientProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', classId: '', teacherId: '' });
  const [saving, setSaving] = useState(false);

  const filtered = subjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase()));

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    try {
      await fetch('/api/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setOpen(false);
      window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage academic subjects and assign teachers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Add subject</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add new subject</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Subject name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mathematics" /></div>
              <div><Label>Subject code</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. MATH101" /></div>
              <div><Label>Class</Label>
                <Select value={form.classId} onValueChange={v => setForm(p => ({ ...p, classId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class (optional)" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Teacher</Label>
                <Select value={form.teacherId} onValueChange={v => setForm(p => ({ ...p, teacherId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Assign teacher (optional)" /></SelectTrigger>
                  <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Add subject'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Total subjects</p><p className="text-2xl font-bold text-blue-600">{subjects.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">With teacher</p><p className="text-2xl font-bold text-green-600">{subjects.filter(s => s.teacher).length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">No teacher assigned</p><p className="text-2xl font-bold text-orange-600">{subjects.filter(s => !s.teacher).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">All subjects</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search subjects..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Class</TableHead><TableHead>Teacher</TableHead><TableHead>Marks entered</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No subjects found</TableCell></TableRow>
                  : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><span className="bg-secondary text-xs px-2 py-0.5 rounded font-mono">{s.code || '—'}</span></TableCell>
                      <TableCell>{s.class?.name || '—'}</TableCell>
                      <TableCell>{s.teacher?.fullName || <span className="text-orange-500 text-sm">Unassigned</span>}</TableCell>
                      <TableCell>{s._count.marks}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{s.status}</span></TableCell>
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
