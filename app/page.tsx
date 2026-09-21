'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Radio, Zap, Gift, Lock, Wifi, ArrowLeft, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background bg-hero-glow">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Radio className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">المتحدون</span>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
              تسجيل الدخول
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-md px-4 pt-12 pb-8 text-center">
        <div className="animate-fade-in">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary ring-1 ring-primary/20">
            <Zap className="h-4 w-4" />
            <span>مساحة رقمية تجمعنا</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-gradient-blue">المتحدون</span>
          </h1>
          <p className="mt-3 text-xl font-medium text-accent">معاً نصنع الفرق</p>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            منصة رقمية لشراء الهدايا الإلكترونية ومبادلتها مع بطاقات شبكات الإنترنت.
            تصفح، اشترِ، بادل، واستلم بطاقتك في دقائق.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/login">
              <Button size="lg" className="w-full glow-primary text-base">
                تسجيل الدخول
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="w-full border-border bg-transparent text-base hover:bg-secondary">
                إنشاء حساب
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-md px-4 py-8">
        <h2 className="mb-4 text-center text-xl font-bold">لماذا المتحدون؟</h2>
        <div className="space-y-3">
          {[
            { icon: Gift, title: 'هدايا متنوعة', desc: 'تشكيلة واسعة من الهدايا الرقمية لكل المناسبات', color: 'text-accent' },
            { icon: Zap, title: 'سرعة فائقة', desc: 'استلم بطاقتك فوراً بعد المبادلة دون انتظار', color: 'text-primary' },
            { icon: Lock, title: 'أمان تام', desc: 'حماية كاملة لبياناتك وعملياتك المالية', color: 'text-success' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="card-hover flex items-start gap-4 rounded-2xl border border-border/60 bg-card/50 p-4"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary ${f.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold">{f.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Networks */}
      <section className="mx-auto max-w-md px-4 py-8">
        <h2 className="mb-4 text-center text-xl font-bold">شبكاتنا الثلاث</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { name: '5G-NET', desc: 'شبكة الجيل الخامس عالية السرعة', icon: '📡', badge: 'الأسرع' },
            { name: 'al-alam-net', desc: 'شبكة العالم للإنترنت', icon: '🌐', badge: 'الأوسع' },
            { name: 'tawfeer-Net', desc: 'شبكة التوفير للإنترنت', icon: '📶', badge: 'الأوفر' },
          ].map((n) => (
            <div
              key={n.name}
              className="card-hover flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                {n.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{n.name}</h3>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                    {n.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.desc}</p>
              </div>
              <Wifi className="h-5 w-5 text-primary/50" />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-6 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-accent" />
          <h2 className="text-xl font-bold">ابدأ رحلتك الآن</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            انضم إلى المتحدون واحصل على أول اتصال لك
          </p>
          <Link href="/register" className="mt-4 block">
            <Button className="w-full" size="lg">
              إنشاء حساب جديد
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center">
        <p className="text-sm text-muted-foreground">© 2026 المتحدون</p>
      </footer>
    </div>
  );
}
