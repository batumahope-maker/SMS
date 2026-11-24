'use client';

import { useEffect, useState } from 'react';
import { AttendanceClient } from '@/components/attendance/AttendanceClient';

/**
 * Admin attendance page in synthetic demo mode: renders the AttendanceClient
 * viewer fed from the server API.
 */
interface ApiAttendanceRow {
  id: number;
  studentName: string;
  studentNumber: string | null;
  date: Date;
  status: string;
  notes: string | null;
}

export function AdminAttendanceClient() {
  const [records, setRecords] = useState<{
    id: string;
    date: Date;
    status: string;
    remarks: string | null;
    student: { fullName: string; studentId: string };
    class: { name: string } | null;
  }[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/attendance', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: ApiAttendanceRow[]) => {
        if (cancelled) return;
        setRecords((rows ?? []).map((row) => ({
          id: String(row.id),
          date: row.date,
          status: row.status,
          remarks: row.notes,
          student: { fullName: row.studentName, studentId: row.studentNumber ?? '' },
          class: null,
        })));
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
    return <p className="text-sm text-muted-foreground">Loading attendance…</p>;
  }

  const summary = records.reduce(
    (acc, record) => {
      const key = String(record.status).toLowerCase();
      if (key === 'present') acc.present += 1;
      if (key === 'absent') acc.absent += 1;
      if (key === 'late') acc.late += 1;
      if (key === 'excused') acc.excused += 1;
      acc.total += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
  );

  return (
    <AttendanceClient
      records={records}
      classes={[{ id: 'all', name: 'All classes' }]}
      summary={summary}
    />
  );
}
