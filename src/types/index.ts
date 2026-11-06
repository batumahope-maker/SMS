// ESSJT School Management System - Type Definitions

// ==================== User Types ====================
export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  schoolId: string;
  lastLogin?: Date;
  twoFactorEnabled: boolean;
  avatar?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Student Types ====================
export type StudentStatus = 'active' | 'graduated' | 'withdrawn' | 'suspended';

export interface Student {
  id: string;
  studentId: string;
  userId: string;
  schoolId: string;
  fullName: string;
  trade?: string;
  level?: string;
  section?: string;
  gender: string;
  dob?: Date;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  photo?: string;
  feePaid: number;
  feeBalance: number;
  enrollmentDate: Date;
  status: StudentStatus;
  classId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Teacher Types ====================
export type TeacherStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export interface Teacher {
  id: string;
  teacherId: string;
  userId: string;
  schoolId: string;
  fullName: string;
  subject?: string;
  department?: string;
  qualification?: string;
  salary: number;
  phone?: string;
  address?: string;
  photo?: string;
  joinDate: Date;
  status: TeacherStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Parent Types ====================
export interface Parent {
  id: string;
  userId: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParentStudent {
  id: string;
  parentId: string;
  studentId: string;
  relation: string;
  createdAt: Date;
}

// ==================== Admin Types ====================
export type AdminRole = 'super_admin' | 'admin' | 'accountant' | 'librarian' | 'receptionist';

export interface Admin {
  id: string;
  userId: string;
  schoolId: string;
  fullName: string;
  role: AdminRole;
  permissions?: string;
  phone?: string;
  photo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== School Types ====================
export type SchoolStatus = 'active' | 'inactive' | 'suspended';

export interface School {
  id: string;
  name: string;
  logo?: string;
  subdomain: string;
  licenseKey?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  motto?: string;
  themeColors?: string;
  settings?: string;
  status: SchoolStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Class Types ====================
export interface Class {
  id: string;
  schoolId: string;
  name: string;
  trade?: string;
  level?: string;
  section?: string;
  teacherId?: string;
  capacity: number;
  academicYear?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Subject Types ====================
export interface Subject {
  id: string;
  name: string;
  code?: string;
  teacherId?: string;
  classId?: string;
  creditHours?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Marks & Grades Types ====================
export interface Marks {
  id: string;
  studentId: string;
  subjectId: string;
  teacherId: string;
  term: string;
  marks: number;
  grade?: string;
  remarks?: string;
  academicYear: string;
  examType?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Attendance Types ====================
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: AttendanceStatus;
  remark?: string;
  markedBy: string;
  createdAt: Date;
}

// ==================== Exam Types ====================
export type ExamStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Exam {
  id: string;
  name: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  subjectId: string;
  classId: string;
  totalMarks: number;
  passingMarks?: number;
  examType?: string;
  term?: string;
  academicYear?: string;
  status: ExamStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
  rank?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Homework Types ====================
export type HomeworkStatus = 'active' | 'closed' | 'draft';
export type SubmissionStatus = 'submitted' | 'graded' | 'late';

export interface Homework {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  dueDate: Date;
  attachments?: string;
  maxMarks?: number;
  status: HomeworkStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  content?: string;
  attachments?: string;
  submittedAt: Date;
  marks?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
  status: SubmissionStatus;
}

// ==================== Financial Types ====================
export type PaymentMethod = 'cash' | 'bank' | 'mobile_money' | 'card';

export interface FeeStructure {
  id: string;
  schoolId: string;
  classId?: string;
  name: string;
  amount: number;
  term?: string;
  academicYear: string;
  dueDate?: Date;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  studentId: string;
  schoolId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  receiptNumber: string;
  paymentFor?: string;
  term?: string;
  academicYear?: string;
  notes?: string;
  paidAt: Date;
  receivedBy?: string;
  createdAt: Date;
}

export interface PaymentPlan {
  id: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  installments: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  schoolId: string;
  category: string;
  amount: number;
  description?: string;
  date: Date;
  paidTo?: string;
  receiptNo?: string;
  approvedBy?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payroll {
  id: string;
  teacherId: string;
  amount: number;
  month: number;
  year: number;
  bonus: number;
  deductions: number;
  netAmount: number;
  status: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Communication Types ====================
export type Audience = 'all' | 'students' | 'teachers' | 'parents' | 'specific_class';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  audience: Audience;
  priority: Priority;
  expiresAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  audience: Audience;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  subject?: string;
  content: string;
  attachments?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

// ==================== Library Types ====================
export type BookStatus = 'available' | 'unavailable' | 'lost';
export type IssueStatus = 'issued' | 'returned' | 'overdue';

export interface Book {
  id: string;
  schoolId: string;
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
  publisher?: string;
  publishYear?: number;
  quantity: number;
  available: number;
  location?: string;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookIssue {
  id: string;
  bookId: string;
  studentId: string;
  issuedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  fine: number;
  finePaid: boolean;
  status: IssueStatus;
  createdAt: Date;
}

// ==================== Transport Types ====================
export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export interface Vehicle {
  id: string;
  schoolId: string;
  number: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  route?: string;
  status: VehicleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransportRoute {
  id: string;
  vehicleId: string;
  name: string;
  stops: string;
  timings?: string;
  fare: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransportAssignment {
  id: string;
  studentId: string;
  routeId: string;
  pickupPoint: string;
  fare: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Hostel Types ====================
export type RoomStatus = 'available' | 'full' | 'maintenance';

export interface Room {
  id: string;
  schoolId: string;
  roomNumber: string;
  capacity: number;
  occupants: number;
  gender?: string;
  block?: string;
  floor?: string;
  facilities?: string;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomAllocation {
  id: string;
  studentId: string;
  roomId: string;
  bedNumber?: number;
  allocatedAt: Date;
  vacatedAt?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== License Types ====================
export type LicensePlan = 'basic' | 'standard' | 'premium' | 'enterprise';
export type LicenseStatus = 'active' | 'expired' | 'suspended';

export interface License {
  id: string;
  schoolId?: string;
  key: string;
  plan: LicensePlan;
  expiresAt: Date;
  features: string;
  maxStudents?: number;
  maxTeachers?: number;
  status: LicenseStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Activity Log Types ====================
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ==================== Session Types ====================
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: Date;
}

// ==================== Settings Types ====================
export interface Settings {
  id: string;
  schoolId: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== API Response Types ====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== Dashboard Statistics ====================
export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  totalFeesCollected: number;
  totalFeeBalance: number;
  attendanceRate: number;
  upcomingEvents: number;
  recentPayments: Payment[];
  recentAnnouncements: Announcement[];
}

// ==================== Form Types ====================
export interface LoginForm {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface StudentForm {
  studentId: string;
  fullName: string;
  gender: string;
  dob?: Date;
  phone?: string;
  address?: string;
  trade?: string;
  level?: string;
  section?: string;
  classId?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  email?: string;
  password?: string;
}

export interface TeacherForm {
  teacherId: string;
  fullName: string;
  subject?: string;
  department?: string;
  qualification?: string;
  salary: number;
  phone?: string;
  address?: string;
  email?: string;
  password?: string;
}

export interface ClassForm {
  name: string;
  trade?: string;
  level?: string;
  section?: string;
  teacherId?: string;
  capacity: number;
  academicYear?: string;
}

export interface SubjectForm {
  name: string;
  code?: string;
  teacherId?: string;
  classId?: string;
  creditHours?: number;
}

export interface FeeStructureForm {
  name: string;
  amount: number;
  classId?: string;
  term?: string;
  academicYear: string;
  dueDate?: Date;
  description?: string;
}

export interface PaymentForm {
  studentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentFor?: string;
  term?: string;
  academicYear?: string;
  notes?: string;
}

export interface AnnouncementForm {
  title: string;
  content: string;
  audience: Audience;
  priority: Priority;
  expiresAt?: Date;
}

export interface EventForm {
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  audience: Audience;
}

// ==================== Chart Data Types ====================
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface AttendanceChartData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface FeeChartData {
  month: string;
  collected: number;
  pending: number;
}

// ==================== Navigation Types ====================
export interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

// ==================== Filter Types ====================
export interface StudentFilter {
  search?: string;
  classId?: string;
  gender?: string;
  status?: StudentStatus;
  page?: number;
  pageSize?: number;
}

export interface TeacherFilter {
  search?: string;
  department?: string;
  status?: TeacherStatus;
  page?: number;
  pageSize?: number;
}

export interface PaymentFilter {
  studentId?: string;
  startDate?: Date;
  endDate?: Date;
  paymentMethod?: PaymentMethod;
  page?: number;
  pageSize?: number;
}
