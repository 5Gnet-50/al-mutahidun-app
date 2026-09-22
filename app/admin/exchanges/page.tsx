'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency, formatDateTime } from '@/lib/helpers';
import type { Exchange, Profile, Network, CardType } from '@/lib/types';
import { CreditCard } from 'lucide-react';

export default function AdminExchangesPage() {
  return <AdminShell><ExchangesContent /></AdminShell>;
}

function ExchangesContent() {
  const [exchanges, setExchanges] = useState<(Exchange & { profile?: Profile; network?: Network; card?: CardType })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExchanges() {
      const { data } = await supabase
        .from('exchanges')
        .select('*, profile:profiles!exchanges_user_id_fkey(name, username), network:networks(*), card:cards(code, value)')
        .order('created_at', { ascending: false })
        .limit(100);
      setExchanges((data as unknown as (Exchange & { profile?: Profile; network?: Network; card?: CardType })[]) || []);
      setLoading(false);
    }
    fetchExchanges();
  }, []);

  const statusColors: Record<string, string> = {
    success: 'text-success', failed: 'text-destructive', pending: 'text-warning',
  };
  const statusLabels: Record<string, string> = {
    success: 'ناجحة', failed: 'فاشلة', pending: 'قيد المعالجة',
  };

  return (
    <div className="space-y-4">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">المبادلات</h1>
        <p className="mt-1 text-sm text-muted-foreground">{exchanges.length} مبادلة</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : exchanges.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد مبادلات</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {exchanges.map((ex) => (
            <Card key={ex.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{ex.profile?.name || 'مستخدم'}</p>
                    <span className={`text-[10px] ${statusColors[ex.status]}`}>{statusLabels[ex.status]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ex.network?.name} · {formatCurrency(ex.card?.value || 0)}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5" dir="ltr">
                    {ex.card?.code}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateTime(ex.created_at)}</p>
                  <p className="text-[10px] text-muted-foreground/50 font-mono" dir="ltr">{ex.reference}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
