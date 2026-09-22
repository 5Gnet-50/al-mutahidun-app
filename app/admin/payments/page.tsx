'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from '@/lib/helpers';
import type { Payment, Profile } from '@/lib/types';
import { Wallet, Filter } from 'lucide-react';

export default function AdminPaymentsPage() {
  return <AdminShell><PaymentsContent /></AdminShell>;
}

function PaymentsContent() {
  const [payments, setPayments] = useState<(Payment & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchPayments() {
      const { data } = await supabase
        .from('payments')
        .select('*, profile:profiles!payments_user_id_fkey(name, username, phone)')
        .order('created_at', { ascending: false })
        .limit(100);
      setPayments((data as unknown as (Payment & { profile?: Profile })[]) || []);
      setLoading(false);
    }
    fetchPayments();
  }, []);

  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);
  const totalRevenue = payments.filter((p) => p.status === 'success').reduce((sum, p) => sum + Number(p.amount), 0);

  const statusColors: Record<string, string> = {
    success: 'text-success', failed: 'text-destructive', pending: 'text-warning',
  };
  const statusLabels: Record<string, string> = {
    success: 'ناجح', failed: 'فاشل', pending: 'قيد المعالجة',
  };

  return (
    <div className="space-y-4">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">المدفوعات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          الإجمالي: {formatCurrency(totalRevenue)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="success">ناجح</SelectItem>
            <SelectItem value="pending">قيد المعالجة</SelectItem>
            <SelectItem value="failed">فاشل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Wallet className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد مدفوعات</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((payment) => (
            <Card key={payment.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{payment.profile?.name || 'مستخدم'}</p>
                    <span className={`text-[10px] ${statusColors[payment.status]}`}>{statusLabels[payment.status]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {PAYMENT_METHOD_LABELS[payment.method] || payment.method}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateTime(payment.created_at)}</p>
                  <p className="text-[10px] text-muted-foreground/50 font-mono" dir="ltr">{payment.reference}</p>
                </div>
                <p className={`text-sm font-bold ${statusColors[payment.status]}`}>{formatCurrency(payment.amount)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
