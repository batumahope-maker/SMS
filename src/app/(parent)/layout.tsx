'use client';

import { SessionProvider } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardLayout role="parent">{children}</DashboardLayout>
    </SessionProvider>
  );
}
