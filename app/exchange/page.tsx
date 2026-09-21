'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/helpers';
import { useAppToast } from '@/lib/use-app-toast';
import type { Network, UserGift } from '@/lib/types';
import {
  Wifi,
  ArrowRight,
  Loader2,
  Gift as GiftIcon,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

function ExchangeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const giftIdParam = searchParams.get('giftId');
  const { profile } = useAuth();
  const toast = useAppToast();

  const [networks, setNetworks] = useState<Network[]>([]);
  const [userGift, setUserGift] = useState<UserGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ cardCode: string; reference: string; giftName: string; cardValue: number } | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!profile || !giftIdParam) {
        setLoading(false);
        return;
      }

      const [netRes, giftRes] = await Promise.all([
        supabase.from('networks').select('*').eq('is_active', true).order('name'),
        supabase
          .from('user_gifts')
          .select(`*, gift:gifts(*)`)
          .eq('id', giftIdParam)
          .eq('user_id', profile.id)
          .maybeSingle(),
      ]);

      if (netRes.data) setNetworks(netRes.data as Network[]);
      if (giftRes.data) setUserGift(giftRes.data as unknown as UserGift);
      setLoading(false);
    }
    fetchData();
  }, [profile, giftIdParam]);

  const handleConfirmExchange = async () => {
    if (!userGift || !selectedNetwork || !profile) return;

    idempotencyKey.current = `exchange-${userGift.id}-${Date.now()}`;
    setProcessing(true);

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-exchange`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          userGiftId: userGift.id,
          networkId: selectedNetwork,
          idempotencyKey: idempotencyKey.current,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'فشلت عملية المبادلة');
        setProcessing(false);
        return;
      }

      setResult({
        cardCode: data.cardCode,
        reference: data.reference,
        giftName: data.giftName,
        cardValue: data.cardValue,
      });
      setProcessing(false);
      toast.success('تمت المبادلة بنجاح');
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم');
      setProcessing(false);
    }
  };

  // Success view
  if (result) {
    return (
      <div className="space-y-5 animate-scale-in">
        <div className="flex flex-col items-center text-center py-6">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/15 animate-pulse-glow">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <h1 className="text-xl font-bold">تمت المبادلة بنجاح</h1>
          <p className="mt-1 text-sm text-muted-foreground">تم تسليم بطاقة الشبكة لحسابك</p>
        </div>

        <Card className="overflow-hidden border-success/20 p-0">
          <div className="bg-gradient-to-br from-success/10 to-transparent p-4">
            <div className="flex items-center gap-2 text-success">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm font-bold">كود البطاقة</span>
            </div>
            <p
              className="mt-3 text-2xl font-bold tracking-wider text-foreground text-center py-2 rounded-lg bg-secondary/30 select-all"
              dir="ltr"
            >
              {result.cardCode}
            </p>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between p-3">
              <span className="text-sm text-muted-foreground">الشبكة</span>
              <span className="text-sm font-medium">
                {networks.find((n) => n.id === selectedNetwork)?.name}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-sm text-muted-foreground">القيمة</span>
              <span className="text-sm font-bold text-accent">{formatCurrency(result.cardValue)}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-sm text-muted-foreground">المرجع</span>
              <span className="text-sm font-mono" dir="ltr">{result.reference}</span>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push('/transactions')} className="w-full">
            عرض العمليات
          </Button>
          <Button variant="outline" onClick={() => router.push('/my-gifts')} className="w-full">
            هداياي الأخرى
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!userGift || userGift.status !== 'available') {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">الهدية غير متاحة للمبادلة</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/my-gifts')}>
          العودة لهداياي
        </Button>
      </Card>
    );
  }

  const gift = userGift.gift;

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push('/my-gifts')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowRight className="h-4 w-4" />
        العودة لهداياي
      </button>

      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">مبادلة الهدية</h1>
        <p className="mt-1 text-sm text-muted-foreground">اختر الشبكة لاستلام بطاقتك</p>
      </div>

      {/* Gift Summary */}
      <Card className="flex items-center gap-4 border-primary/20 p-4 animate-slide-up">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10">
          <GiftIcon className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">{gift?.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            قيمة المبادلة: {formatCurrency(gift?.value || 0)}
          </p>
        </div>
        <Badge className="bg-success/15 text-success border-success/30">متاحة</Badge>
      </Card>

      {/* Network Selection */}
      <div>
        <h2 className="mb-3 text-sm font-bold">اختر الشبكة</h2>
        <div className="space-y-2">
          {networks.map((net) => (
            <button
              key={net.id}
              onClick={() => setSelectedNetwork(net.id)}
              disabled={processing}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-right transition ${
                selectedNetwork === net.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-secondary/50'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wifi className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">{net.name}</h3>
                <p className="text-xs text-muted-foreground">{net.description}</p>
              </div>
              {selectedNetwork === net.id && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Card value info */}
      <Card className="flex items-center gap-3 bg-secondary/30 p-4">
        <CreditCard className="h-5 w-5 text-accent shrink-0" />
        <p className="text-xs text-muted-foreground">
          سيتم تسليمك بطاقة بقيمة {formatCurrency(gift?.value || 0)} من الشبكة المختارة
        </p>
      </Card>

      <Button
        size="lg"
        className="w-full glow-primary"
        disabled={!selectedNetwork || processing}
        onClick={handleConfirmExchange}
      >
        {processing ? (
          <>
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            جاري معالجة المبادلة...
          </>
        ) : (
          <>
            <CreditCard className="ml-2 h-5 w-5" />
            تأكيد المبادلة
          </>
        )}
      </Button>
    </div>
  );
}

export default function ExchangePage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
          <ExchangeContent />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}
