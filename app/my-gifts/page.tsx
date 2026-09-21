'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency, formatDate, GIFT_STATUS_LABELS } from '@/lib/helpers';
import type { UserGift } from '@/lib/types';
import { Gift as GiftIcon, ArrowLeft, Wallet } from 'lucide-react';

export default function MyGiftsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <MyGiftsContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function MyGiftsContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const [gifts, setGifts] = useState<UserGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('available');

  useEffect(() => {
    async function fetchGifts() {
      if (!profile) return;
      const { data, error } = await supabase
        .from('user_gifts')
        .select(`
          *,
          gift:gifts(*)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setGifts(data as unknown as UserGift[]);
      }
      setLoading(false);
    }
    fetchGifts();
  }, [profile]);

  const filtered = gifts.filter((g) => g.status === tab);

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">هداياي</h1>
        <p className="mt-1 text-sm text-muted-foreground">إدارة هداياك ومبادلتها</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="text-xs">متاحة</TabsTrigger>
          <TabsTrigger value="used" className="text-xs">مستخدمة</TabsTrigger>
          <TabsTrigger value="expired" className="text-xs">منتهية</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {tab === 'available' && 'لا توجد هدايا متاحة للمبادلة'}
            {tab === 'used' && 'لا توجد هدايا مستخدمة'}
            {tab === 'expired' && 'لا توجد هدايا منتهية'}
          </p>
          {tab === 'available' && (
            <Button size="sm" variant="outline" onClick={() => router.push('/gifts')}>
              تصفح الهدايا
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ug, idx) => {
            const statusInfo = GIFT_STATUS_LABELS[ug.status] || GIFT_STATUS_LABELS.available;
            const gift = ug.gift;
            return (
              <Card
                key={ug.id}
                className="card-hover flex items-center gap-4 p-4 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10">
                  <GiftIcon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{gift?.name || 'هدية'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    القيمة: {formatCurrency(gift?.value || 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(ug.created_at)}
                  </p>
                </div>
                {ug.status === 'available' ? (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/exchange?giftId=${ug.id}`)}
                  >
                    مبادلة
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Badge variant="secondary" className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
