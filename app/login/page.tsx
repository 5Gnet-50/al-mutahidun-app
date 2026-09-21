'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Radio, Loader2, ArrowRight } from 'lucide-react';
import { useAppToast } from '@/lib/use-app-toast';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const toast = useAppToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('الرجاء ملء جميع الحقول');
      return;
    }
    setLoading(true);
    const { error } = await signIn(identifier, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('تم تسجيل الدخول بنجاح');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background bg-hero-glow flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <div className="text-center mb-8 animate-fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary glow-primary">
            <Radio className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">أهلاً بك في المتحدون</h1>
          <p className="mt-2 text-sm text-muted-foreground">سجّل دخولك للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
          <div className="space-y-2">
            <Label htmlFor="identifier">رقم الهاتف أو اسم المستخدم</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="أدخل رقم الهاتف أو اسم المستخدم"
              autoComplete="username"
              className="bg-secondary/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              className="bg-secondary/50 border-border"
            />
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>

          <Button type="submit" size="lg" className="w-full glow-primary" disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                تسجيل الدخول
                <ArrowRight className="mr-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">ليس لديك حساب؟ </span>
          <Link href="/register" className="text-primary hover:underline font-medium">
            إنشاء حساب
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
