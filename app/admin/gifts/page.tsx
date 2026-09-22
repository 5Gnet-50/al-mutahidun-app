'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase-client';
import { useAppToast } from '@/lib/use-app-toast';
import { formatCurrency, GIFT_VALUES } from '@/lib/helpers';
import type { Gift } from '@/lib/types';
import { Gift as GiftIcon, Plus, Edit3, Power } from 'lucide-react';

export default function AdminGiftsPage() {
  return <AdminShell><GiftsContent /></AdminShell>;
}

function GiftsContent() {
  const toast = useAppToast();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Gift | null>(null);
  const [form, setForm] = useState({ name: '', value: '500', price: '450', description: '', terms: '', is_active: true });

  async function fetchGifts() {
    const { data } = await supabase.from('gifts').select('*').order('sort_order', { ascending: true });
    setGifts((data as Gift[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchGifts(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', value: '500', price: '450', description: '', terms: '', is_active: true });
    setShowForm(true);
  };

  const openEdit = (gift: Gift) => {
    setEditing(gift);
    setForm({
      name: gift.name,
      value: gift.value.toString(),
      price: gift.price.toString(),
      description: gift.description || '',
      terms: gift.terms || '',
      is_active: gift.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('الرجاء إدخال اسم الهدية'); return; }
    const payload = {
      name: form.name.trim(),
      value: parseFloat(form.value) || 0,
      price: parseFloat(form.price) || 0,
      description: form.description.trim() || null,
      terms: form.terms.trim() || null,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('gifts').update(payload).eq('id', editing.id);
      if (error) { toast.error('حدث خطأ'); return; }
      toast.success('تم تحديث الهدية');
    } else {
      const { error } = await supabase.from('gifts').insert({ ...payload, sort_order: gifts.length + 1 });
      if (error) { toast.error('حدث خطأ'); return; }
      toast.success('تم إضافة الهدية');
    }
    setShowForm(false);
    fetchGifts();
  };

  const toggleActive = async (gift: Gift) => {
    const { error } = await supabase.from('gifts').update({ is_active: !gift.is_active }).eq('id', gift.id);
    if (error) { toast.error('حدث خطأ'); return; }
    toast.success(gift.is_active ? 'تم تعطيل الهدية' : 'تم تفعيل الهدية');
    fetchGifts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">الهدايا</h1>
          <p className="mt-1 text-sm text-muted-foreground">{gifts.length} هدية</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="ml-1 h-4 w-4" />
          إضافة
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : gifts.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <GiftIcon className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد هدايا</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {gifts.map((gift) => (
            <Card key={gift.id} className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/10 shrink-0">
                <GiftIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate">{gift.name}</p>
                  {!gift.is_active && <Badge variant="secondary" className="text-[10px]">معطلة</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  القيمة: {formatCurrency(gift.value)} · السعر: {formatCurrency(gift.price)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(gift)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(gift)}>
                  <Power className={`h-4 w-4 ${gift.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الهدية' : 'إضافة هدية'}</DialogTitle>
            <DialogDescription>{editing ? editing.name : 'أدخل بيانات الهدية الجديدة'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>اسم الهدية</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="مثال: هدية فضية" className="bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>القيمة (ريال)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({...form, value: e.target.value})} className="bg-secondary/50" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>السعر (ريال)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="bg-secondary/50" dir="ltr" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="وصف الهدية" className="bg-secondary/50 min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label>الشروط</Label>
              <Textarea value={form.terms} onChange={(e) => setForm({...form, terms: e.target.value})} placeholder="شروط الاستخدام" className="bg-secondary/50 min-h-[60px]" />
            </div>
            <div className="flex items-center justify-between">
              <Label>الهدية مفعّلة</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({...form, is_active: v})} />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleSubmit} className="w-full">{editing ? 'حفظ' : 'إضافة'}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="w-full">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
