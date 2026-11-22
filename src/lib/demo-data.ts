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

const homework = [
  {
    id: 5011,
    teacherId: 2001,
    studentId: 3001,
    className: 'ICT Level 3 A',
    subject: 'Introduction to ICT',
    title: 'Read Chapter 1',
    description: 'Read textbook chapter 1 and prepare three questions for class.',
    dueDate: dateOnly(2),
    maxMarks: 20,
    createdAt: dateOnly(-2),
  },
  {
    id: 5012,
    teacherId: 2001,
    studentId: 3001,
    className: 'ICT Level 3 A',
    subject: 'Introduction to ICT',
    title: 'Practice database design',
    description: 'Draw an ER diagram for a small library database.',
    dueDate: dateOnly(6),
    maxMarks: 50,
    createdAt: dateOnly(-1),
  },
];

const homeworkSubmissions = [
  {
    id: 5101,
    homeworkId: 5011,
    studentId: 3001,
    submittedAt: dateOnly(-1),
    marks: 19,
    content: 'Q1, Q2, Q3 prepared. See notebook.',
  },
];

const lessonPlans = [
  {
    id: 5201,
    teacherId: 2001,
    title: 'Introduction to ICT',
    subject: 'Introduction to ICT',
    objectives: 'Students will understand basic network and database concepts.',
    content: 'Explain network types, then walk through database normalisation.',
    resources: 'Laptop, projector, example ER diagram.',
    date: dateOnly(2),
    duration: 45,
  },
  {
    id: 5202,
    teacherId: 2001,
    title: 'Database Basics',
    subject: 'Database Basics',
    objectives: 'Students will identify tables, keys and relationships.',
    content: 'Guided lab creating tables for a school database.',
    resources: 'MySQL client, printed handouts.',
    date: dateOnly(3),
    duration: 50,
  },
];

const hostelRooms = [
  {
    id: 'demo-hostel-room-1',
    roomNumber: 'DEMO-101',
    block: 'Block A',
    floor: 1,
    capacity: 4,
    gender: 'Female',
    _count: { allocations: 2 },
  },
  {
    id: 'demo-hostel-room-2',
    roomNumber: 'DEMO-102',
    block: 'Block A',
    floor: 2,
    capacity: 3,
    gender: 'Male',
    _count: { allocations: 1 },
  },
];

const hostelAllocations = [
  {
    id: 'demo-hostel-alloc-1',
    bedNumber: 'A101',
    allocatedAt: dateOnly(-2),
    student: { fullName: 'Demo Student', studentId: 'DEMO-S-1001', gender: 'Female' },
    room: { roomNumber: 'DEMO-101', block: 'Block A' },
  },
  {
    id: 'demo-hostel-alloc-2',
    bedNumber: 'B201',
    allocatedAt: dateOnly(-1),
    student: { fullName: 'Demo Student', studentId: 'DEMO-S-1001', gender: 'Female' },
    room: { roomNumber: 'DEMO-101', block: 'Block A' },
  },
];

const school = {
  id: 'demo-school',
  name: 'ESSJT Demo School',
  slug: 'essjt-demo',
  logo: null,
  address: 'Kigali, Rwanda',
  phone: '+250 000 000 000',
  email: 'demo@example.com',
  website: null,
  motto: 'Demo school platform',
  primaryColor: '#047857',
  secondaryColor: '#059669',
  language: 'en',
  timezone: 'Africa/Kigali',
  academicYear: '2026-2027',
  licenseStatus: 'trial',
  plan: 'demo',
  licenseKey: 'DEMO-LICENSE-KEY',
};

const demoClasses = [
  { id: 'class-ICT-3A', name: 'ICT Level 3 A', _count: { students: 1 } },
];

const smsStats = { absentToday: 1, studentsWithPhone: 1, feeDefaulters: 1 };

const aiData = {
  students: [{ id: 'student-3001', fullName: 'Demo Student', studentId: 'DEMO-S-1001' }],
  classes: demoClasses,
  school: {
    id: 'demo-school',
    name: 'ESSJT Demo School',
    totalStudents: 1,
    averageGrade: 82,
    passRate: 100,
    weakStudents: 0,
    overdueFees: 1,
  },
  classICT: {
    id: 'class-ICT-3A',
    name: 'ICT Level 3 A',
    totalStudents: 1,
    averageGrade: 82,
    strong: 1,
    atRisk: 0,
  },
};

const promoteData = {
  students: [
    {
      id: 'student-3001',
      studentId: 'DEMO-S-1001',
      fullName: 'Demo Student',
      currentClass: 'ICT Level 3 A',
      currentLevel: 'Level 3',
      average: 82,
      passed: true,
      recommendation: 'promote',
    },
  ],
  classes: demoClasses,
  previewData: { total: 1, toPromote: 1, toRepeat: 0, noData: 0 },
};

const transportVehicles = [
  { id: 301, vehicleNumber: 'RAB 111A', vehicleType: 'Bus', capacity: 4, driverName: 'Demo Driver', driverPhone: '+250 000 000 005' },
];
const transportRoutes = [
  { id: 302, vehicleId: 301, name: 'DEMO Route A', stops: 'DemoStop A, DemoStop B', morningTime: timeAt(7, 0), eveningTime: timeAt(17, 0), fare: 500, assignment_count: 1 },
];
const transportAssignments = [
  { student_id: 3001, route_id: 302, pickup_point: 'DemoStop A', student_name: 'Demo Student', student_code: 'DEMO-S-1001' },
];
const libraryBooks = [
  { id: 401, title: 'Demo Book', author: 'Demo Author', isbn: 'DEMO-ISBN-001', category: 'ICT', publisher: 'Demo Publisher', published_year: 2026, quantity: 2, available: 2, location: 'Demo Shelf' },
];

export const demoData = {
  user: users,
  admin: admins,
  hostelRooms,
  hostelAllocations,
  school,
  smsStats,
  aiData,
  promoteData,
  transportVehicles,
  transportRoutes,
  transportAssignments,
  libraryBooks,
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
  homework,
  homeworkSubmission: homeworkSubmissions,
  lessonPlan: lessonPlans,
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
