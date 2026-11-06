
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap,
  UserCheck,
  School,
  DollarSign,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface AdminDashboardProps {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    totalFeesCollected: number;
    totalFeeBalance: number | null;
    attendanceRate: number;
    genderDistribution: {
      male: number;
      female: number;
    };
    recentPayments: Array<{
      id: string;
      amount: number;
      receiptNumber: string;
      paidAt: Date;
      student: {
        fullName: string;
        studentId: string;
      };
    }>;
    recentAnnouncements: Array<{
      id: string;
      title: string;
      content: string;
      priority: string;
      createdAt: Date;
    }>;
    upcomingEvents: Array<{
      id: string;
      title: string;
      date: Date;
      location: string | null;
    }>;
  };
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);

  const genderData = [
    { name: 'Male', value: stats.genderDistribution.male },
    { name: 'Female', value: stats.genderDistribution.female },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your school.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalStudents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered students
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Teachers
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTeachers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Active teacher accounts
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Classes
            </CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalClasses}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSubjects} subjects in the schedule
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.attendanceRate}%
            </div>
            <Progress value={stats.attendanceRate} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Today&apos;s recorded attendance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Overview
            </CardTitle>
            <CardDescription>
              Total payments recorded in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total Collected
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {formatCurrency(stats.totalFeesCollected)}
            </p>

            <div className="mt-6 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Pending Balance
              </p>
              <p className="mt-1 text-xl font-semibold text-muted-foreground">
                {stats.totalFeeBalance === null
                  ? 'Not available'
                  : formatCurrency(stats.totalFeeBalance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your current database does not contain a fee-balance field.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
            <CardDescription>
              Attendance recorded for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-5xl font-bold">
                  {stats.attendanceRate}%
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Present attendance rate
                </p>
                <Progress
                  value={stats.attendanceRate}
                  className="mt-4 w-48"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>
              Latest fee payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentPayments.length > 0 ? (
                stats.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">
                        {payment.student.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.receiptNumber}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.paidAt), 'dd MMM')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent payments
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
            <CardDescription>
              Latest school updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[250px] space-y-4 overflow-y-auto">
              {stats.recentAnnouncements.length > 0 ? (
                stats.recentAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {announcement.title}
                      </p>
                      <Badge
                        variant={
                          announcement.priority.toLowerCase() === 'urgent'
                            ? 'destructive'
                            : announcement.priority.toLowerCase() === 'high'
                              ? 'default'
                              : 'secondary'
                        }
                        className="text-xs"
                      >
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(announcement.createdAt),
                        'dd MMM yyyy'
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No announcements
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upcoming Events</span>
              <Badge variant="outline">
                {stats.upcomingEvents.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Scheduled activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[250px] space-y-4 overflow-y-auto">
              {stats.upcomingEvents.length > 0 ? (
                stats.upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3"
                  >
                    <div className="rounded-lg bg-primary/10 p-2 text-center">
                      <p className="text-xs font-medium">
                        {format(new Date(event.date), 'MMM')}
                      </p>
                      <p className="text-lg font-bold">
                        {format(new Date(event.date), 'dd')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {event.title}
                      </p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground">
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming events
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Student Distribution</CardTitle>
          <CardDescription>
            Gender distribution from student records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {genderData.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ec4899" />
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-blue-500" />
                    <span className="text-sm">
                      Male Students: {stats.genderDistribution.male}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-pink-500" />
                    <span className="text-sm">
                      Female Students: {stats.genderDistribution.female}%
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Based on students with recorded male or female gender.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No gender information is available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
