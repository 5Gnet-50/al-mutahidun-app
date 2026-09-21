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

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const toast = useAppToast();
  const [form, setForm] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.username || !form.phone || !form.password) {
      toast.error('الرجاء ملء جميع الحقول');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    if (form.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    const { error } = await signUp({
      name: form.name,
      username: form.username,
      phone: form.phone,
      password: form.password,
    });
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('تم إنشاء الحساب بنجاح');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background bg-hero-glow flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full py-8">
        <div className="text-center mb-6 animate-fade-in">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary glow-primary">
            <Radio className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">أهلاً بك في المتحدون</h1>
          <p className="mt-1 text-sm text-muted-foreground">أنشئ حسابك وابدأ أول اتصال لك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 animate-slide-up">
          <div className="space-y-1.5">
            <Label htmlFor="name">الاسم</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="أدخل اسمك الكامل"
              className="bg-secondary/50 border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">اسم المستخدم</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="اختر اسم مستخدم فريد"
              className="bg-secondary/50 border-border"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="أدخل رقم هاتفك"
              className="bg-secondary/50 border-border"
              autoComplete="tel"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="اختر كلمة مرور قوية"
              className="bg-secondary/50 border-border"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              className="bg-secondary/50 border-border"
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" size="lg" className="w-full glow-primary mt-2" disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                إنشاء حساب
                <ArrowRight className="mr-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">لديك حساب بالفعل؟ </span>
          <Link href="/login" className="text-primary hover:underline font-medium">
            تسجيل الدخول
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
