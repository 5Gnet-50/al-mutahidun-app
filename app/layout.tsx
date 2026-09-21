import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/shared/providers';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'المتحدون | Al-Mutahidun',
  description: 'مساحة رقمية تجمعنا - هدايا رقمية وبطاقات شبكات',
  openGraph: {
    title: 'المتحدون | Al-Mutahidun',
    description: 'معاً نصنع الفرق - هدايا رقمية وبطاقات شبكات',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0b1a2b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body className="font-cairo bg-background text-foreground min-h-screen antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
