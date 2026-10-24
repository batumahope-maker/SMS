'use client';

import { SessionProvider } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardLayout role="student">{children}</DashboardLayout>
    </SessionProvider>
  );
}
