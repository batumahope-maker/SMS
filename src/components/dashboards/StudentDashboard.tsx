'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  DollarSign,
  ClipboardCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  Bell,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface StudentDashboardProps {
  stats: {
    student: {
      id: string;
      studentId: string;
      fullName: string;
      trade: string | null;
      level: string | null;
      section: string | null;
      class: string | null;
      feePaid: number;
      feeBalance: number;
    };
    todaySchedule: Array<{
      id: string;
      startTime: string;
      endTime: string;
      subjectName: string;
      teacherName: string | null;
      room: string | null;
    }>;
    recentMarks: Array<{
      id: string;
      marks: number;
      grade: string | null;
      term: string;
      examType: string;
      subject: { name: string; code: string | null };
    }>;
    attendanceSummary: {
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
    pendingHomework: Array<{
      id: string;
      title: string;
      dueDate: Date;
      subject: { name: string };
      submitted: boolean;
    }>;
    recentPayments: Array<{
      id: string;
      amount: number;
      receiptNumber: string;
      paidAt: Date;
      paidFor: string | null;
    }>;
    announcements: Array<{
      id: string;
      title: string;
      content: string;
      priority: string;
      createdAt: Date;
    }>;
    totalPaid: number;
  };
}

export function StudentDashboardClient({ stats }: StudentDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalAttendance = stats.attendanceSummary.present + 
    stats.attendanceSummary.absent + 
    stats.attendanceSummary.late + 
    stats.attendanceSummary.excused;
  
  const attendanceRate = totalAttendance > 0 
    ? Math.round((stats.attendanceSummary.present / totalAttendance) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {stats.student.fullName}!</h1>
          <p className="text-muted-foreground">
            {stats.student.trade && `${stats.student.trade} • `}
            {stats.student.level && `${stats.student.level}`}
            {stats.student.section && ` - ${stats.student.section}`}
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1 px-3">
          ID: {stats.student.studentId}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Class</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.student.class || 'Not Assigned'}</div>
            <p className="text-xs text-muted-foreground">Current class</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <Progress value={attendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(stats.student.feeBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Homework</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingHomework.filter(h => !h.submitted).length}
            </div>
            <p className="text-xs text-muted-foreground">To be submitted</p>
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
                      <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{schedule.startTime}</p>
                      <p className="text-xs text-muted-foreground">{schedule.endTime}</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div className="flex-1">
                      <p className="font-medium">{schedule.subjectName}</p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.teacherName && `${schedule.teacherName} • `}
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

        {/* Recent Marks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Marks
              </CardTitle>
              <CardDescription>Your latest grades</CardDescription>
            </div>
            <Link href="/student/grades">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats.recentMarks.length > 0 ? (
                stats.recentMarks.map((mark) => (
                  <div key={mark.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{mark.subject.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {mark.examType} • {mark.term}
                      </p>
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
                <p className="text-center text-muted-foreground py-4">No marks available yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Present</span>
                </div>
                <p className="text-2xl font-bold">{stats.attendanceSummary.present}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Absent</span>
                </div>
                <p className="text-2xl font-bold">{stats.attendanceSummary.absent}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Late</span>
                </div>
                <p className="text-2xl font-bold">{stats.attendanceSummary.late}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Excused</span>
                </div>
                <p className="text-2xl font-bold">{stats.attendanceSummary.excused}</p>
              </div>
            </div>
            <Link href="/student/attendance">
              <Button variant="outline" className="w-full mt-4">View Details</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pending Homework */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Pending Homework
              </CardTitle>
              <CardDescription>Upcoming deadlines</CardDescription>
            </div>
            <Link href="/student/homework">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.pendingHomework.length > 0 ? (
                stats.pendingHomework.map((hw) => (
                  <div key={hw.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {hw.submitted ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                      <div>
                        <p className="font-medium">{hw.title}</p>
                        <p className="text-sm text-muted-foreground">{hw.subject.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Due: {format(new Date(hw.dueDate), 'MMM d')}</p>
                      {hw.submitted ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">Submitted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No pending homework</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Fee Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fee Summary
            </CardTitle>
            <CardDescription>Your payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(stats.student.feePaid)}</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.student.feeBalance)}</p>
                </div>
              </div>
              {stats.recentPayments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recent Payments</p>
                  {stats.recentPayments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                      <span>{payment.paidFor || 'Fee Payment'}</span>
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/student/fees">
                <Button variant="outline" className="w-full">View Payment History</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Announcements
            </CardTitle>
            <CardDescription>Latest school updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {stats.announcements.length > 0 ? (
                stats.announcements.map((announcement) => (
                  <div key={announcement.id} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{announcement.title}</p>
                      <Badge
                        variant={
                          announcement.priority === 'urgent'
                            ? 'destructive'
                            : announcement.priority === 'high'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs shrink-0"
                      >
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No announcements</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
