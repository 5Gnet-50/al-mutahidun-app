'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase-client';
import { formatDateTime } from '@/lib/helpers';
import { useAppToast } from '@/lib/use-app-toast';
import type { Notification } from '@/lib/types';
import { Bell, CheckCheck, Gift, CreditCard, AlertCircle, Info, Wallet } from 'lucide-react';

const NOTIF_ICONS: Record<string, typeof Bell> = {
  payment: Wallet,
  gift: Gift,
  exchange: CreditCard,
  card: CreditCard,
  system: Info,
  issue: AlertCircle,
};

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <NotificationsContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const { profile } = useAuth();
  const toast = useAppToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    if (error) {
      toast.error('حدث خطأ');
      return;
    }
    toast.success('تم تعليم الكل كمقروء');
    fetchNotifications();
  };

  const handleMarkRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    fetchNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'كل الإشعارات مقروءة'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="ml-1.5 h-4 w-4" />
            تعليم الكل
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, idx) => {
            const Icon = NOTIF_ICONS[notif.type] || Bell;
            return (
              <Card
                key={notif.id}
                className={`flex items-start gap-3 p-4 cursor-pointer transition animate-slide-up ${
                  !notif.is_read ? 'border-primary/30 bg-primary/5' : ''
                }`}
                style={{ animationDelay: `${idx * 30}ms` }}
                onClick={() => !notif.is_read && handleMarkRead(notif.id)}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  !notif.is_read ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold truncate">{notif.title}</h3>
                    {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{formatDateTime(notif.created_at)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
