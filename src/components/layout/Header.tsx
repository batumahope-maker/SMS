'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Settings, LogOut, User, Moon, Sun, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/constants';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const roleColor: Record<string, string> = {
    admin: 'bg-emerald-600', teacher: 'bg-blue-600',
    student: 'bg-purple-600', parent: 'bg-orange-600',
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-4">
      {showMenuButton && (
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Dark mode */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleDark}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications — placeholder, real ones come from DB */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-6 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ''} />
                <AvatarFallback className={`text-white text-xs font-bold ${roleColor[session?.user?.role || ''] || 'bg-gray-500'}`}>
                  {session?.user?.name ? initials(session.user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="space-y-0.5">
                <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {ROLE_LABELS[session?.user?.role || ''] || session?.user?.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${session?.user?.role}/profile`} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />Profile
              </Link>
            </DropdownMenuItem>
            {session?.user?.role === 'admin' && (
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
