'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import {
  formatCurrency,
  formatDateTime,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/helpers';
import type { Transaction } from '@/lib/types';
import { ListChecks, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <TransactionsContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function TransactionsContent() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchTransactions() {
      if (!profile) return;
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
      setLoading(false);
    }
    fetchTransactions();
  }, [profile]);

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter((t) => t.status === filter);

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">سجل العمليات</h1>
        <p className="mt-1 text-sm text-muted-foreground">جميع عملياتك المالية</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="تصفية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="success">ناجحة</SelectItem>
            <SelectItem value="pending">قيد المعالجة</SelectItem>
            <SelectItem value="failed">فاشلة</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
            <SelectItem value="refunded">مستردة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <ListChecks className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد عمليات</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx, idx) => {
            const statusInfo = TRANSACTION_STATUS_LABELS[tx.status] || TRANSACTION_STATUS_LABELS.pending;
            return (
              <Card
                key={tx.id}
                className="p-3.5 animate-slide-up"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${statusInfo.dot}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">
                          {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                        </p>
                        <span className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{tx.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(tx.created_at)}</p>
                      <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5" dir="ltr">
                        {tx.reference}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${statusInfo.color}`}>
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
