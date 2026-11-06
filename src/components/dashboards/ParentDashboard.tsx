'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  DollarSign,
  ClipboardCheck,
  BookOpen,
  Bell,
  MessageSquare,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface ParentDashboardProps {
  stats: {
    parent: {
      id: string;
      fullName: string;
      phone: string;
      email: string | null;
    };
    children: Array<{
      id: string;
      studentId: string;
      fullName: string;
      trade: string | null;
      level: string | null;
      section: string | null;
      class: string | null;
      feePaid: number;
      feeBalance: number;
      gender: string;
    }>;
    attendance: {
      present: number;
      absent: number;
      late: number;
    };
    recentMarks: Array<{
      id: string;
      marks: number;
      grade: string | null;
      student: { fullName: string; studentId: string };
      subject: { name: string };
      createdAt: Date;
    }>;
    feeSummary: {
      totalPaid: number;
      totalBalance: number;
    };
    recentPayments: Array<{
      id: string;
      amount: number;
      paidAt: Date;
      paidFor: string | null;
      student: { fullName: string };
    }>;
    announcements: Array<{
      id: string;
      title: string;
      content: string;
      priority: string;
      createdAt: Date;
    }>;
    unreadMessages: number;
  };
}

export function ParentDashboardClient({ stats }: ParentDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalAttendance = stats.attendance.present + stats.attendance.absent + stats.attendance.late;
  const attendanceRate = totalAttendance > 0 
    ? Math.round((stats.attendance.present / totalAttendance) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {stats.parent.fullName}!</h1>
          <p className="text-muted-foreground">
            Monitor your children&apos;s academic progress and school activities
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/parent/messages">
            <Button variant="outline" className="relative">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
              {stats.unreadMessages > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {stats.unreadMessages}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.children.length}</div>
            <p className="text-xs text-muted-foreground">Registered students</p>
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
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.feeSummary.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">Total fees paid</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(stats.feeSummary.totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Children Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Children
            </CardTitle>
            <CardDescription>Overview of your children&apos;s information</CardDescription>
          </div>
          <Link href="/parent/children">
            <Button variant="outline" size="sm">View Details</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.children.map((child) => (
              <div key={child.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className={child.gender === 'Male' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-pink-500 text-white'
                    }>
                      {child.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{child.fullName}</p>
                    <p className="text-sm text-muted-foreground">{child.studentId}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class:</span>
                    <span className="font-medium">{child.class || 'Not assigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trade:</span>
                    <span className="font-medium">{child.trade || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee Balance:</span>
                    <span className={`font-medium ${child.feeBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatCurrency(child.feeBalance)}
                    </span>
                  </div>
                </div>
                <Link href={`/parent/children/${child.id}`}>
                  <Button variant="outline" size="sm" className="w-full">View Progress</Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Marks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Marks
              </CardTitle>
              <CardDescription>Latest grades for your children</CardDescription>
            </div>
            <Link href="/parent/grades">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats.recentMarks.length > 0 ? (
                stats.recentMarks.map((mark) => (
                  <div key={mark.id} className="flex items-center justify-between p-3 rounded-lg border">
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
                <p className="text-center text-muted-foreground py-4">No marks available yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Payments
              </CardTitle>
              <CardDescription>Payment history for your children</CardDescription>
            </div>
            <Link href="/parent/fees">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats.recentPayments.length > 0 ? (
                stats.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{payment.student.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.paidFor || 'Fee Payment'} • {format(new Date(payment.paidAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <p className="font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No payments yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stats.announcements.length > 0 ? (
              stats.announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between gap-2 mb-2">
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
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4 col-span-full">No announcements</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common actions you can perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/parent/children">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="w-6 h-6" />
                <span>View Children</span>
              </Button>
            </Link>
            <Link href="/parent/grades">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <BookOpen className="w-6 h-6" />
                <span>View Grades</span>
              </Button>
            </Link>
            <Link href="/parent/fees">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <DollarSign className="w-6 h-6" />
                <span>Fee Status</span>
              </Button>
            </Link>
            <Link href="/parent/messages">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 relative">
                <MessageSquare className="w-6 h-6" />
                <span>Messages</span>
                {stats.unreadMessages > 0 && (
                  <Badge className="absolute top-2 right-2 h-5 w-5 p-0 flex items-center justify-center">
                    {stats.unreadMessages}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
