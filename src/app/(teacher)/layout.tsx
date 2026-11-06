'use client';

import { SessionProvider } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardLayout role="teacher">{children}</DashboardLayout>
    </SessionProvider>
  );
}
