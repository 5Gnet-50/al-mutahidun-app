'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency, formatDateTime, TRANSACTION_STATUS_LABELS, TRANSACTION_TYPE_LABELS } from '@/lib/helpers';
import type { Transaction, Notification } from '@/lib/types';
import Link from 'next/link';
import { Gift, Wifi, ListChecks, Bell, TrendingUp, Wallet, ArrowLeft } from 'lucide-react';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!profile) return;
      const [txRes, notifRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_read', false),
      ]);
      setTransactions(txRes.data as Transaction[] || []);
      setUnreadCount(notifRes.count || 0);
      setLoading(false);
    }
    fetchData();
  }, [profile]);

  const quickActions = [
    { href: '/gifts', label: 'الهدايا', icon: Gift, desc: 'تصفح واشترِ', color: 'from-primary/20 to-primary/5 text-primary' },
    { href: '/my-gifts', label: 'هداياي', icon: Wallet, desc: 'مبادلة الهدايا', color: 'from-accent/20 to-accent/5 text-accent' },
    { href: '/transactions', label: 'العمليات', icon: ListChecks, desc: 'سجل العمليات', color: 'from-success/20 to-success/5 text-success' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="animate-fade-in">
        <p className="text-sm text-muted-foreground">مرحباً،</p>
        <h1 className="text-2xl font-bold">{profile?.name}</h1>
      </div>

      {/* Balance Card */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 glow-primary animate-slide-up">
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">رصيدك</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gradient-blue">
            {profile ? formatCurrency(profile.balance) : '...'}
          </p>
          <Link href="/gifts" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            اشترِ هدية جديدة
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className={`card-hover bg-gradient-to-b ${action.color} flex flex-col items-center justify-center gap-2 p-4 text-center`}>
                <Icon className="h-7 w-7" />
                <span className="text-xs font-bold">{action.label}</span>
                <span className="text-[10px] opacity-70">{action.desc}</span>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">آخر العمليات</h2>
          <Link href="/transactions" className="text-xs text-primary hover:underline">
            عرض الكل
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">لا توجد عمليات بعد</p>
            <Link href="/gifts">
              <span className="text-xs text-primary hover:underline">ابدأ بشراء أول هدية</span>
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const statusInfo = TRANSACTION_STATUS_LABELS[tx.status] || TRANSACTION_STATUS_LABELS.pending;
              return (
                <Card key={tx.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
                    <div>
                      <p className="text-sm font-medium">
                        {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${statusInfo.color}`}>{formatCurrency(tx.amount)}</p>
                    <p className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Notification indicator */}
      {unreadCount > 0 && (
        <Link href="/notifications">
          <Card className="card-hover flex items-center gap-3 border-accent/20 bg-accent/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">لديك {unreadCount} إشعار جديد</p>
              <p className="text-xs text-muted-foreground">اضغط للعرض</p>
            </div>
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      )}
    </div>
  );
}
