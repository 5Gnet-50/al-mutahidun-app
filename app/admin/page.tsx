'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency, formatNumber } from '@/lib/helpers';
import { Users, Wallet, Gift, CreditCard, TrendingUp, Wifi, Radio } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return <AdminShell><DashboardContent /></AdminShell>;
}

function DashboardContent() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalGifts: 0,
    totalExchanges: 0,
    availableCards: 0,
    totalCards: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [usersRes, giftsRes, cardsRes, exchangesRes, paymentsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('gifts').select('id', { count: 'exact', head: true }),
        supabase.from('cards').select('id, status', { count: 'exact' }),
        supabase.from('exchanges').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('amount, status'),
      ]);

      const payments = paymentsRes.data || [];
      const revenue = payments
        .filter((p) => p.status === 'success')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const cards = cardsRes.data || [];
      const available = cards.filter((c) => c.status === 'available').length;

      setStats({
        totalUsers: usersRes.count || 0,
        totalRevenue: revenue,
        totalGifts: giftsRes.count || 0,
        totalExchanges: exchangesRes.count || 0,
        availableCards: available,
        totalCards: cards.length,
        pendingPayments: payments.filter((p) => p.status === 'pending').length,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: 'المستخدمون', value: formatNumber(stats.totalUsers), icon: Users, color: 'from-primary/20 to-primary/5 text-primary', href: '/admin/users' },
    { label: 'الإيرادات', value: formatCurrency(stats.totalRevenue), icon: Wallet, color: 'from-accent/20 to-accent/5 text-accent', href: '/admin/payments' },
    { label: 'الهدايا', value: formatNumber(stats.totalGifts), icon: Gift, color: 'from-success/20 to-success/5 text-success', href: '/admin/gifts' },
    { label: 'المبادلات', value: formatNumber(stats.totalExchanges), icon: CreditCard, color: 'from-primary/20 to-primary/5 text-primary', href: '/admin/exchanges' },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
        <p className="mt-1 text-sm text-muted-foreground">نظرة عامة على النظام</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card
                className={`card-hover bg-gradient-to-b ${stat.color} p-4 animate-slide-up`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <Icon className="h-6 w-6 mb-2" />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs opacity-70 mt-0.5">{stat.label}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Inventory status */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">حالة المخزون</h2>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">بطاقات متاحة</span>
              <span className="text-sm font-bold text-success">{formatNumber(stats.availableCards)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">إجمالي البطاقات</span>
              <span className="text-sm font-bold">{formatNumber(stats.totalCards)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">مدفوعات معلقة</span>
              <span className="text-sm font-bold text-warning">{formatNumber(stats.pendingPayments)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-bold">إجراءات سريعة</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: '/admin/users', label: 'المستخدمون', icon: Users },
            { href: '/admin/gifts', label: 'الهدايا', icon: Gift },
            { href: '/admin/plans', label: 'الباقات', icon: Radio },
            { href: '/admin/networks', label: 'الشبكات', icon: Wifi },
            { href: '/admin/reports', label: 'التقارير', icon: TrendingUp },
            { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="card-hover flex flex-col items-center gap-1.5 p-3 text-center">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-[10px] font-medium">{link.label}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Need to import Settings
import { Settings } from 'lucide-react';
