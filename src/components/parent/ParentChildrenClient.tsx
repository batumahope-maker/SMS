'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, TrendingUp, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// ============ PARENT CHILDREN ============
interface StudentSummary {
  id: string; fullName: string; studentId: string; trade: string | null; level: string | null; section: string | null;
  feePaid: number; feeBalance: number;
  class: { name: string } | null;
  marks: { marks: number; subject: { name: string } }[];
  attendance: { status: string }[];
}
interface ParentChildrenClientProps { children: StudentSummary[] }

export function ParentChildrenClient({ children }: ParentChildrenClientProps) {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">My children</h1><p className="text-muted-foreground text-sm mt-1">Overview of your children's progress</p></div>
      {children.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No children linked to your account. Contact the admin.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {children.map(child => {
            const avg = child.marks.length > 0 ? Math.round(child.marks.reduce((s, m) => s + m.marks, 0) / child.marks.length) : null;
            const attRate = child.attendance.length > 0 ? Math.round((child.attendance.filter(a => a.status === 'present').length / child.attendance.length) * 100) : null;
            return (
              <Card key={child.id}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                      {child.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-lg">{child.fullName}</h3>
                          <p className="text-sm text-muted-foreground">{child.studentId} · {child.class?.name || 'No class'}</p>
                          {child.trade && <p className="text-xs text-muted-foreground">{child.trade} · Level {child.level} · Section {child.section}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="text-center p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Average marks</p>
                          <p className="font-bold text-lg text-blue-600">{avg !== null ? `${avg}%` : '—'}</p>
                        </div>
                        <div className="text-center p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Attendance rate</p>
                          <p className={`font-bold text-lg ${attRate !== null ? (attRate >= 80 ? 'text-green-600' : 'text-red-600') : ''}`}>{attRate !== null ? `${attRate}%` : '—'}</p>
                        </div>
                        <div className="text-center p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Fees paid</p>
                          <p className="font-bold text-lg text-green-600">{child.feePaid.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-3 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className={`font-bold text-lg ${child.feeBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{child.feeBalance.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
