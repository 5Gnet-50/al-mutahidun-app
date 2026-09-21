'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Gift, ArrowLeft, Home } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <PaymentSuccessContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function PaymentSuccessContent() {
  const { profile } = useAuth();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-scale-in">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-success/15 animate-pulse-glow">
        <CheckCircle2 className="h-14 w-14 text-success" />
      </div>
      <h1 className="text-2xl font-bold">تمت عملية الدفع بنجاح</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        تم إضافة الهدية إلى حسابك. يمكنك الآن مبادلتها مع بطاقة شبكة.
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link href="/my-gifts">
          <Button size="lg" className="w-full glow-primary">
            <Gift className="ml-2 h-5 w-5" />
            مبادلة الهدية
          </Button>
        </Link>
        <Link href="/gifts">
          <Button variant="outline" size="lg" className="w-full">
            تصفح هدايا أخرى
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" size="lg" className="w-full">
            <Home className="ml-2 h-4 w-4" />
            الصفحة الرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
