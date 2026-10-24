'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, BookOpen, FileText, Download } from 'lucide-react';

interface Mark { id: string; marks: number; grade: string | null; term: string; examType: string; academicYear: string; subject: { name: string; code: string | null } }
interface StudentGradesClientProps { marks: Mark[]; studentName: string; studentId: string }

function getGrade(m: number) {
  if (m >= 90) return 'A+'; if (m >= 80) return 'A'; if (m >= 70) return 'B';
  if (m >= 60) return 'C'; if (m >= 50) return 'D'; return 'F';
}
const gradeCls: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-800', A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800',
  C: 'bg-yellow-100 text-yellow-800', D: 'bg-orange-100 text-orange-800', F: 'bg-red-100 text-red-800',
};

export function StudentGradesClient({ marks, studentName, studentId }: StudentGradesClientProps) {
  const [termFilter, setTermFilter] = useState('all');
  const terms = [...new Set(marks.map(m => m.term))].sort();
  const filtered = termFilter === 'all' ? marks : marks.filter(m => m.term === termFilter);
  const avg = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m.marks, 0) / marks.length) : 0;
  const best = marks.length > 0 ? Math.max(...marks.map(m => m.marks)) : 0;
  const uniqueSubjects = [...new Set(marks.map(m => m.subject.name))].length;
  const passed = marks.filter(m => m.marks >= 50).length;
  const bySubject: Record<string, number[]> = {};
  marks.forEach(m => { bySubject[m.subject.name] = [...(bySubject[m.subject.name] || []), m.marks]; });
  const subjectChart = Object.entries(bySubject).map(([name, ms]) => ({
    subject: name.length > 12 ? name.substring(0, 12) + '…' : name,
    average: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length),
  })).sort((a, b) => b.average - a.average);
  const reportCardTerm = termFilter !== 'all' ? termFilter : (terms[terms.length - 1] || 'Term 1');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My grades</h1>
          <p className="text-muted-foreground text-sm mt-1">Academic performance for {studentName}</p>
        </div>
        <a href={`/api/report-card?studentId=${studentId}&term=${encodeURIComponent(reportCardTerm)}`} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-2" />Download report card</Button>
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall average', value: `${avg}%`, color: avg >= 50 ? 'text-green-600' : 'text-red-600', Icon: TrendingUp },
          { label: 'Best score', value: `${best}%`, color: 'text-emerald-600', Icon: Award },
          { label: 'Subjects passed', value: `${passed}/${uniqueSubjects}`, color: 'text-blue-600', Icon: BookOpen },
          { label: 'Assessments', value: marks.length, color: 'text-purple-600', Icon: FileText },
        ].map(({ label, value, color, Icon }) => (
          <Card key={label}><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3"><Icon className={`w-5 h-5 ${color}`} /><div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div></div>
          </CardContent></Card>
        ))}
      </div>

      {subjectChart.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Performance by subject</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Average']} />
                <Bar dataKey="average" radius={[4, 4, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Mark sheet</CardTitle>
            <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger className="w-36 h-8"><SelectValue placeholder="All terms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All terms</SelectItem>
                {terms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0
            ? <p className="text-center py-10 text-muted-foreground text-sm">No marks recorded yet.</p>
            : <div className="rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Term</TableHead><TableHead>Type</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(m => {
                      const grade = m.grade || getGrade(m.marks);
                      const pass = m.marks >= 50;
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.subject.name}{m.subject.code && <span className="text-xs text-muted-foreground ml-1">({m.subject.code})</span>}</TableCell>
                          <TableCell>{m.term}</TableCell>
                          <TableCell><span className="bg-secondary text-xs px-2 py-0.5 rounded">{m.examType}</span></TableCell>
                          <TableCell><span className={`font-bold text-base ${pass ? 'text-green-600' : 'text-red-600'}`}>{m.marks}<span className="text-xs font-normal text-muted-foreground">/100</span></span></TableCell>
                          <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeCls[grade] || gradeCls.F}`}>{grade}</span></TableCell>
                          <TableCell><span className={`text-xs font-medium ${pass ? 'text-green-600' : 'text-red-600'}`}>{pass ? 'Pass' : 'Fail'}</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>}
          {filtered.length > 0 && (
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">{filtered.length} assessments</span>
              <span className="font-medium">Term average: {Math.round(filtered.reduce((s, m) => s + m.marks, 0) / filtered.length)}%</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2"><FileText className="w-5 h-5" />Official report card</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">Download your printable report card — opens in a new tab, then print to PDF</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(terms.length > 0 ? terms : ['Term 1', 'Term 2', 'Term 3']).map(t => (
                <a key={t} href={`/api/report-card?studentId=${studentId}&term=${encodeURIComponent(t)}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="border-emerald-300 hover:bg-emerald-100">
                    <Download className="w-3 h-3 mr-1.5" />{t}
                  </Button>
                </a>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
