'use client';

import { SessionProvider } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardLayout role="admin">{children}</DashboardLayout>
    </SessionProvider>
  );
}
