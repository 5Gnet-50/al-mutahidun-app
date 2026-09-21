'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Gift,
  Wallet,
  ListChecks,
  Bell,
  User,
  LogOut,
  Settings,
  Shield,
  LifeBuoy,
  Menu,
  X,
  Radio,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/gifts', label: 'الهدايا', icon: Gift },
  { href: '/my-gifts', label: 'هداياي', icon: Wallet },
  { href: '/transactions', label: 'العمليات', icon: ListChecks },
  { href: '/notifications', label: 'الإشعارات', icon: Bell },
  { href: '/support', label: 'الدعم', icon: LifeBuoy },
];

const adminNavItems = [
  { href: '/admin', label: 'لوحة الإدارة', icon: Shield },
  { href: '/admin/users', label: 'المستخدمون', icon: User },
  { href: '/admin/gifts', label: 'الهدايا', icon: Gift },
  { href: '/admin/cards', label: 'البطاقات', icon: Radio },
  { href: '/admin/payments', label: 'المدفوعات', icon: Wallet },
  { href: '/admin/transactions', label: 'العمليات', icon: ListChecks },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isAdminPage = pathname?.startsWith('/admin');
  const currentNav = isAdminPage ? adminNavItems : navItems;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
    : '؟';

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Radio className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">المتحدون</span>
          </Link>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href={isAdminPage ? '/dashboard' : '/admin'}>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <Shield className="h-4 w-4" />
                  {isAdminPage ? 'المستخدم' : 'الإدارة'}
                </Button>
              </Link>
            )}
            <Link href="/notifications" className="relative">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-0.5 ring-offset-background transition hover:ring-2 hover:ring-primary/40 focus:outline-none">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="ml-2 h-4 w-4" />
                    الحساب الشخصي
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/support" className="cursor-pointer">
                    <LifeBuoy className="ml-2 h-4 w-4" />
                    الدعم الفني
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Shield className="ml-2 h-4 w-4" />
                      لوحة الإدارة
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop sidebar — hidden on mobile, shown as horizontal nav on larger screens */}
      <div className="mx-auto flex max-w-md">
        <div className="flex-1 px-4 pb-24 pt-4">{children}</div>
      </div>

      {/* Bottom navigation (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {currentNav.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] transition',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-primary')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
