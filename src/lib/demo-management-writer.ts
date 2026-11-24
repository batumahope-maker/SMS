/**
 * Demo writers for admin management features (students, teachers, …).
 *
 * Synthetic equivalents of the live writer procedures used by the management
 * API routes: they mutate only the in-memory demo data in
 * src/lib/demo-data.ts. Live deployments are unaffected — their API routes
 * still return the read-only responses for these writes.
 */
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { WriterError } from './db-writer';
import { demoData } from './demo-data';
import { DEMO_PASSWORD } from './demo-mode';

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(String(value));
}

function md5Hex(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

function nextUserId(): number {
  const ids = demoData.user.map((row) => Number(row.id ?? 0));
  return Math.max(0, ...ids) + 1;
}

function nextRowId(rows: { id: number }[]): number {
  return Math.max(0, ...rows.map((row) => Number(row.id ?? 0))) + 1;
}

function uniqueSuffix(base: string, taken: Set<string>): string {
  let username = base;
  let suffix = 1;
  while (taken.has(username)) {
    suffix += 1;
    username = `${base}-${suffix}`;
  }
  return username;
}

function randomId(prefix: string, taken: Set<string>): string {
  const hex = randomBytes(4).toString('hex').toUpperCase();
  let id = `${prefix}-${hex}`;
  let n = 0;
  while (taken.has(id)) {
    n += 1;
    id = `${prefix}-${hex}-${n}`;
  }
  return id;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function trimTo(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

/* --------------------------------------------------------------------------
 * Students
 * ---------------------------------------------------------------------- */

export interface CreateStudentParams {
  /** Admin-assigned student ID (e.g. from the StudentsClient form). */
  studentId?: string | null;
  fullName: string;
  gender?: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  trade?: string;
  level?: string;
  section?: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  email?: string | null;
  enrollmentDate?: string | null;
  feePaid?: number;
  feeBalance?: number;
}

export interface UpdateStudentParams {
  /** Rejected with a typed error when provided: student IDs are immutable. */
  studentId?: string | null;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string | null;
  trade?: string;
  level?: string;
  section?: string;
  phone?: string | null;
  email?: string | null;
}

export async function createStudentDemo(
  params: CreateStudentParams
): Promise<{ userId: number; studentId: string }> {
  const fullName = trimTo(params.fullName);
  if (!fullName) {
    throw new WriterError('WRITER_INPUT_INVALID', 'Full name is required');
  }

  const studentIds = new Set(demoData.student.map((row) => row.studentId));
  const studentId =
    trimTo(params.studentId) ?? randomId('DEMO-S', studentIds);
  if (studentIds.has(studentId)) {
    throw new WriterError('DUPLICATE_STUDENT_ID', 'This student ID is already in use.');
  }

  const userId = nextUserId();
  const usernameTaken = new Set(demoData.user.map((row) => row.username));
  const username = uniqueSuffix(`student-${studentId}`, usernameTaken);
  const emailTaken = new Set(demoData.user.map((row) => row.email));
  const email = uniqueSuffix(
    trimTo(params.email) ?? `${username}@example.com`,
    emailTaken
  );

  demoData.user.push({
    id: userId,
    username,
    password: md5Hex(DEMO_PASSWORD),
    fullName,
    email,
    phone: trimTo(params.phone) ?? '',
    role: 'student',
    status: 'Active',
    createdAt: new Date(),
  });

  demoData.student.push({
    id: nextRowId(demoData.student),
    userId,
    studentId,
    trade: trimTo(params.trade) ?? '',
    level: trimTo(params.level) ?? '',
    section: trimTo(params.section) ?? '',
    gender: trimTo(params.gender) ?? 'Male',
    dateOfBirth: toDate(params.dateOfBirth) ?? new Date(),
    guardianName: trimTo(params.guardianName) ?? '',
    guardianPhone: trimTo(params.guardianPhone) ?? '',
    enrollmentDate: toDate(params.enrollmentDate) ?? new Date(),
    feePaid: money(Number(params.feePaid ?? 0) || 0),
    feeBalance: money(Number(params.feeBalance ?? 0) || 0),
  });

  return { userId, studentId };
}

export async function updateStudentDemo(
  userId: number,
  params: UpdateStudentParams
): Promise<{ userId: number }> {
  const student = demoData.student.find((row) => Number(row.userId) === userId);
  if (!student) {
    throw new WriterError('RECORD_NOT_FOUND', 'Student not found');
  }

  if (params.studentId) {
    throw new WriterError(
      'WRITER_INPUT_INVALID',
      'Student IDs cannot be changed here.'
    );
  }

  if (params.fullName !== undefined) {
    const fullName = trimTo(params.fullName);
    if (!fullName) throw new WriterError('WRITER_INPUT_INVALID', 'Full name is required');
    const user = demoData.user.find((row) => row.id === student.userId);
    if (user) user.fullName = fullName;
  }
  if (params.gender !== undefined) student.gender = params.gender || 'Male';
  if (params.dateOfBirth !== undefined) {
    student.dateOfBirth = toDate(params.dateOfBirth) ?? new Date();
  }
  if (params.trade !== undefined) student.trade = trimTo(params.trade) ?? '';
  if (params.level !== undefined) student.level = trimTo(params.level) ?? '';
  if (params.section !== undefined) student.section = trimTo(params.section) ?? '';
  if (params.phone !== undefined) {
    const user = demoData.user.find((row) => row.id === student.userId);
    if (user) user.phone = trimTo(params.phone) ?? '';
  }
  if (params.email !== undefined) {
    const user = demoData.user.find((row) => row.id === student.userId);
    if (user) user.email = trimTo(params.email) ?? user.email;
  }

  return { userId };
}

export async function deleteStudentDemo(
  userId: number
): Promise<{ userId: number }> {
  const student = demoData.student.find((row) => Number(row.userId) === userId);
  if (!student) {
    throw new WriterError('RECORD_NOT_FOUND', 'Student not found');
  }

  // Remove the student's academic history so nothing dangles.
  demoData.mark = demoData.mark.filter((row) => row.studentId !== userId);
  demoData.attendance = demoData.attendance.filter((row) => row.studentId !== userId);
  demoData.payment = demoData.payment.filter((row) => row.studentId !== userId);
  demoData.homework = demoData.homework.filter((row) => row.studentId !== userId);
  demoData.homeworkSubmission = demoData.homeworkSubmission.filter(
    (row) => row.studentId !== userId
  );

  const studentIndex = demoData.student.indexOf(student);
  if (studentIndex >= 0) demoData.student.splice(studentIndex, 1);
  const user = demoData.user.find((row) => Number(row.id) === student.userId);
  if (user) {
    const userIndex = demoData.user.indexOf(user);
    if (userIndex >= 0) demoData.user.splice(userIndex, 1);
  }

  return { userId };
}

/* --------------------------------------------------------------------------
 * Teachers
 * ---------------------------------------------------------------------- */

export interface CreateTeacherParams {
  teacherId?: string | null;
  fullName: string;
  gender?: string;
  phone?: string | null;
  subjects?: string;
  department?: string;
  email?: string | null;
  hireDate?: string | null;
}

export async function createTeacherDemo(
  params: CreateTeacherParams
): Promise<{ userId: number; teacherId: string }> {
  const fullName = trimTo(params.fullName);
  if (!fullName) {
    throw new WriterError('WRITER_INPUT_INVALID', 'Full name is required');
  }

  const teacherIds = new Set(demoData.teacher.map((row) => row.teacherId));
  const teacherId = trimTo(params.teacherId) ?? randomId('DEMO-T', teacherIds);
  if (teacherIds.has(teacherId)) {
    throw new WriterError('DUPLICATE_STUDENT_ID', 'This teacher ID is already in use.');
  }

  const userId = nextUserId();
  const usernameTaken = new Set(demoData.user.map((row) => row.username));
  const username = uniqueSuffix(`teacher-${teacherId}`, usernameTaken);
  const emailTaken = new Set(demoData.user.map((row) => row.email));
  const email = uniqueSuffix(
    trimTo(params.email) ?? `${username}@example.com`,
    emailTaken
  );

  demoData.user.push({
    id: userId,
    username,
    password: md5Hex(DEMO_PASSWORD),
    fullName,
    email,
    phone: trimTo(params.phone) ?? '',
    role: 'teacher',
    status: 'Active',
    createdAt: new Date(),
  });

  demoData.teacher.push({
    id: nextRowId(demoData.teacher),
    userId,
    teacherId,
    subject: trimTo(params.subjects) ?? '',
    department: trimTo(params.department) ?? '',
    hireDate: toDate(params.hireDate) ?? new Date(),
  });

  return { userId, teacherId };
}
