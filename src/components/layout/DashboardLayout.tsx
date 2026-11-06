'use client';

import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar
            role={role}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar role={role} onToggle={() => setMobileSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            showMenuButton={true}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
