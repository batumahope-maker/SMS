'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';

interface Submission { id: string; submittedAt: Date; marks: number | null }
interface HomeworkItem {
  id: string; title: string; description: string; dueDate: Date; maxMarks: number | null;
  subject: { name: string }; teacher: { fullName: string }; submissions: Submission[];
}
interface StudentHomeworkClientProps { homework: HomeworkItem[]; studentId: string }

export function StudentHomeworkClient({ homework, studentId }: StudentHomeworkClientProps) {
  const pending = homework.filter(h => !isPast(new Date(h.dueDate)) && h.submissions.length === 0);
  const submitted = homework.filter(h => h.submissions.length > 0);
  const overdue = homework.filter(h => isPast(new Date(h.dueDate)) && h.submissions.length === 0);

  function HomeworkCard({ h }: { h: HomeworkItem }) {
    const sub = h.submissions[0];
    const due = new Date(h.dueDate);
    const daysLeft = differenceInDays(due, new Date());
    const isOver = isPast(due);

    return (
      <div className={`border rounded-lg p-4 space-y-2 ${isOver && !sub ? 'border-red-200 bg-red-50' : sub ? 'border-green-200 bg-green-50' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{h.title}</h3>
          {sub
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 flex items-center gap-1 flex-shrink-0"><CheckCircle className="w-3 h-3" />Submitted</span>
            : isOver
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center gap-1 flex-shrink-0"><AlertCircle className="w-3 h-3" />Overdue</span>
            : <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1 flex-shrink-0"><Clock className="w-3 h-3" />{daysLeft}d left</span>}
        </div>
        <p className="text-sm text-muted-foreground">{h.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <span><BookOpen className="w-3 h-3 inline mr-1" />{h.subject.name}</span>
          <span>Teacher: {h.teacher.fullName}</span>
          <span>Due: {format(due, 'dd MMM yyyy')}</span>
          {h.maxMarks && <span>Max: {h.maxMarks} marks</span>}
          {sub?.marks !== null && sub?.marks !== undefined && <span className="text-green-600 font-medium">Score: {sub.marks}/{h.maxMarks}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">My homework</h1><p className="text-muted-foreground text-sm mt-1">View all assigned homework and submission status</p></div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{pending.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Submitted</p><p className="text-2xl font-bold text-green-600">{submitted.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-2xl font-bold text-red-600">{overdue.length}</p></CardContent></Card>
      </div>

      {overdue.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3"><CardTitle className="text-base text-red-700">Overdue ({overdue.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">{overdue.map(h => <HomeworkCard key={h.id} h={h} />)}</CardContent>
        </Card>
      )}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Pending ({pending.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">{pending.map(h => <HomeworkCard key={h.id} h={h} />)}</CardContent>
        </Card>
      )}
      {submitted.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base text-muted-foreground">Submitted ({submitted.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">{submitted.map(h => <HomeworkCard key={h.id} h={h} />)}</CardContent>
        </Card>
      )}
      {homework.length === 0 && <Card><CardContent className="py-16 text-center text-muted-foreground">No homework assigned yet.</CardContent></Card>}
    </div>
  );
}
