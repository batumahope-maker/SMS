'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, TrendingUp, DollarSign, GraduationCap, BookOpen, ClipboardCheck } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface ReportsClientProps {
  overview: { students: number; teachers: number; classes: number; subjects: number };
  feeData: { month: string; collected: number; balance: number }[];
  attendanceData: { date: string; present: number; absent: number; rate: number }[];
  gradeDistribution: { grade: string; count: number }[];
  topStudents: { name: string; id: string; avg: number; class: string }[];
  subjectPerformance: { subject: string; avg: number; entries: number }[];
}

export function ReportsClient({ overview, feeData, attendanceData, gradeDistribution, topStudents, subjectPerformance }: ReportsClientProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">School performance overview and key metrics</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Students', value: overview.students, Icon: GraduationCap, color: 'text-blue-600' },
          { label: 'Teachers', value: overview.teachers, Icon: Users, color: 'text-green-600' },
          { label: 'Classes', value: overview.classes, Icon: BookOpen, color: 'text-purple-600' },
          { label: 'Subjects', value: overview.subjects, Icon: ClipboardCheck, color: 'text-orange-600' },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label}><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Icon className={`w-6 h-6 ${color}`} />
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Fee collection chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" />Fee collection (RWF)</CardTitle></CardHeader>
          <CardContent>
            {feeData.length === 0
              ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No payment data yet</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={feeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} RWF`]} />
                    <Legend />
                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="balance" name="Balance" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>}
          </CardContent>
        </Card>

        {/* Grade distribution pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Grade distribution</CardTitle></CardHeader>
          <CardContent>
            {gradeDistribution.length === 0
              ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No marks data yet</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80} label={({ grade, percent }) => `${grade} ${(percent * 100).toFixed(0)}%`}>
                      {gradeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>}
          </CardContent>
        </Card>

        {/* Attendance trend */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Attendance trend (last 30 days)</CardTitle></CardHeader>
          <CardContent>
            {attendanceData.length === 0
              ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No attendance data yet</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: number) => [`${v}%`]} />
                    <Line type="monotone" dataKey="rate" name="Attendance %" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>}
          </CardContent>
        </Card>

        {/* Subject performance */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Subject averages</CardTitle></CardHeader>
          <CardContent>
            {subjectPerformance.length === 0
              ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={subjectPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="subject" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Average']} />
                    <Bar dataKey="avg" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>}
          </CardContent>
        </Card>
      </div>

      {/* Top students table */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Top performing students</CardTitle></CardHeader>
        <CardContent>
          {topStudents.length === 0
            ? <p className="text-center py-8 text-muted-foreground text-sm">No marks data yet</p>
            : <div className="space-y-2">
                {topStudents.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/40">
                    <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.class} · {s.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{s.avg}%</p>
                      <p className="text-xs text-muted-foreground">average</p>
                    </div>
                  </div>
                ))}
              </div>}
        </CardContent>
      </Card>
    </div>
  );
}
