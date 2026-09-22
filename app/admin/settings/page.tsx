'use client';

import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, Globe, Bell, Shield, Database } from 'lucide-react';

export default function AdminSettingsPage() {
  return <AdminShell><SettingsContent /></AdminShell>;
}

function SettingsContent() {
  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">إعدادات النظام</p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">اللغة والمنطقة</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">اللغة</Label>
            <span className="text-xs text-muted-foreground">العربية</span>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">العملة</Label>
            <span className="text-xs text-muted-foreground">ريال يمني</span>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">الاتجاه</Label>
            <span className="text-xs text-muted-foreground">RTL</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">الإشعارات</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">إشعارات الدفع</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">إشعارات المبادلة</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">إشعارات المستخدمين الجدد</Label>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">الأمان</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">التحقق بخطوتين (OTP)</Label>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">منع العمليات المكررة</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">تسجيل العمليات</Label>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">معلومات النظام</h2>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>الإصدار</span>
            <span>1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span>قاعدة البيانات</span>
            <span>Supabase</span>
          </div>
          <div className="flex items-center justify-between">
            <span>الشبكات</span>
            <span>3</span>
          </div>
        </div>
      </Card>

      <Separator />
      <p className="text-center text-xs text-muted-foreground">المتحدون © 2026</p>
    </div>
  );
}
