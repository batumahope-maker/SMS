'use client';

import { useEffect, useState } from 'react';
import { MarksClient } from '@/components/marks/MarksClient';

/**
 * Admin marks page in synthetic demo mode: wires the MarksClient (create
 * form → POST /api/marks) to the server API, which writes into the
 * in-memory demo data.
 */
interface ApiMark {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string | null;
  subject: string;
  term: string;
  year: number | null;
  marks: number;
  maxMarks: number;
  percentage: number | null;
  grade: string | null;
}

interface ApiStudent {
  id: string;
  fullName: string;
  studentId: string | null;
}

export function AdminMarksClient() {
  const [marks, setMarks] = useState<{
    id: string;
    marks: number;
    grade: string | null;
    term: string;
    examType: string;
    academicYear: string;
    student: { fullName: string; studentId: string };
    subject: { name: string; code: string | null };
    teacher: { fullName: string } | null;
  }[]>([]);
  const [students, setStudents] = useState<
    { id: string; fullName: string; studentId: string }[]
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/marks', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/students', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([marksRows, studentRows]) => {
        if (cancelled) return;
        const markList = (marksRows as ApiMark[]) ?? [];
        setMarks(
          markList.map((mark) => ({
            id: String(mark.id),
            marks: mark.marks,
            grade: mark.grade,
            term: mark.term,
            examType: 'Test',
            academicYear: String(mark.year ?? new Date().getFullYear()),
            student: { fullName: mark.studentName, studentId: mark.studentNumber ?? '' },
            subject: { name: mark.subject, code: null },
            teacher: null,
          }))
        );
        setStudents(
          ((studentRows as ApiStudent[]) ?? []).map((row) => ({
            id: String(row.id),
            fullName: row.fullName,
            studentId: row.studentId ?? '',
          }))
        );
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
    return <p className="text-sm text-muted-foreground">Loading marks…</p>;
  }

  const stats = marks.reduce(
    (acc, mark) => {
      acc.total += 1;
      const score = mark.marks;
      if (score > acc.highest) acc.highest = score;
      if (acc.lowest === null || score < acc.lowest) acc.lowest = score;
      acc.avg = acc.total ? (acc.avg * (acc.total - 1) + score) / acc.total : score;
      return acc;
    },
    { avg: 0, highest: 0, lowest: null as number | null, total: 0 }
  );

  return (
    <MarksClient
      marks={marks}
      students={students}
      subjects={[...new Set(marks.map((mark) => mark.subject.name))].map((name) => ({
        id: name,
        name,
        code: null,
      }))}
      stats={{
        avg: stats.avg,
        highest: stats.highest,
        lowest: stats.lowest ?? 0,
        total: stats.total,
      }}
    />
  );
}
