'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/helpers';
import type { Gift } from '@/lib/types';
import { Gift as GiftIcon, Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function GiftsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <GiftsContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function GiftsContent() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchGifts() {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        setGifts(data as Gift[]);
      }
      setLoading(false);
    }
    fetchGifts();
  }, []);

  const filtered = gifts.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.value.toString().includes(search)
  );

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">الهدايا</h1>
        <p className="mt-1 text-sm text-muted-foreground">اختر الهدية المناسبة لك</p>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ابحث عن هدية..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <GiftIcon className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد هدايا متاحة</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((gift, idx) => (
            <Link
              key={gift.id}
              href={`/gifts/${gift.id}`}
              className="animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <Card className="card-hover relative flex flex-col overflow-hidden p-0">
                {/* Gift visual */}
                <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-primary/15 to-accent/10">
                  <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                  <GiftIcon className="h-10 w-10 text-primary" />
                  {gift.sort_order <= 2 && (
                    <Badge className="absolute right-2 top-2 bg-accent/20 text-accent border-accent/30 text-[10px]">
                      <Sparkles className="ml-1 h-2.5 w-2.5" />
                      مميز
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-bold truncate">{gift.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-accent">{formatCurrency(gift.value)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">السعر: {formatCurrency(gift.price)}</span>
                  </div>
                  <Button size="sm" className="mt-3 w-full text-xs">شراء</Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
