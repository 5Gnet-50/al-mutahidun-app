'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import { useAppToast } from '@/lib/use-app-toast';
import { formatCurrency, formatDate } from '@/lib/helpers';
import {
  User,
  Lock,
  Bell,
  Globe,
  Shield,
  LogOut,
  Loader2,
  Mail,
  Phone,
  AtSign,
} from 'lucide-react';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ProfileContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const toast = useAppToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
    : '؟';

  const handleSaveName = async () => {
    if (!profile || !name.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', profile.id);
    setSavingName(false);
    if (error) {
      toast.error('حدث خطأ أثناء حفظ الاسم');
      return;
    }
    setEditingName(false);
    toast.success('تم تحديث الاسم');
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast.error('الرجاء ملء جميع الحقول');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error('حدث خطأ أثناء تغيير كلمة المرور');
      return;
    }
    setOldPassword('');
    setNewPassword('');
    toast.success('تم تغيير كلمة المرور');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!profile) return null;

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">الحساب الشخصي</h1>
      </div>

      {/* Profile Header */}
      <Card className="flex flex-col items-center gap-3 p-6 text-center border-primary/20 animate-slide-up">
        <Avatar className="h-20 w-20 border-2 border-primary/30">
          <AvatarFallback className="bg-primary/15 text-primary text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-bold">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-primary/15 text-primary border-primary/30">
            {profile.role === 'admin' ? 'إدارة' : profile.role === 'agent' ? 'وكيل' : 'مستخدم'}
          </Badge>
          <Badge className="bg-success/15 text-success border-success/30">
            {profile.status === 'active' ? 'نشط' : 'موقوف'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          الرصيد: {formatCurrency(profile.balance)}
        </p>
        <p className="text-xs text-muted-foreground/70">
          عضو منذ {formatDate(profile.created_at)}
        </p>
      </Card>

      {/* Editable Info */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            المعلومات الشخصية
          </h3>
          {!editingName && (
            <Button size="sm" variant="ghost" onClick={() => { setName(profile.name); setEditingName(true); }}>
              تعديل
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {editingName ? (
            <div className="space-y-2">
              <Label>الاسم</Label>
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary/50" />
                <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingName(false)}>إلغاء</Button>
              </div>
            </div>
          ) : (
            <InfoRow icon={User} label="الاسم" value={profile.name} />
          )}
          <InfoRow icon={AtSign} label="اسم المستخدم" value={profile.username} />
          <InfoRow icon={Phone} label="رقم الهاتف" value={profile.phone} dir="ltr" />
          {profile.email && <InfoRow icon={Mail} label="البريد" value={profile.email} dir="ltr" />}
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-4 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          تغيير كلمة المرور
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">كلمة المرور الحالية</Label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">كلمة المرور الجديدة</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-secondary/50"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword} className="w-full" size="sm">
            {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تغيير كلمة المرور'}
          </Button>
        </div>
      </Card>

      {/* Settings placeholders */}
      <Card className="p-4">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-primary" />
          الإعدادات
        </h3>
        <div className="space-y-1">
          <SettingRow icon={Bell} label="إعدادات الإشعارات" value="مفعّل" />
          <SettingRow icon={Globe} label="اللغة" value="العربية" />
          <SettingRow icon={Shield} label="الخصوصية" value="افتراضي" />
        </div>
      </Card>

      <Separator />

      <Button variant="destructive" onClick={handleSignOut} size="lg" className="w-full">
        <LogOut className="ml-2 h-5 w-5" />
        تسجيل الخروج
      </Button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, dir }: { icon: typeof User; label: string; value: string; dir?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-sm font-medium" dir={dir}>{value}</span>
    </div>
  );
}

function SettingRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}
