'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, TrendingUp, Users, School, AlertCircle, CheckCircle } from 'lucide-react';

interface AIAnalysisClientProps {
  students: { id: string; fullName: string; studentId: string }[];
  classes: { id: string; name: string }[];
}

type AnalysisType = 'student' | 'class' | 'school';

export function AIAnalysisClient({ students, classes }: AIAnalysisClientProps) {
  const [type, setType] = useState<AnalysisType>('school');
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: string; stats?: Record<string, string> } | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ label: string; analysis: string; time: Date }[]>([]);

  async function runAnalysis() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, studentId: studentId || undefined, classId: classId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
      const label = type === 'student'
        ? students.find(s => s.id === studentId)?.fullName || 'Student'
        : type === 'class'
        ? classes.find(c => c.id === classId)?.name || 'Class'
        : 'Whole school';
      setHistory(prev => [{ label, analysis: data.analysis, time: new Date() }, ...prev.slice(0, 4)]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  const canRun = type === 'school' || (type === 'student' && studentId) || (type === 'class' && classId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />AI grade analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Use Claude AI to get instant insights on student performance, identify at-risk students, and get actionable recommendations
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {([
          { key: 'school', label: 'Whole school', icon: School, desc: 'Overview of all students, pass rates, attendance' },
          { key: 'class', label: 'One class', icon: Users, desc: 'Class performance, top students, at-risk learners' },
          { key: 'student', label: 'One student', icon: TrendingUp, desc: 'Individual performance, subject breakdown, recommendations' },
        ] as const).map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${type === key ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30' : 'border-border hover:border-purple-300'}`}
          >
            <Icon className={`w-5 h-5 mb-2 ${type === key ? 'text-purple-600' : 'text-muted-foreground'}`} />
            <p className={`font-medium text-sm ${type === key ? 'text-purple-700 dark:text-purple-300' : ''}`}>{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configure analysis</CardTitle>
          <CardDescription>Select what you want to analyse, then click Run</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {type === 'student' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Select student</label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger><SelectValue placeholder="Choose a student..." /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.studentId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === 'class' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Select class</label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Choose a class..." /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === 'school' && (
            <p className="text-sm text-muted-foreground bg-secondary rounded-lg p-3">
              This will analyse performance data for all active students across the entire school.
            </p>
          )}
          <Button onClick={runAnalysis} disabled={loading || !canRun} className="bg-purple-600 hover:bg-purple-700 text-white">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing...</> : <><Sparkles className="w-4 h-4 mr-2" />Run AI analysis</>}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-300 text-sm">Analysis failed</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{error}</p>
                {error.includes('API') && <p className="text-xs text-red-600 mt-2">Make sure the Anthropic API is accessible from your server.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />AI insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.stats && Object.keys(result.stats).length > 0 && (
              <div className="flex gap-4 flex-wrap">
                {Object.entries(result.stats).map(([k, v]) => (
                  <div key={k} className="bg-white dark:bg-background border rounded-lg px-4 py-2 text-center">
                    <p className="text-xl font-bold text-purple-600">{v}</p>
                    <p className="text-xs text-muted-foreground">{k}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white dark:bg-background rounded-lg p-4 border">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Recent analyses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">{h.label}</span>
                  <span className="text-xs text-muted-foreground">{h.time.toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{h.analysis}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
