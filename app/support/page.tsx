'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import { useAppToast } from '@/lib/use-app-toast';
import { generateTrackingNumber, formatDateTime } from '@/lib/helpers';
import type { SupportTicket } from '@/lib/types';
import { LifeBuoy, Plus, Ticket, Loader2, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'مفتوح', color: 'text-warning' },
  in_progress: { label: 'قيد المعالجة', color: 'text-primary' },
  closed: { label: 'مغلق', color: 'text-muted-foreground' },
};

export default function SupportPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <SupportContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function SupportContent() {
  const { profile } = useAuth();
  const toast = useAppToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setTickets((data as SupportTicket[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSubmit = async () => {
    if (!profile || !subject.trim() || !message.trim()) {
      toast.error('الرجاء ملء جميع الحقول');
      return;
    }
    setSubmitting(true);
    const trackingNumber = generateTrackingNumber();
    const { error } = await supabase.from('support_tickets').insert({
      user_id: profile.id,
      subject: subject.trim(),
      message: message.trim(),
      tracking_number: trackingNumber,
      status: 'open',
    });
    setSubmitting(false);
    if (error) {
      toast.error('حدث خطأ أثناء إرسال الطلب');
      return;
    }
    toast.success('تم إرسال طلبك بنجاح');
    setSubject('');
    setMessage('');
    setShowForm(false);
    fetchTickets();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">الدعم الفني</h1>
          <p className="mt-1 text-sm text-muted-foreground">أرسل طلبك وتابع حالته</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="ml-1 h-4 w-4" />
          طلب جديد
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <LifeBuoy className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات دعم</p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            إرسال طلب جديد
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket, idx) => {
            const statusInfo = TICKET_STATUS[ticket.status] || TICKET_STATUS.open;
            return (
              <Card
                key={ticket.id}
                className="p-4 animate-slide-up"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{ticket.subject}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ticket.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono" dir="ltr">
                        {ticket.tracking_number}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">{formatDateTime(ticket.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={statusInfo.color}>{statusInfo.label}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!submitting) setShowForm(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>طلب دعم جديد</DialogTitle>
            <DialogDescription>سنتواصل معك في أقرب وقت ممكن</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">الموضوع</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="اكتب موضوع الطلب"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">الرسالة</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب تفاصيل المشكلة"
                className="bg-secondary/50 min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                'إرسال الطلب'
              )}
            </Button>
            {!submitting && (
              <Button variant="outline" onClick={() => setShowForm(false)} className="w-full">
                إلغاء
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
