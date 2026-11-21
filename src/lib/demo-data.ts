/**
 * Synthetic demo data only.
 *
 * Nothing in this file comes from the live XAMPP/MySQL database. Names, IDs,
 * addresses, marks, payments and messages are deliberately fictional and are
 * safe to show on a Preview deployment.
 */
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './demo-mode';

function md5(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

function money(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function dateOnly(daysFromToday = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

function fixedDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function timeAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

const weekday = new Date().getDay();
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const todayName = WEEKDAYS[weekday];
const secondDayName = WEEKDAYS[(weekday + 2) % 7];
const currentYear = new Date().getFullYear();

const account = (role: (typeof DEMO_ACCOUNTS)[number]['role']) =>
  DEMO_ACCOUNTS.find((item) => item.role === role)!;

const users = [
  {
    id: 1001,
    username: account('admin').username,
    password: md5(DEMO_PASSWORD),
    fullName: 'Demo Admin',
    email: 'demo.admin@example.com',
    phone: '+250 000 000 001',
    role: 'admin',
    status: 'Active',
    createdAt: dateOnly(-120),
  },
  {
    id: 2001,
    username: account('teacher').username,
    password: md5(DEMO_PASSWORD),
    fullName: 'Demo Teacher',
    email: 'demo.teacher@example.com',
    phone: '+250 000 000 002',
    role: 'teacher',
    status: 'Active',
    createdAt: dateOnly(-110),
  },
  {
    id: 3001,
    username: account('student').username,
    password: md5(DEMO_PASSWORD),
    fullName: 'Demo Student',
    email: 'demo.student@example.com',
    phone: '+250 000 000 003',
    role: 'student',
    status: 'Active',
    createdAt: dateOnly(-100),
  },
  {
    id: 4001,
    username: account('parent').username,
    password: md5(DEMO_PASSWORD),
    fullName: 'Demo Parent',
    email: 'demo.parent@example.com',
    phone: '+250 000 000 004',
    role: 'parent',
    status: 'Active',
    createdAt: dateOnly(-90),
  },
];

const admins = [
  {
    id: 501,
    userId: 1001,
    adminLevel: 'demo',
  },
];

const students = [
  {
    id: 601,
    userId: 3001,
    studentId: 'DEMO-S-1001',
    trade: 'ICT',
    level: 'Level 3',
    section: 'A',
    gender: 'Female',
    dateOfBirth: fixedDate(2007, 5, 12),
    guardianName: 'Demo Parent',
    guardianPhone: '+250 000 000 004',
    enrollmentDate: fixedDate(currentYear, 1, 15),
    feePaid: money('150000.00'),
    feeBalance: money('25000.00'),
  },
];

const teachers = [
  {
    id: 701,
    userId: 2001,
    teacherId: 'DEMO-T-1001',
    subject: 'Introduction to ICT',
    department: 'ICT',
    hireDate: fixedDate(2022, 9, 1),
  },
];

const announcements = [
  {
    id: 801,
    title: 'Demo: Welcome to the synthetic Preview',
    content:
      'This announcement is synthetic demo content. No live school records are used.',
    priority: 'High',
    targetAudience: 'all',
    createdBy: 1001,
    createdAt: dateOnly(0),
  },
  {
    id: 802,
    title: 'Demo: Read-only testing',
    content:
      'You can explore pages and menus. Save actions are disabled in demo mode.',
    priority: 'Normal',
    targetAudience: 'students',
    createdBy: 1001,
    createdAt: dateOnly(-1),
  },
];

const attendance = [
  {
    id: 901,
    studentId: 3001,
    date: dateOnly(0),
    status: 'Present',
    notes: 'Synthetic attendance record',
    createdAt: dateOnly(0),
  },
  {
    id: 902,
    studentId: 3001,
    date: dateOnly(-1),
    status: 'Late',
    notes: 'Synthetic attendance record',
    createdAt: dateOnly(-1),
  },
  {
    id: 903,
    studentId: 3001,
    date: dateOnly(-2),
    status: 'Present',
    notes: 'Synthetic attendance record',
    createdAt: dateOnly(-2),
  },
];

const marks = [
  {
    id: 1001,
    studentId: 3001,
    subject: 'Introduction to ICT',
    term: 'Term 1',
    year: currentYear,
    marks: money('88.00'),
    maxMarks: money('100.00'),
    createdAt: dateOnly(-3),
  },
  {
    id: 1002,
    studentId: 3001,
    subject: 'Mathematics',
    term: 'Term 1',
    year: currentYear,
    marks: money('74.00'),
    maxMarks: money('100.00'),
    createdAt: dateOnly(-4),
  },
  {
    id: 1003,
    studentId: 3001,
    subject: 'English',
    term: 'Term 1',
    year: currentYear,
    marks: money('81.00'),
    maxMarks: money('100.00'),
    createdAt: dateOnly(-5),
  },
];

const payments = [
  {
    id: 1101,
    studentId: 3001,
    amount: money('75000.00'),
    paymentDate: dateOnly(-12),
    paymentMethod: 'Bank transfer',
    reference: 'DEMO-RECEIPT-001',
    createdAt: dateOnly(-12),
  },
  {
    id: 1102,
    studentId: 3001,
    amount: money('75000.00'),
    paymentDate: dateOnly(-40),
    paymentMethod: 'Cash',
    reference: 'DEMO-RECEIPT-002',
    createdAt: dateOnly(-40),
  },
];

const schoolEvents = [
  {
    id: 1201,
    title: 'Demo: Parent-teacher meeting',
    description: 'Synthetic event for Preview testing.',
    eventType: 'Meeting',
    eventDate: dateOnly(3),
    eventTime: timeAt(10, 0),
    location: 'Demo Hall',
    targetAudience: 'all',
    isActive: true,
    createdAt: dateOnly(-2),
  },
  {
    id: 1202,
    title: 'Demo: ICT practical session',
    description: 'Synthetic event for Preview testing.',
    eventType: 'Academic',
    eventDate: dateOnly(6),
    eventTime: timeAt(14, 0),
    location: 'Demo Lab',
    targetAudience: 'students',
    isActive: true,
    createdAt: dateOnly(-1),
  },
];

const schoolRules = [
  {
    id: 1301,
    category: 'Academics',
    ruleNumber: 'DEM-001',
    title: 'Demo rule',
    description: 'Synthetic rule shown only in demo mode.',
    severity: 'Info',
    appliesTo: 'all',
    isActive: true,
  },
];

const schoolSchedules = [
  {
    id: 1401,
    teacherId: 2001,
    trade: 'ICT',
    level: 'Level 3',
    section: 'A',
    subject: 'Introduction to ICT',
    dayOfWeek: todayName,
    startTime: timeAt(8, 0),
    endTime: timeAt(10, 0),
    roomNumber: 'DEMO-101',
    notes: 'Synthetic demo schedule',
    isActive: true,
  },
  {
    id: 1402,
    teacherId: 2001,
    trade: 'ICT',
    level: 'Level 3',
    section: 'A',
    subject: 'Database Basics',
    dayOfWeek: secondDayName,
    startTime: timeAt(11, 0),
    endTime: timeAt(13, 0),
    roomNumber: 'DEMO-102',
    notes: 'Synthetic demo schedule',
    isActive: true,
  },
];

const loginActivity = [
  {
    id: 1501,
    userId: 1001,
    role: 'admin',
    username: 'demo.admin',
    fullName: 'Demo Admin',
    ipAddress: 'demo-preview',
    loggedInAt: dateOnly(0),
  },
  {
    id: 1502,
    userId: 2001,
    role: 'teacher',
    username: 'demo.teacher',
    fullName: 'Demo Teacher',
    ipAddress: 'demo-preview',
    loggedInAt: dateOnly(-1),
  },
];

export const demoData = {
  user: users,
  admin: admins,
  student: students,
  teacher: teachers,
  announcement: announcements,
  attendance,
  mark: marks,
  payment: payments,
  schoolEvent: schoolEvents,
  schoolRule: schoolRules,
  schoolSchedule: schoolSchedules,
  loginActivity,
};

export const parentDemoOverview = {
  childName: 'Demo Student',
  studentId: 'DEMO-S-1001',
  className: 'ICT Level 3 A',
  attendanceRate: 96,
  averageScore: 81,
  feeBalance: '25,000 RWF',
};

const demoParent = users.find((user) => user.role === 'parent');
const demoStudent = students[0];

export const parentDemoChild = {
  parentId: demoParent?.id ?? null,
  parentName: demoParent?.fullName ?? 'Demo Parent',
  fullName: users.find((user) => user.id === demoStudent?.userId)?.fullName ?? 'Demo Student',
  studentUserId: demoStudent?.userId ?? null,
  studentId: demoStudent?.studentId ?? '',
  className: [demoStudent?.trade, demoStudent?.level, demoStudent?.section]
    .filter(Boolean)
    .join(' '),
  guardianRelation: 'Parent / Guardian',
  enrollmentDate: demoStudent?.enrollmentDate?.toISOString().slice(0, 10) ?? '—',
};

export const parentDemoAttendance = attendance.map((row) => ({
  id: row.id,
  date: row.date.toISOString().slice(0, 10),
  status: row.status,
}));

export const parentDemoMarks = marks.map((row) => ({
  id: row.id,
  subject: row.subject,
  term: row.term,
  score: Number(row.marks.toString()),
  maxScore: Number(row.maxMarks.toString()),
}));

export const parentDemoFees = {
  feePaid: '150,000 RWF',
  feeBalance: '25,000 RWF',
  payments: payments.map((row) => ({
    id: row.id,
    date: row.paymentDate?.toISOString().slice(0, 10) ?? '—',
    amount: Number(row.amount.toString()),
    reference: row.reference,
    method: row.paymentMethod,
  })),
};

export const parentDemoMessages = [
  {
    id: 'demo-msg-1',
    from: 'Demo Teacher',
    date: dateOnly(-1).toISOString().slice(0, 10),
    subject: 'Synthetic progress update',
    body: 'This is a synthetic message for Preview testing. No real student information is included.',
  },
  {
    id: 'demo-msg-2',
    from: 'Demo Admin',
    date: dateOnly(-3).toISOString().slice(0, 10),
    subject: 'Demo mode notice',
    body: 'Demo mode is read-only. Replying and saving are disabled in this Preview.',
  },
];
