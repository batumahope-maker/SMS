'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Users,
  School,
  BookOpen,
  ClipboardCheck,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface TeacherDashboardProps {
  stats: {
    teacher: {
      id: string;
      fullName: string;
      teacherId: string;
      subjects: string;
      department: string | null;
    };
    totalClasses: number;
    totalStudents: number;
    totalSubjects: number;
    todayAttendanceRate: number;
    myClasses: Array<{
      id: string;
      name: string;
      studentCount: number;
      subjects: number;
    }>;
    todaySchedule: Array<{
      id: string;
      startTime: string;
      endTime: string;
      subjectName: string;
      room: string | null;
    }>;
    recentAttendance: Array<{
      id: string;
      date: Date;
      status: string;
      student: { fullName: string; studentId: string };
    }>;
    homeworkAssigned: Array<{
      id: string;
      title: string;
      dueDate: Date;
      subject: { name: string };
      class: { name: string };
      submissionCount: number;
    }>;
    recentMarks: Array<{
      id: string;
      marks: number;
      grade: string | null;
      student: { fullName: string; studentId: string };
      subject: { name: string };
      createdAt: Date;
    }>;
  };
}

export function TeacherDashboardClient({ stats }: TeacherDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {stats.teacher.fullName}!</h1>
          <p className="text-muted-foreground">
            {stats.teacher.department && `${stats.teacher.department} • `}
            {stats.teacher.subjects}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/teacher/attendance">
            <Button variant="outline">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Take Attendance
            </Button>
          </Link>
          <Link href="/teacher/marks">
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Enter Marks
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">Assigned classes</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all classes</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubjects}</div>
            <p className="text-xs text-muted-foreground">Teaching subjects</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAttendanceRate}%</div>
            <Progress value={stats.todayAttendanceRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today&apos;s Schedule
            </CardTitle>
            <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {stats.todaySchedule.map((schedule) => (
                  <div key={schedule.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-medium">{schedule.startTime}</p>
                      <p className="text-xs text-muted-foreground">{schedule.endTime}</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div className="flex-1">
                      <p className="font-medium">{schedule.subjectName}</p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.room || 'Room TBA'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No classes scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              My Classes
            </CardTitle>
            <CardDescription>Classes you are teaching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats.myClasses.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cls.studentCount} students • {cls.subjects} subjects
                    </p>
                  </div>
                  <Link href={`/teacher/classes/${cls.id}`}>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Homework */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Homework Assigned</CardTitle>
              <CardDescription>Recent homework assignments</CardDescription>
            </div>
            <Link href="/teacher/homework">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.homeworkAssigned.length > 0 ? (
                stats.homeworkAssigned.map((hw) => (
                  <div key={hw.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{hw.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {hw.subject.name} • {hw.class.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Due: {format(new Date(hw.dueDate), 'MMM d')}</p>
                      <p className="text-xs text-muted-foreground">{hw.submissionCount} submissions</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No homework assigned yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Marks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Marks</CardTitle>
              <CardDescription>Recently entered marks</CardDescription>
            </div>
            <Link href="/teacher/marks">
              <Button variant="outline" size="sm">Enter Marks</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats.recentMarks.length > 0 ? (
                stats.recentMarks.map((mark) => (
                  <div key={mark.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{mark.student.fullName}</p>
                      <p className="text-sm text-muted-foreground">{mark.subject.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{mark.marks}%</Badge>
                      {mark.grade && (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600">{mark.grade}</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No marks entered yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/teacher/attendance">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <ClipboardCheck className="w-6 h-6" />
                <span>Take Attendance</span>
              </Button>
            </Link>
            <Link href="/teacher/marks">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <BookOpen className="w-6 h-6" />
                <span>Enter Marks</span>
              </Button>
            </Link>
            <Link href="/teacher/homework">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Calendar className="w-6 h-6" />
                <span>Create Homework</span>
              </Button>
            </Link>
            <Link href="/teacher/classes">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <School className="w-6 h-6" />
                <span>View Classes</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
