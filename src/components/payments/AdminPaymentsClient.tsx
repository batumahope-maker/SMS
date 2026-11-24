'use client';

import { useEffect, useState } from 'react';
import { PaymentsClient } from '@/components/payments/PaymentsClient';

/**
 * Admin payments page in synthetic demo mode: wires the PaymentsClient
 * (record payment form → POST /api/payments) to the server API, which
 * writes into the in-memory demo data.
 */
interface ApiPayment {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string | null;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference: string | null;
}

interface ApiStudent {
  id: string;
  fullName: string;
  studentId: string | null;
}

export function AdminPaymentsClient() {
  const [payments, setPayments] = useState<{
    id: string;
    amount: number;
    paymentMethod: string;
    receiptNumber: string;
    paidFor: string;
    term: string | null;
    paidAt: Date;
    student: { fullName: string; studentId: string; class: { name: string } | null };
  }[]>([]);
  const [students, setStudents] = useState<
    { id: string; fullName: string; studentId: string }[]
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/payments', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/students', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([paymentRows, studentRows]) => {
        if (cancelled) return;
        const list = (paymentRows as ApiPayment[]) ?? [];
        setPayments(
          list.map((payment) => ({
            id: String(payment.id),
            amount: payment.amount,
            paymentMethod: payment.paymentMethod ?? 'Cash',
            receiptNumber: payment.reference ?? `PAY-${payment.id}`,
            paidFor: 'Tuition',
            term: null,
            paidAt: payment.paymentDate,
            student: {
              fullName: payment.studentName ?? '',
              studentId: payment.studentNumber ?? '',
              class: null,
            },
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
    return <p className="text-sm text-muted-foreground">Loading payments…</p>;
  }

  const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const thisMonth = payments.reduce((sum, payment) => {
    const paid = new Date(payment.paidAt);
    return sum + (paid.getMonth() === new Date().getMonth() ? payment.amount : 0);
  }, 0);

  return (
    <PaymentsClient
      payments={payments}
      students={students}
      totalCollected={totalCollected}
      thisMonth={thisMonth}
    />
  );
}
