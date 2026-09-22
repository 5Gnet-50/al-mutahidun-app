'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/helpers';
import { BarChart3, TrendingUp, Users, Wallet, Gift, CreditCard } from 'lucide-react';

export default function AdminReportsPage() {
  return <AdminShell><ReportsContent /></AdminShell>;
}

function ReportsContent() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalRevenue: 0,
    totalGiftsSold: 0,
    totalExchanges: 0,
    recentTransactions: [] as { id: string; type: string; amount: number; status: string; created_at: string; reference: string }[],
  });

  useEffect(() => {
    async function fetchReports() {
      const [usersRes, agentsRes, paymentsRes, giftsRes, exRes, txRes] = await Promise.all([
        supabase.from('profiles').select('id, role', { count: 'exact' }),
        supabase.from('agents').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('amount, status'),
        supabase.from('user_gifts').select('id', { count: 'exact', head: true }),
        supabase.from('exchanges').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('id, type, amount, status, created_at, reference').order('created_at', { ascending: false }).limit(10),
      ]);

      const payments = paymentsRes.data || [];
      const revenue = payments.filter((p) => p.status === 'success').reduce((s, p) => s + Number(p.amount), 0);
      const users = (usersRes.data as { role: string }[]) || [];

      setStats({
        totalUsers: users.filter((u) => u.role === 'user').length,
        totalAgents: agentsRes.count || 0,
        totalRevenue: revenue,
        totalGiftsSold: giftsRes.count || 0,
        totalExchanges: exRes.count || 0,
        recentTransactions: (txRes.data as any[]) || [],
      });
      setLoading(false);
    }
    fetchReports();
  }, []);

  const reportCards = [
    { label: 'إجمالي العملاء', value: formatNumber(stats.totalUsers), icon: Users, color: 'text-primary' },
    { label: 'إجمالي الوكلاء', value: formatNumber(stats.totalAgents), icon: Users, color: 'text-accent' },
    { label: 'إجمالي الإيرادات', value: formatCurrency(stats.totalRevenue), icon: Wallet, color: 'text-success' },
    { label: 'هدايا مباعة', value: formatNumber(stats.totalGiftsSold), icon: Gift, color: 'text-primary' },
    { label: 'مبادلات', value: formatNumber(stats.totalExchanges), icon: CreditCard, color: 'text-accent' },
  ];

  const txTypeLabels: Record<string, string> = {
    purchase: 'شراء', exchange: 'مبادلة', gift_sent: 'إرسال هدية', gift_received: 'استلام هدية', refund: 'استرداد',
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">التقارير</h1>
        <p className="mt-1 text-sm text-muted-foreground">تقارير شاملة عن النظام</p>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 gap-3">
        {reportCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="card-hover flex items-center gap-4 p-4 animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-secondary ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <TrendingUp className="h-4 w-4 text-primary" />
          النشاط الأخير
        </h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : stats.recentTransactions.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">لا يوجد نشاط</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {stats.recentTransactions.map((tx) => (
              <Card key={tx.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{txTypeLabels[tx.type] || tx.type}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                </div>
                <p className="text-sm font-bold">{formatCurrency(tx.amount)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
