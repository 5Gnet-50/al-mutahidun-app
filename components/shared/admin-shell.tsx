'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AdminRoute } from '@/components/shared/protected-route';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Shield, Users, Gift, Wifi, CreditCard, Wallet,
  ListChecks, ArrowRight, Radio, Settings, UserCog,
  Megaphone, BarChart3, Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin', label: 'لوحة الإدارة', icon: Shield },
  { href: '/admin/users', label: 'المستخدمون', icon: Users },
  { href: '/admin/gifts', label: 'الهدايا', icon: Gift },
  { href: '/admin/networks', label: 'الشبكات', icon: Wifi },
  { href: '/admin/plans', label: 'الباقات', icon: Radio },
  { href: '/admin/payments', label: 'المدفوعات', icon: Wallet },
  { href: '/admin/exchanges', label: 'المبادلات', icon: CreditCard },
  { href: '/admin/agents', label: 'الوكلاء', icon: UserCog },
  { href: '/admin/marketers', label: 'المسوقون', icon: Megaphone },
  { href: '/admin/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <AdminShellContent>{children}</AdminShellContent>
    </AdminRoute>
  );
}

function AdminShellContent({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
    : '؟';

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold">لوحة الإدارة</span>
              <p className="text-[10px] text-muted-foreground -mt-0.5">المتحدون</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Home className="h-4 w-4" />
                المستخدم
              </Button>
            </Link>
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-md px-4 pb-24 pt-4">
        {children}
      </div>

      {/* Bottom nav - show first 6 admin items */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {adminNavItems.slice(0, 6).map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
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

      {/* More menu — floating button for remaining items */}
      <div className="fixed bottom-20 right-4 z-30">
        <Link href="/admin/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary border border-border text-muted-foreground shadow-lg">
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
