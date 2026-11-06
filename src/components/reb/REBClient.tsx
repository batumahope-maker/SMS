'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Users, School, Award, BookOpen } from 'lucide-react';

const OLEVEL = ['S1', 'S2', 'S3'];
const ALEVEL = ['S4', 'S5', 'S6'];
const OLEVEL_COMBOS = ['MCE', 'MPC', 'MEG', 'HEG', 'HGL', 'HPE', 'PCB', 'PCM', 'HKL', 'ECS'];
const ALEVEL_COMBOS = ['MPC', 'MPG', 'MCB', 'MEG', 'HEG', 'HGL', 'HPE', 'PCB', 'PCM', 'ECS', 'HKL', 'BCG'];
const SECTIONS = ['A', 'B', 'C', 'D'];

interface Class {
  id: string; name: string; level: string; section: string; combination: string;
  teacher: { fullName: string } | null;
  _count: { students: number; subjects: number };
}
interface Student {
  id: string; fullName: string; studentId: string; level: string; section: string;
  combination: string; gender: string; feePaid: number; feeBalance: number;
  class: { name: string } | null;
}

interface REBClientProps {
  oLevelClasses: Class[]; aLevelClasses: Class[];
  oLevelStudents: Student[]; aLevelStudents: Student[];
}

const levelColor: Record<string, string> = {
  S1: 'bg-blue-100 text-blue-800', S2: 'bg-blue-100 text-blue-800', S3: 'bg-blue-100 text-blue-800',
  S4: 'bg-purple-100 text-purple-800', S5: 'bg-purple-100 text-purple-800', S6: 'bg-purple-100 text-purple-800',
};

export function REBClient({ oLevelClasses, aLevelClasses, oLevelStudents, aLevelStudents }: REBClientProps) {
  const [tab, setTab] = useState<'olevel' | 'alevel'>('olevel');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [openAddClass, setOpenAddClass] = useState(false);
  const [classForm, setClassForm] = useState({ level: 'S1', section: 'A', combination: 'none' });
  const [saving, setSaving] = useState(false);

  const students = tab === 'olevel' ? oLevelStudents : aLevelStudents;
  const classes = tab === 'olevel' ? oLevelClasses : aLevelClasses;
  const levels = tab === 'olevel' ? OLEVEL : ALEVEL;
  const combos = tab === 'olevel' ? OLEVEL_COMBOS : ALEVEL_COMBOS;

  const filtered = students.filter(s => {
    const ms = s.fullName.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase());
    const ml = levelFilter === 'all' || s.level === levelFilter;
    return ms && ml;
  });

  async function handleAddClass() {
    setSaving(true);
    try {
      const name = classForm.combination
        ? `${classForm.level} ${classForm.combination} ${classForm.section}`
        : `${classForm.level} ${classForm.section}`;
      await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, level: classForm.level, section: classForm.section,
          combination: classForm.combination, trade: '', systemType: 'reb',
        }),
      });
      setOpenAddClass(false);
      window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />REB Section
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ordinary Level (S1–S3) and Advanced Level (S4–S6) management
          </p>
        </div>
        <Dialog open={openAddClass} onOpenChange={setOpenAddClass}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add new REB class</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Level</Label>
                <Select value={classForm.level} onValueChange={v => setClassForm(p => ({ ...p, level: v, combination: 'none' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S1" disabled>— O&apos;Level —</SelectItem>
                    {OLEVEL.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    <SelectItem value="S4" disabled>— A&apos;Level —</SelectItem>
                    {ALEVEL.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Combination</Label>
                <Select value={classForm.combination} onValueChange={v => setClassForm(p => ({ ...p, combination: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select combination (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No combination</SelectItem>
                    {(ALEVEL.includes(classForm.level) ? ALEVEL_COMBOS : OLEVEL_COMBOS).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={classForm.section} onValueChange={v => setClassForm(p => ({ ...p, section: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                Class name preview: <strong>
                  {classForm.combination
                    ? `${classForm.level} ${classForm.combination} ${classForm.section}`
                    : `${classForm.level} ${classForm.section}`}
                </strong>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleAddClass} disabled={saving} className="flex-1">
                  {saving ? 'Creating...' : 'Create class'}
                </Button>
                <Button variant="outline" onClick={() => setOpenAddClass(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* O'Level / A'Level tab switcher */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab('olevel'); setLevelFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'olevel' ? 'bg-blue-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}
        >
          O&apos;Level &nbsp;<span className="opacity-75 text-xs">S1 · S2 · S3</span>
        </button>
        <button
          onClick={() => { setTab('alevel'); setLevelFilter('all'); }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'alevel' ? 'bg-purple-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}
        >
          A&apos;Level &nbsp;<span className="opacity-75 text-xs">S4 · S5 · S6</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Classes', value: classes.length, Icon: School, color: tab === 'olevel' ? 'text-blue-600' : 'text-purple-600' },
          { label: 'Students', value: students.length, Icon: Users, color: tab === 'olevel' ? 'text-blue-600' : 'text-purple-600' },
          { label: 'Male', value: students.filter(s => s.gender === 'Male').length, Icon: Users, color: 'text-blue-500' },
          { label: 'Female', value: students.filter(s => s.gender === 'Female').length, Icon: Users, color: 'text-pink-500' },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label}><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* Classes grid */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />{tab === 'olevel' ? "O'Level" : "A'Level"} classes ({classes.length})
        </h2>
        {classes.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
            No {tab === 'olevel' ? "O'Level" : "A'Level"} classes yet. Click "Add class" to create one.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {classes.map(cls => (
              <Card key={cls.id} className="border hover:shadow-sm transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{cls.name}</p>
                      {cls.combination && <p className="text-xs text-muted-foreground">Combination: {cls.combination}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[cls.level]}`}>{cls.level}</span>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{cls._count.students}</strong> students</span>
                    <span><strong className="text-foreground">{cls._count.subjects}</strong> subjects</span>
                  </div>
                  {cls.teacher && <p className="text-xs text-muted-foreground mt-2">Teacher: {cls.teacher.fullName}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Students table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tab === 'olevel' ? "O'Level" : "A'Level"} students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Class</TableHead>
                  {tab === 'alevel' && <TableHead>Combination</TableHead>}
                  <TableHead>Gender</TableHead>
                  <TableHead>Balance (RWF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={tab === 'alevel' ? 6 : 5} className="text-center py-10 text-muted-foreground">No students found</TableCell></TableRow>
                  : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{s.fullName}</p>
                        <p className="text-xs text-muted-foreground">{s.studentId}</p>
                      </TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[s.level]}`}>{s.level}</span></TableCell>
                      <TableCell className="text-sm">{s.class?.name || `${s.level} ${s.section}`}</TableCell>
                      {tab === 'alevel' && <TableCell><Badge variant="outline" className="text-xs">{s.combination || '—'}</Badge></TableCell>}
                      <TableCell className="text-sm">{s.gender}</TableCell>
                      <TableCell className={s.feeBalance > 0 ? 'text-red-600 font-medium text-sm' : 'text-green-600 text-sm'}>{s.feeBalance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {students.length} students</p>
        </CardContent>
      </Card>
    </div>
  );
}
