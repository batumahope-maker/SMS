'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap,
  UserCheck,
  School,
  BookOpen,
  DollarSign,
  AlertCircle,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

interface AdminDashboardProps {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    totalFeesCollected: number;
    totalFeeBalance: number;
    attendanceRate: number;
    recentPayments: Array<{
      id: string;
      amount: number;
      receiptNumber: string;
      paidAt: Date;
      student: { fullName: string; studentId: string };
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

const attendanceData = [
  { name: 'Mon', present: 95, absent: 5 },
  { name: 'Tue', present: 92, absent: 8 },
  { name: 'Wed', present: 97, absent: 3 },
  { name: 'Thu', present: 94, absent: 6 },
  { name: 'Fri', present: 91, absent: 9 },
];

const feeData = [
  { name: 'Jan', collected: 1500000, pending: 500000 },
  { name: 'Feb', collected: 1800000, pending: 300000 },
  { name: 'Mar', collected: 2100000, pending: 400000 },
  { name: 'Apr', collected: 1600000, pending: 600000 },
  { name: 'May', collected: 2200000, pending: 200000 },
];

const genderData = [
  { name: 'Male', value: 55 },
  { name: 'Female', value: 45 },
];

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your school.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3" />
                +12% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3" />
                +2 new this term
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-muted-foreground">{stats.totalSubjects} subjects</span>
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
            <Progress value={stats.attendanceRate} className="mt-2" />
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
            <CardDescription>Fee collection summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalFeesCollected)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Pending Balance</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(stats.totalFeeBalance)}
                </p>
              </div>
            </div>
            <div className="mt-6 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="collected" fill="#22c55e" name="Collected" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Trend
            </CardTitle>
            <CardDescription>Weekly attendance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="present"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Present %"
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Absent %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Payments */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest fee payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentPayments.length > 0 ? (
                stats.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{payment.student.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.receiptNumber}
                      </p>
                    </div>
                    <div className="text-right">
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
                <p className="text-sm text-muted-foreground">No recent payments</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
            <CardDescription>Latest school updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[250px] overflow-y-auto">
              {stats.recentAnnouncements.length > 0 ? (
                stats.recentAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{announcement.title}</p>
                      <Badge
                        variant={
                          announcement.priority === 'urgent'
                            ? 'destructive'
                            : announcement.priority === 'high'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(announcement.createdAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No announcements</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upcoming Events</span>
              <Badge variant="outline">{stats.upcomingEvents.length}</Badge>
            </CardTitle>
            <CardDescription>Scheduled activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[250px] overflow-y-auto">
              {stats.upcomingEvents.length > 0 ? (
                stats.upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-center">
                      <p className="text-xs font-medium">
                        {format(new Date(event.date), 'MMM')}
                      </p>
                      <p className="text-lg font-bold">
                        {format(new Date(event.date), 'dd')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground">{event.location}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Student Distribution</CardTitle>
          <CardDescription>Gender and class distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-[250px]">
              <p className="text-sm font-medium mb-4">Gender Distribution</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span className="text-sm">Male Students: 55%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-pink-500" />
                  <span className="text-sm">Female Students: 45%</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Total active students across {stats.totalClasses} classes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
