'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, RefreshCw, GraduationCap, XCircle, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface Student {
  id: string; studentId: string; fullName: string;
  currentClass: string; currentLevel: string | null;
  average: number | null; passed: boolean | null; recommendation: string;
}
interface ClassOption { id: string; name: string }

interface PromoteClientProps {
  students: Student[];
  classes: ClassOption[];
  previewData: { total: number; toPromote: number; toRepeat: number; noData: number };
}

const recConfig = {
  promote:  { label: 'Promote',  color: 'bg-green-100 text-green-800',  Icon: ArrowUpCircle },
  repeat:   { label: 'Repeat',   color: 'bg-orange-100 text-orange-800', Icon: RefreshCw },
  graduate: { label: 'Graduate', color: 'bg-blue-100 text-blue-800',    Icon: GraduationCap },
  withdraw: { label: 'Withdraw', color: 'bg-red-100 text-red-800',      Icon: XCircle },
  no_data:  { label: 'No data',  color: 'bg-gray-100 text-gray-600',    Icon: AlertTriangle },
};

export function PromoteStudentsClient({ students, classes, previewData }: PromoteClientProps) {
  const [actions, setActions] = useState<Record<string, { action: string; newClassId: string }>>(
    Object.fromEntries(students.map(s => [s.id, { action: s.recommendation === 'no_data' ? 'promote' : s.recommendation, newClassId: '' }]))
  );
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<{ succeeded: number; failed: number } | null>(null);

  function setAction(studentId: string, action: string) {
    setActions(prev => ({ ...prev, [studentId]: { ...prev[studentId], action } }));
  }
  function setNewClass(studentId: string, newClassId: string) {
    setActions(prev => ({ ...prev, [studentId]: { ...prev[studentId], newClassId } }));
  }

  async function executePromotion() {
    setProcessing(true);
    try {
      const payload = Object.entries(actions).map(([id, a]) => ({
        studentId: id, action: a.action, newClassId: a.newClassId || undefined,
      }));
      const res = await fetch('/api/promote-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: payload }),
      });
      const data = await res.json();
      setResults({ succeeded: data.succeeded, failed: data.failed });
      setDone(true);
    } finally {
      setProcessing(false);
    }
  }

  if (done && results) {
    return (
      <div className="p-6">
        <Card className="max-w-lg mx-auto text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold">Promotion complete!</h2>
            <p className="text-muted-foreground">{results.succeeded} students processed successfully{results.failed > 0 ? `, ${results.failed} failed` : ''}.</p>
            <Button onClick={() => window.location.reload()}>Back to promotion tool</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowUpCircle className="w-6 h-6 text-blue-600" />Student promotion</h1>
        <p className="text-muted-foreground text-sm mt-1">End-of-year tool — review recommendations and promote, hold back, or graduate students</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total students', value: previewData.total, color: 'text-gray-700' },
          { label: 'Recommended to promote', value: previewData.toPromote, color: 'text-green-600' },
          { label: 'Recommended to repeat', value: previewData.toRepeat, color: 'text-orange-600' },
          { label: 'No marks data', value: previewData.noData, color: 'text-gray-500' },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Review and confirm actions</CardTitle>
          <p className="text-sm text-muted-foreground">The AI has pre-filled recommendations based on marks. You can change any action before confirming.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Current class</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Promote to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => {
                  const rec = recConfig[s.recommendation as keyof typeof recConfig] || recConfig.no_data;
                  const currentAction = actions[s.id]?.action || 'promote';
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{s.fullName}</p>
                        <p className="text-xs text-muted-foreground">{s.studentId}</p>
                      </TableCell>
                      <TableCell className="text-sm">{s.currentClass}</TableCell>
                      <TableCell>
                        {s.average !== null
                          ? <span className={`font-bold ${s.average >= 50 ? 'text-green-600' : 'text-red-600'}`}>{s.average}%</span>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${rec.color}`}>
                          <rec.Icon className="w-3 h-3" />{rec.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select value={currentAction} onValueChange={v => setAction(s.id, v)}>
                          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="promote">Promote</SelectItem>
                            <SelectItem value="repeat">Repeat year</SelectItem>
                            <SelectItem value="graduate">Graduate</SelectItem>
                            <SelectItem value="withdraw">Withdraw</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {currentAction === 'promote' && (
                          <Select value={actions[s.id]?.newClassId || ''} onValueChange={v => setNewClass(s.id, v)}>
                            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Select new class" /></SelectTrigger>
                            <SelectContent>
                              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {Object.values(actions).filter(a => a.action === 'promote').length} to promote ·{' '}
              {Object.values(actions).filter(a => a.action === 'repeat').length} to repeat ·{' '}
              {Object.values(actions).filter(a => a.action === 'graduate').length} to graduate
            </p>
            <Button onClick={executePromotion} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
              {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><CheckCircle className="w-4 h-4 mr-2" />Confirm & execute</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
