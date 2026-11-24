'use client';

import { useEffect, useState } from 'react';
import { StudentsClient, Student, Class } from '@/components/students/StudentsClient';

/**
 * Admin students page in synthetic demo mode: wires the StudentsClient
 * (create/edit/delete forms) to the server API, which writes into the
 * in-memory demo data via src/lib/demo-management-writer.
 */
interface ApiStudent {
  id: string;
  studentId: string | null;
  userId: number | null;
  fullName: string;
  gender: string | null;
  dateOfBirth: Date | null;
  phone: string | null;
  trade: string | null;
  level: string | null;
  section: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  feePaid: number;
  feeBalance: number;
  status: string | null;
  enrollmentDate: Date | null;
}

interface ApiClass {
  id: string;
  name: string;
}

function deriveClassName(student: ApiStudent): string | null {
  return [student.trade, student.level, student.section].filter(Boolean).join(' ') || null;
}

function toStudent(row: ApiStudent): Student {
  const className = deriveClassName(row);
  return {
    id: String(row.id),
    studentId: row.studentId ?? '',
    fullName: row.fullName,
    gender: row.gender ?? 'Male',
    dateOfBirth: row.dateOfBirth,
    phone: row.phone,
    address: null,
    trade: row.trade ?? '',
    level: row.level ?? '',
    section: row.section ?? '',
    classId: className,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    guardianEmail: null,
    feePaid: row.feePaid ?? 0,
    feeBalance: row.feeBalance ?? 0,
    status: row.status ?? 'Active',
    enrollmentDate: row.enrollmentDate ?? new Date(0),
    createdAt: row.enrollmentDate ?? new Date(0),
    class: className
      ? {
          id: className,
          name: className,
          trade: row.trade ?? '',
          level: row.level ?? '',
          section: row.section ?? '',
        }
      : null,
    user: row.phone || row.status ? { email: null, phone: row.phone } : null,
  };
}

function deriveClasses(students: Student[]): Class[] {
  const map = new Map<string, Class>();
  for (const student of students) {
    const name = [student.trade, student.level, student.section]
      .filter(Boolean)
      .join(' ');
    if (!name) continue;
    if (!map.has(name)) {
      map.set(name, {
        id: name,
        name,
        trade: student.trade,
        level: student.level,
        section: student.section,
      });
    }
  }
  return [...map.values()];
}

export function AdminStudentsClient() {
  const [students, setStudents] = useState<Student[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/students', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: ApiStudent[]) => {
        if (cancelled) return;
        setStudents((rows ?? []).map(toStudent));
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading students…</p>;
  }

  return <StudentsClient students={students} classes={deriveClasses(students)} />;
}
