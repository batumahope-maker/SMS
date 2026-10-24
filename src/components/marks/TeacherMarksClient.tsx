'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Save, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Student { id: string; fullName: string; studentId: string }
interface Subject { id: string; name: string; code: string | null }
interface ClassData { id: string; name: string; students: Student[]; subjects: Subject[] }
interface RecentMark { id: string; marks: number; grade: string | null; term: string; examType: string; student: { fullName: string; studentId: string }; subject: { name: string } }

interface TeacherMarksClientProps { classes: ClassData[]; recentMarks: RecentMark[]; teacherId: string }

function getGrade(m: number) {
  if (m >= 90) return 'A+'; if (m >= 80) return 'A'; if (m >= 70) return 'B';
  if (m >= 60) return 'C'; if (m >= 50) return 'D'; return 'F';
}

const gradeCls: Record<string, string> = {
  'A+': 'text-emerald-600', A: 'text-green-600', B: 'text-blue-600',
  C: 'text-yellow-600', D: 'text-orange-600', F: 'text-red-600',
};

export function TeacherMarksClient({ classes, recentMarks, teacherId }: TeacherMarksClientProps) {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [examType, setExamType] = useState('Test');
  const [academicYear] = useState(new Date().getFullYear().toString());
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentClass = classes.find(c => c.id === selectedClass);

  function handleClassChange(classId: string) {
    setSelectedClass(classId);
    setSelectedSubject('');
    setMarksInput({});
  }

  async function handleSubmit() {
    if (!selectedSubject || !currentClass) return;
    const records = currentClass.students
      .filter(s => marksInput[s.id] && !isNaN(parseFloat(marksInput[s.id])))
      .map(s => {
        const m = parseFloat(marksInput[s.id]);
        return { studentId: s.id, subjectId: selectedSubject, teacherId, marks: m, grade: getGrade(m), term, examType, academicYear };
      });
    if (records.length === 0) return;
    setSaving(true);
    try {
      await fetch('/api/marks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records }) });
      setSaved(true);
      setMarksInput({});
      setTimeout(() => { setSaved(false); window.location.reload(); }, 2000);
    } finally { setSaving(false); }
  }

  const entered = Object.values(marksInput).filter(v => v !== '' && !isNaN(parseFloat(v))).length;
  const total = currentClass?.students.length || 0;
  const classAvg = entered > 0 ? Math.round(Object.values(marksInput).filter(v => !isNaN(parseFloat(v))).reduce((s, v) => s + parseFloat(v), 0) / entered) : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" />Enter marks</h1>
        <p className="text-muted-foreground text-sm mt-1">Record student marks by class and subject</p>
      </div>

      {classes.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No classes assigned to you yet.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Class</Label>
                  <Select value={selectedClass} onValueChange={handleClassChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {currentClass?.subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Term</Label>
                  <Select value={term} onValueChange={setTerm}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Term 1">Term 1</SelectItem><SelectItem value="Term 2">Term 2</SelectItem><SelectItem value="Term 3">Term 3</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Exam type</Label>
                  <Select value={examType} onValueChange={setExamType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Test">Test</SelectItem><SelectItem value="CAT">CAT</SelectItem><SelectItem value="Exam">Exam</SelectItem><SelectItem value="Assignment">Assignment</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentClass && selectedSubject && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{currentClass.name} — {entered}/{total} entered {classAvg !== null && <span className="text-green-600 ml-2">avg: {classAvg}%</span>}</CardTitle>
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
                        <TableHead className="w-40">Marks (0–100)</TableHead>
                        <TableHead className="w-16">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentClass.students.map((student, idx) => {
                        const val = marksInput[student.id] || '';
                        const num = parseFloat(val);
                        const grade = !isNaN(num) && val !== '' ? getGrade(num) : null;
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{student.fullName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{student.studentId}</TableCell>
                            <TableCell>
                              <Input
                                type="number" min="0" max="100" value={val}
                                onChange={e => setMarksInput(prev => ({ ...prev, [student.id]: e.target.value }))}
                                placeholder="Enter marks"
                                className={`w-32 ${num >= 50 ? 'border-green-300' : num < 50 && val !== '' ? 'border-red-300' : ''}`}
                              />
                            </TableCell>
                            <TableCell>
                              {grade && <span className={`font-bold text-sm ${gradeCls[grade]}`}>{grade}</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={handleSubmit} disabled={saving || saved || entered === 0} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : saved ? 'Saved successfully!' : `Save marks (${entered} students)`}
                </Button>
              </CardContent>
            </Card>
          )}

          {!selectedSubject && currentClass && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Select a subject above to start entering marks.</CardContent></Card>
          )}
        </>
      )}

      {recentMarks.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recently entered marks</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead><TableHead>Term</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
                <TableBody>
                  {recentMarks.slice(0, 20).map(m => {
                    const grade = m.grade || getGrade(m.marks);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.student.fullName}<p className="text-xs text-muted-foreground">{m.student.studentId}</p></TableCell>
                        <TableCell className="text-sm">{m.subject.name}</TableCell>
                        <TableCell className="font-bold">{m.marks}</TableCell>
                        <TableCell><span className={`font-bold text-sm ${gradeCls[grade]}`}>{grade}</span></TableCell>
                        <TableCell className="text-sm">{m.term}</TableCell>
                        <TableCell><span className="bg-secondary text-xs px-2 py-0.5 rounded">{m.examType}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
