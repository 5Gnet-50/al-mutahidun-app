'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Radio, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAppToast } from '@/lib/use-app-toast';

export default function ForgotPasswordPage() {
  const toast = useAppToast();
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('الرجاء إدخال رقم الهاتف');
      return;
    }
    setLoading(true);
    // Simulated OTP send
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
    toast.success('تم إرسال رمز التحقق إلى رقمك');
  };

  return (
    <div className="min-h-screen bg-background bg-hero-glow flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <div className="text-center mb-8 animate-fade-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Radio className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">نسيت كلمة المرور</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            أدخل رقم هاتفك لإرسال رمز التحقق
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="أدخل رقم هاتفك"
                className="bg-secondary/50 border-border"
                dir="ltr"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              إرسال رمز التحقق
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="animate-scale-in rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
            <p className="font-bold">تم إرسال رمز التحقق</p>
            <p className="mt-1 text-sm text-muted-foreground">
              سيصلك رمز التحقق على رقمك قريباً. ميزة استعادة كلمة المرور ستكون متاحة في المرحلة الثانية.
            </p>
            <Link href="/login" className="mt-4 block">
              <Button variant="outline" className="w-full">العودة لتسجيل الدخول</Button>
            </Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
