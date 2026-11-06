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
import { Search, Plus, Users, Building2, Layers } from 'lucide-react';

const TVET_LEVELS = ['L3', 'L4', 'L5'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const TRADES = [
  'Software Development', 'Electronics & Telecommunications', 'Electricity',
  'Mechanics & Automotive', 'Civil & Construction', 'Carpentry & Joinery',
  'Plumbing & Sanitation', 'Welding & Metal Fabrication', 'Tailoring & Fashion Design',
  'Catering & Food Processing', 'Agriculture & Food Science', 'Accounting & Finance',
  'Business Management', 'Hairdressing & Beauty',
];

const levelColor: Record<string, string> = {
  L3: 'bg-teal-100 text-teal-800',
  L4: 'bg-emerald-100 text-emerald-800',
  L5: 'bg-green-100 text-green-800',
};

interface Class {
  id: string; name: string; level: string; section: string; trade: string;
  teacher: { fullName: string } | null;
  _count: { students: number; subjects: number };
}
interface Student {
  id: string; fullName: string; studentId: string; level: string; section: string;
  trade: string; gender: string; feePaid: number; feeBalance: number;
  class: { name: string } | null;
}
interface TVETClientProps {
  classes: Class[]; students: Student[];
  tradeMap: Record<string, Class[]>;
}

export function TVETClient({ classes, students, tradeMap }: TVETClientProps) {
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [openAddClass, setOpenAddClass] = useState(false);
  const [form, setForm] = useState({ trade: TRADES[0], level: 'L3', section: 'A' });
  const [saving, setSaving] = useState(false);

  const trades = Object.keys(tradeMap).sort();
  const filtered = students.filter(s => {
    const ms = s.fullName.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase());
    const mt = tradeFilter === 'all' || s.trade === tradeFilter;
    const ml = levelFilter === 'all' || s.level === levelFilter;
    return ms && mt && ml;
  });

  async function handleAddClass() {
    setSaving(true);
    try {
      const name = `${form.trade} ${form.level} ${form.section}`;
      await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, trade: form.trade, level: form.level, section: form.section, combination: '', systemType: 'tvet' }),
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
            <Building2 className="w-6 h-6 text-emerald-600" />TVET Section
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Technical & Vocational Education — L3, L4, L5</p>
        </div>
        <Dialog open={openAddClass} onOpenChange={setOpenAddClass}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add class</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add new TVET class</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Trade / Programme</Label>
                <Select value={form.trade} onValueChange={v => setForm(p => ({ ...p, trade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Level</Label>
                  <Select value={form.level} onValueChange={v => setForm(p => ({ ...p, level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TVET_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select value={form.section} onValueChange={v => setForm(p => ({ ...p, section: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                Class name: <strong>{form.trade} {form.level} {form.section}</strong>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddClass} disabled={saving} className="flex-1">
                  {saving ? 'Creating...' : 'Create class'}
                </Button>
                <Button variant="outline" onClick={() => setOpenAddClass(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Trades', value: trades.length, color: 'text-emerald-600' },
          { label: 'Classes', value: classes.length, color: 'text-teal-600' },
          { label: 'Students', value: students.length, color: 'text-blue-600' },
          { label: 'Male / Female', value: `${students.filter(s => s.gender === 'Male').length} / ${students.filter(s => s.gender === 'Female').length}`, color: 'text-purple-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}><CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Classes by trade */}
      {trades.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          No TVET classes yet. Click "Add class" to create one.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2"><Layers className="w-4 h-4" />Classes by trade</h2>
          {trades.map(trade => (
            <Card key={trade}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{trade}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tradeMap[trade].map(cls => (
                    <div key={cls.id} className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-secondary/30 text-sm">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${levelColor[cls.level]}`}>{cls.level}</span>
                      <span className="font-medium">Section {cls.section}</span>
                      <span className="text-muted-foreground">· {cls._count.students} students</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Students table */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">All TVET students</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name or ID..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Trade" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All trades</SelectItem>
                {trades.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {TVET_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead><TableHead>Trade</TableHead>
                  <TableHead>Level</TableHead><TableHead>Class</TableHead>
                  <TableHead>Gender</TableHead><TableHead>Balance (RWF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No students found</TableCell></TableRow>
                  : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell><p className="font-medium text-sm">{s.fullName}</p><p className="text-xs text-muted-foreground">{s.studentId}</p></TableCell>
                      <TableCell className="text-sm max-w-32"><span className="truncate block">{s.trade || '—'}</span></TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor[s.level] || ''}`}>{s.level}</span></TableCell>
                      <TableCell className="text-sm">{s.class?.name || `${s.trade} ${s.level} ${s.section}`}</TableCell>
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
