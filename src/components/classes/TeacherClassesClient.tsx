'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, Calendar, Search, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Student {
  id: string; fullName: string; studentId: string; gender: string; feePaid: number; feeBalance: number;
}
interface Subject { id: string; name: string; code: string | null }
interface Schedule { id: string; dayOfWeek: number; startTime: string; endTime: string; subjectName: string; room: string | null }
interface Class {
  id: string; name: string; trade: string; level: string; section: string;
  students: Student[]; subjects: Subject[]; schedules: Schedule[];
}

interface TeacherClassesClientProps { classes: Class[]; teacherName: string }

export function TeacherClassesClient({ classes, teacherName }: TeacherClassesClientProps) {
  const [activeClass, setActiveClass] = useState(classes[0]?.id || '');
  const [tab, setTab] = useState<'students' | 'subjects' | 'schedule'>('students');
  const [search, setSearch] = useState('');

  const cls = classes.find(c => c.id === activeClass);
  const filteredStudents = cls?.students.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const scheduleByDay = cls?.schedules.reduce((acc, s) => {
    acc[s.dayOfWeek] = acc[s.dayOfWeek] || [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {} as Record<number, Schedule[]>) || {};

  const totalFeeBalance = cls?.students.reduce((s, st) => s + st.feeBalance, 0) || 0;

  if (classes.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold">No classes assigned</h2>
          <p className="text-muted-foreground text-sm mt-1">Contact your admin to be assigned to classes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My classes</h1>
        <p className="text-muted-foreground text-sm mt-1">Classes assigned to {teacherName}</p>
      </div>

      {/* Class selector */}
      <div className="flex gap-2 flex-wrap">
        {classes.map(c => (
          <button
            key={c.id}
            onClick={() => { setActiveClass(c.id); setSearch(''); }}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              activeClass === c.id
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-border hover:border-emerald-300 text-muted-foreground'
            }`}
          >
            {c.name}
            <span className="ml-2 text-xs opacity-70">({c.students.length})</span>
          </button>
        ))}
      </div>

      {cls && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Students', value: cls.students.length, color: 'text-blue-600', Icon: Users },
              { label: 'Male', value: cls.students.filter(s => s.gender === 'Male').length, color: 'text-blue-500', Icon: Users },
              { label: 'Female', value: cls.students.filter(s => s.gender === 'Female').length, color: 'text-pink-500', Icon: Users },
              { label: 'Fee balance (RWF)', value: totalFeeBalance.toLocaleString(), color: totalFeeBalance > 0 ? 'text-red-600' : 'text-green-600', Icon: GraduationCap },
            ].map(({ label, value, color, Icon }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
            {([
              { key: 'students', label: `Students (${cls.students.length})`, Icon: Users },
              { key: 'subjects', label: `Subjects (${cls.subjects.length})`, Icon: BookOpen },
              { key: 'schedule', label: 'Schedule', Icon: Calendar },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Students tab */}
          {tab === 'students' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Student roster — {cls.name}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      className="pl-9 h-8 text-sm"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Fee paid (RWF)</TableHead>
                        <TableHead>Balance (RWF)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No students found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((s, i) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                            <TableCell className="font-medium">{s.fullName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono">{s.studentId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={s.gender === 'Male' ? 'border-blue-300 text-blue-700' : 'border-pink-300 text-pink-700'}>
                                {s.gender}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">{s.feePaid.toLocaleString()}</TableCell>
                            <TableCell>
                              <span className={s.feeBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                                {s.feeBalance.toLocaleString()}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Showing {filteredStudents.length} of {cls.students.length} students
                </p>
              </CardContent>
            </Card>
          )}

          {/* Subjects tab */}
          {tab === 'subjects' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Subjects — {cls.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {cls.subjects.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No subjects assigned to this class yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {cls.subjects.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg border bg-secondary/30">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{sub.name}</p>
                          {sub.code && <p className="text-xs text-muted-foreground font-mono">{sub.code}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Schedule tab */}
          {tab === 'schedule' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Weekly timetable — {cls.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {cls.schedules.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No schedule set for this class yet.</p>
                ) : (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(day => {
                      const slots = scheduleByDay[day] || [];
                      if (slots.length === 0) return null;
                      return (
                        <div key={day}>
                          <p className="text-sm font-semibold text-muted-foreground mb-1.5">{DAYS[day]}</p>
                          <div className="grid gap-2">
                            {slots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                              <div key={slot.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 border">
                                <div className="text-xs font-mono text-muted-foreground w-24 flex-shrink-0">
                                  {slot.startTime} – {slot.endTime}
                                </div>
                                <div className="font-medium text-sm flex-1">{slot.subjectName}</div>
                                {slot.room && (
                                  <div className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border">
                                    {slot.room}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
