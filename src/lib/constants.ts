// School Management System - Constants

export const APP_NAME = 'School Management System';
export const APP_SHORT_NAME = 'SchoolMS';
export const APP_VERSION = '1.0.0';

// ==================== System Types ====================
export const SCHOOL_SYSTEMS = {
  REB: 'reb',
  TVET: 'tvet',
} as const;

export const SCHOOL_SYSTEM_LABELS: Record<string, string> = {
  reb: 'REB (Ordinary & Advanced Level)',
  tvet: 'TVET (Technical & Vocational)',
};

// REB Levels
export const REB_OLEVEL = ['S1', 'S2', 'S3'] as const;
export const REB_ALEVEL = ['S4', 'S5', 'S6'] as const;
export const REB_ALL_LEVELS = [...REB_OLEVEL, ...REB_ALEVEL] as const;

export const REB_OLEVEL_COMBINATIONS = [
  'MCE', 'MPC', 'MEG', 'HEG', 'HGL', 'HPE', 'PCB', 'PCM',
] as const;

export const REB_ALEVEL_COMBINATIONS = [
  'MPC', 'MPG', 'MCB', 'MEG', 'HEG', 'HGL', 'HPE', 'PCB', 'PCM', 'ECS',
] as const;

// TVET Levels
export const TVET_LEVELS = ['L3', 'L4', 'L5'] as const;

export const TVET_TRADES = [
  'Software Development',
  'Electronics & Telecommunications',
  'Electricity',
  'Mechanics & Automotive',
  'Civil & Construction',
  'Carpentry & Joinery',
  'Plumbing & Sanitation',
  'Welding & Metal Fabrication',
  'Tailoring & Fashion Design',
  'Catering & Food Processing',
  'Agriculture & Food Science',
  'Accounting & Finance',
  'Business Management',
  'Hairdressing & Beauty',
] as const;

// ==================== Roles ====================
export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

// ==================== Status ====================
export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
};

// ==================== Academic ====================
export const TERMS = ['Term 1', 'Term 2', 'Term 3'] as const;

export const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return [-1, 0, 1, 2].map(i => `${y + i}`);
})();

// Combined for forms
export const ALL_LEVELS = [...REB_ALL_LEVELS, ...TVET_LEVELS] as const;
export const ALL_SECTIONS = ['A', 'B', 'C', 'D'] as const;

// ==================== Attendance ====================
export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  excused: 'bg-blue-100 text-blue-800',
};

// ==================== Grades ====================
export const GRADE_SCALE = [
  { min: 90, grade: 'A+' }, { min: 80, grade: 'A' }, { min: 70, grade: 'B' },
  { min: 60, grade: 'C' }, { min: 50, grade: 'D' }, { min: 0, grade: 'F' },
] as const;

export function getGrade(marks: number): string {
  return GRADE_SCALE.find(g => marks >= g.min)?.grade || 'F';
}

// ==================== Payment ====================
export const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Mobile Money', label: 'Mobile Money (MTN/Airtel)' },
  { value: 'Bank', label: 'Bank Transfer' },
  { value: 'Card', label: 'Card' },
] as const;

export const PAYMENT_FOR_OPTIONS = [
  'Tuition Fee', 'Registration Fee', 'Library Fee',
  'Transport Fee', 'Hostel Fee', 'Exam Fee', 'Sports Fee', 'Other',
] as const;

// ==================== Languages ====================
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
] as const;

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  TIME: 'HH:mm',
} as const;
