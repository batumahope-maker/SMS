'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard, GraduationCap, UserCheck, Users, School, BookOpen,
  ClipboardCheck, FileText, DollarSign, CreditCard, BarChart3, Megaphone,
  Calendar, Library, Bus, Home, Settings, ChevronLeft, ChevronRight,
  Shield, Sparkles, ArrowUpCircle, MessageSquare, QrCode, Award, Building2,
} from 'lucide-react';
import { UserRole } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, GraduationCap, UserCheck, Users, School, BookOpen,
  ClipboardCheck, FileText, DollarSign, CreditCard, BarChart3, Megaphone,
  Calendar, Library, Bus, Home, Settings, Shield, Sparkles,
  ArrowUpCircle, MessageSquare, QrCode, Award, Building2,
};

const navItems: Record<UserRole, Array<{ title: string; href: string; icon: string }>> = {
  admin: [
    { title: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
    { title: 'REB section', href: '/admin/reb', icon: 'Award' },
    { title: 'TVET section', href: '/admin/tvet', icon: 'Building2' },
    { title: 'Students', href: '/admin/students', icon: 'GraduationCap' },
    { title: 'Teachers', href: '/admin/teachers', icon: 'UserCheck' },
    { title: 'Classes', href: '/admin/classes', icon: 'School' },
    { title: 'Subjects', href: '/admin/subjects', icon: 'BookOpen' },
    { title: 'Attendance', href: '/admin/attendance', icon: 'ClipboardCheck' },
    { title: 'Marks', href: '/admin/marks', icon: 'FileText' },
    { title: 'Fees', href: '/admin/fees', icon: 'DollarSign' },
    { title: 'Payments', href: '/admin/payments', icon: 'CreditCard' },
    { title: 'Reports', href: '/admin/reports', icon: 'BarChart3' },
    { title: 'Announcements', href: '/admin/announcements', icon: 'Megaphone' },
    { title: 'Events', href: '/admin/events', icon: 'Calendar' },
    { title: 'Library', href: '/admin/library', icon: 'Library' },
    { title: 'Transport', href: '/admin/transport', icon: 'Bus' },
    { title: 'Hostel', href: '/admin/hostel', icon: 'Home' },
    { title: 'Users', href: '/admin/users', icon: 'Shield' },
    { title: 'AI analysis', href: '/admin/ai-analysis', icon: 'Sparkles' },
    { title: 'Promote students', href: '/admin/promote', icon: 'ArrowUpCircle' },
    { title: 'Send SMS', href: '/admin/sms', icon: 'MessageSquare' },
    { title: 'Settings', href: '/admin/settings', icon: 'Settings' },
  ],
  teacher: [
    { title: 'Dashboard', href: '/teacher/dashboard', icon: 'LayoutDashboard' },
    { title: 'My Classes', href: '/teacher/classes', icon: 'School' },
    { title: 'Attendance', href: '/teacher/attendance', icon: 'ClipboardCheck' },
    { title: 'Marks', href: '/teacher/marks', icon: 'FileText' },
    { title: 'Homework', href: '/teacher/homework', icon: 'BookOpen' },
    { title: 'Lesson Plans', href: '/teacher/lesson-plans', icon: 'FileText' },
  ],
  student: [
    { title: 'Dashboard', href: '/student/dashboard', icon: 'LayoutDashboard' },
    { title: 'My Grades', href: '/student/grades', icon: 'FileText' },
    { title: 'Attendance', href: '/student/attendance', icon: 'ClipboardCheck' },
    { title: 'Homework', href: '/student/homework', icon: 'BookOpen' },
    { title: 'Fees', href: '/student/fees', icon: 'DollarSign' },
    { title: 'Announcements', href: '/student/announcements', icon: 'Megaphone' },
  ],
  parent: [
    { title: 'Dashboard', href: '/parent/dashboard', icon: 'LayoutDashboard' },
    { title: 'My Children', href: '/parent/children', icon: 'Users' },
    { title: 'Grades', href: '/parent/grades', icon: 'FileText' },
    { title: 'Attendance', href: '/parent/attendance', icon: 'ClipboardCheck' },
    { title: 'Fees', href: '/parent/fees', icon: 'DollarSign' },
    { title: 'Messages', href: '/parent/messages', icon: 'MessageSquare' },
  ],
};

const roleColors: Record<UserRole, string> = {
  admin:   'bg-emerald-600',
  teacher: 'bg-blue-600',
  student: 'bg-purple-600',
  parent:  'bg-orange-600',
};

interface SidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ role, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const items = navItems[role] || [];
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');

  useEffect(() => {
    fetch('/api/school-info')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setSchoolName(d.name || ''); setSchoolLogo(d.logo || ''); }
      })
      .catch(() => {});
  }, []);

  const shortName = schoolName
    ? schoolName.split(' ').map((w: string) => w[0]).join('').substring(0, 3).toUpperCase()
    : 'SMS';

  return (
    <div className={cn(
      'flex flex-col bg-card border-r transition-all duration-200',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo header */}
      <div className="flex items-center justify-between h-16 px-3 border-b bg-card">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain border flex-shrink-0" />
            ) : (
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0', roleColors[role])}>
                {shortName}
              </div>
            )}
            <span className="font-semibold text-sm truncate">
              {schoolName || 'School Management'}
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto">
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain border" />
            ) : (
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold', roleColors[role])}>
                {shortName}
              </div>
            )}
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle}
          className={cn('h-7 w-7 p-0 flex-shrink-0', collapsed && 'mx-auto mt-0')}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-3 py-2 border-b bg-muted/30">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full text-white', roleColors[role])}>
            {role.charAt(0).toUpperCase() + role.slice(1)} Portal
          </span>
        </div>
      )}

      {/* Nav items */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-0.5 px-2">
          {items.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? cn('text-white', roleColors[role])
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User info at bottom */}
      {!collapsed && session?.user && (
        <div className="p-3 border-t bg-muted/20">
          <div className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', roleColors[role])}>
              {(session.user.name || session.user.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{session.user.name || session.user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
