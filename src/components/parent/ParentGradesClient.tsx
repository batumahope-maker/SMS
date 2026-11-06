'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, TrendingUp } from 'lucide-react';

interface Mark { id: string; marks: number; grade: string | null; term: string; examType: string; subject: { name: string } }
interface Child { id: string; fullName: string; studentId: string; class: string | null }
export function ParentGradesClient({ children, marksByChild }: { children: Child[]; marksByChild: Record<string, Mark[]> }) {
  const [sel, setSel] = useState(children[0]?.id || '');
  const [term, setTerm] = useState('all');
  const marks = (marksByChild[sel] || []).filter(m => term === 'all' || m.term === term);
  const avg = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m.marks, 0) / marks.length) : 0;
  const child = children.find(c => c.id === sel);
  const gradeColor: Record<string, string> = { 'A+': 'bg-emerald-100 text-emerald-800', A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800', C: 'bg-yellow-100 text-yellow-800', D: 'bg-orange-100 text-orange-800', F: 'bg-red-100 text-red-800' };
  const g = (m: number) => m >= 90 ? 'A+' : m >= 80 ? 'A' : m >= 70 ? 'B' : m >= 60 ? 'C' : m >= 50 ? 'D' : 'F';
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Grades</h1><p className="text-muted-foreground text-sm mt-1">Academic performance for your children</p></div>
      {children.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card> : (
        <>
          <div className="flex gap-3 flex-wrap">
            <Select value={sel} onValueChange={setSel}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent></Select>
            <Select value={term} onValueChange={setTerm}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All terms</SelectItem><SelectItem value="Term 1">Term 1</SelectItem><SelectItem value="Term 2">Term 2</SelectItem><SelectItem value="Term 3">Term 3</SelectItem></SelectContent></Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Class</p><p className="font-bold">{child?.class || '—'}</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Average</p><p className="text-2xl font-bold text-green-600">{avg}%</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Assessments</p><p className="text-2xl font-bold">{marks.length}</p></CardContent></Card>
          </div>
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Mark sheet — {child?.fullName}</CardTitle></CardHeader><CardContent>
            {marks.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No marks recorded yet.</p>
              : <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Term</TableHead><TableHead>Type</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                  <TableBody>{marks.map(m => { const gr = m.grade || g(m.marks); return <TableRow key={m.id}><TableCell className="font-medium">{m.subject.name}</TableCell><TableCell>{m.term}</TableCell><TableCell><span className="bg-secondary text-xs px-2 py-0.5 rounded">{m.examType}</span></TableCell><TableCell className="font-bold">{m.marks}/100</TableCell><TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor[gr] || gradeColor.F}`}>{gr}</span></TableCell></TableRow>; })}</TableBody>
                </Table></div>}
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
