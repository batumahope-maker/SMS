'use client';

import { useEffect, useState } from 'react';
import { TeachersClient, Teacher } from '@/components/teachers/TeachersClient';

/**
 * Admin teachers page in synthetic demo mode: wires the TeachersClient
 * (add teacher form) to the server API, which creates teachers into the
 * in-memory demo data via src/lib/demo-management-writer.
 */
interface ApiTeacher {
  id: string;
  teacherId: string | null;
  userId: number;
  fullName: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  subject: string | null;
  department: string | null;
  hireDate: Date | null;
}

function toTeacher(row: ApiTeacher): Teacher {
  return {
    id: String(row.id),
    teacherId: row.teacherId ?? '',
    fullName: row.fullName,
    gender: row.gender ?? 'Male',
    phone: row.phone,
    subjects: row.subject ?? '',
    department: row.department ?? '',
    qualification: null,
    salary: 0,
    status: row.status ?? 'Active',
    joinDate: row.hireDate ?? new Date(0),
    email: row.email,
    classCount: 0,
  };
}

export function AdminTeachersClient() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/teachers', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: ApiTeacher[]) => {
        if (cancelled) return;
        setTeachers((rows ?? []).map(toTeacher));
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
    return <p className="text-sm text-muted-foreground">Loading teachers…</p>;
  }

  return <TeachersClient teachers={teachers} classes={[]} />;
}
