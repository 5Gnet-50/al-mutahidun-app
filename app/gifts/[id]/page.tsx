'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency, PAYMENT_METHODS } from '@/lib/helpers';
import { useAppToast } from '@/lib/use-app-toast';
import type { Gift } from '@/lib/types';
import {
  Gift as GiftIcon,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Building2,
  Shield,
  Clock,
} from 'lucide-react';

export default function GiftDetailPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <GiftDetailContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function GiftDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useAppToast();
  const [gift, setGift] = useState<Gift | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    async function fetchGift() {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) {
        setGift(data as Gift);
      }
      setLoading(false);
    }
    if (id) fetchGift();
  }, [id]);

  const handleBuyClick = () => {
    if (!gift) return;
    idempotencyKey.current = `buy-${gift.id}-${Date.now()}`;
    setShowPayment(true);
  };

  const handleConfirmPayment = async () => {
    if (!gift || !selectedMethod || !user || !idempotencyKey.current) return;
    setProcessing(true);

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-payment`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          giftId: gift.id,
          method: selectedMethod,
          idempotencyKey: idempotencyKey.current,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'فشلت عملية الدفع');
        setProcessing(false);
        return;
      }

      setShowPayment(false);
      setProcessing(false);
      toast.success('تمت عملية الدفع بنجاح');
      router.push('/payment/success');
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!gift) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <GiftIcon className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">الهدية غير موجودة</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/gifts')}>
          العودة للهدايا
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push('/gifts')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowRight className="h-4 w-4" />
        العودة للهدايا
      </button>

      {/* Gift Hero */}
      <Card className="relative overflow-hidden border-primary/20 p-0 animate-scale-in">
        <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-primary/20 via-card to-accent/10">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(var(--primary)) 1px, transparent 1px), radial-gradient(circle at 75% 75%, hsl(var(--accent)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
          <div className="relative flex flex-col items-center gap-2">
            <GiftIcon className="h-16 w-16 text-primary" />
            <Badge className="bg-primary/15 text-primary border-primary/30">هدية رقمية</Badge>
          </div>
        </div>
        <div className="p-5">
          <h1 className="text-xl font-bold">{gift.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{gift.description}</p>
        </div>
      </Card>

      {/* Value & Price */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">قيمة الهدية</p>
          <p className="mt-1 text-2xl font-bold text-accent">{formatCurrency(gift.value)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">سعر الشراء</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatCurrency(gift.price)}</p>
        </Card>
      </div>

      {/* Terms */}
      {gift.terms && (
        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Shield className="h-4 w-4 text-primary" />
            الشروط والأحكام
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{gift.terms}</p>
        </Card>
      )}

      {/* Buy Button */}
      <Button
        size="lg"
        className="w-full glow-primary text-base"
        onClick={handleBuyClick}
      >
        <GiftIcon className="ml-2 h-5 w-5" />
        شراء الهدية
      </Button>

      {/* Payment Modal */}
      <Dialog open={showPayment} onOpenChange={(open) => {
        if (!processing) setShowPayment(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>اختر طريقة الدفع</DialogTitle>
            <DialogDescription>
              ادفع {formatCurrency(gift.price)} لشراء {gift.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                disabled={processing}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition ${
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40 hover:bg-secondary/50'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${method.color} text-lg`}>
                  {method.icon}
                </div>
                <span className="flex-1 text-sm font-medium">{method.name}</span>
                {selectedMethod === method.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-success shrink-0" />
            <span>عملية الدفع آمنة ومشفرة. سيتم إصدار الهدية بعد تأكيد الدفع.</span>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleConfirmPayment}
              disabled={!selectedMethod || processing}
              size="lg"
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري معالجة الدفع...
                </>
              ) : (
                <>
                  تأكيد الدفع - {formatCurrency(gift.price)}
                </>
              )}
            </Button>
            {!processing && (
              <Button variant="outline" onClick={() => setShowPayment(false)} className="w-full">
                إلغاء
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
