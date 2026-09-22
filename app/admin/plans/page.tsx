'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase-client';
import { useAppToast } from '@/lib/use-app-toast';
import { formatCurrency } from '@/lib/helpers';
import type { Plan, Network } from '@/lib/types';
import { Radio, Plus, Edit3, Power } from 'lucide-react';

export default function AdminPlansPage() {
  return <AdminShell><PlansContent /></AdminShell>;
}

function PlansContent() {
  const toast = useAppToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ network_id: '', name: '', value: '200', duration_hours: '24', speed_mbps: '20', description: '', is_active: true });

  async function fetchPlans() {
    const [planRes, netRes] = await Promise.all([
      supabase.from('plans').select('*, network:networks(*)').order('sort_order', { ascending: true }),
      supabase.from('networks').select('*').order('name'),
    ]);
    setPlans((planRes.data as unknown as Plan[]) || []);
    setNetworks((netRes.data as Network[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchPlans(); }, []);

  const openAdd = () => { setEditing(null); setForm({ network_id: networks[0]?.id || '', name: '', value: '200', duration_hours: '24', speed_mbps: '20', description: '', is_active: true }); setShowForm(true); };
  const openEdit = (plan: Plan) => { setEditing(plan); setForm({ network_id: plan.network_id, name: plan.name, value: plan.value.toString(), duration_hours: plan.duration_hours.toString(), speed_mbps: plan.speed_mbps?.toString() || '', description: plan.description || '', is_active: plan.is_active }); setShowForm(true); };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.network_id) { toast.error('الرجاء ملء الحقول المطلوبة'); return; }
    const payload = {
      network_id: form.network_id,
      name: form.name.trim(),
      value: parseFloat(form.value) || 0,
      duration_hours: parseInt(form.duration_hours) || 24,
      speed_mbps: form.speed_mbps ? parseInt(form.speed_mbps) : null,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from('plans').update(payload).eq('id', editing.id);
      if (error) { toast.error('حدث خطأ'); return; }
      toast.success('تم تحديث الباقة');
    } else {
      const { error } = await supabase.from('plans').insert({ ...payload, sort_order: plans.length + 1 });
      if (error) { toast.error('حدث خطأ'); return; }
      toast.success('تم إضافة الباقة');
    }
    setShowForm(false);
    fetchPlans();
  };

  const toggleActive = async (plan: Plan) => {
    const { error } = await supabase.from('plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
    if (error) { toast.error('حدث خطأ'); return; }
    toast.success(plan.is_active ? 'تم تعطيل الباقة' : 'تم تفعيل الباقة');
    fetchPlans();
  };

  const netName = (id: string) => networks.find((n) => n.id === id)?.name || '';
  const durLabel = (hours: number) => {
    if (hours >= 720) return 'شهر';
    if (hours >= 168) return 'أسبوع';
    if (hours >= 24) return 'يوم';
    return `${hours} ساعة`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">الباقات</h1>
          <p className="mt-1 text-sm text-muted-foreground">{plans.length} باقة</p>
        </div>
        <Button size="sm" onClick={openAdd} disabled={networks.length === 0}>
          <Plus className="ml-1 h-4 w-4" />
          إضافة
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : plans.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Radio className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد باقات</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Radio className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate">{plan.name}</p>
                  {!plan.is_active && <Badge variant="secondary" className="text-[10px]">معطلة</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {netName(plan.network_id)} · {durLabel(plan.duration_hours)} · {formatCurrency(plan.value)}
                </p>
                {plan.speed_mbps && <p className="text-[10px] text-muted-foreground/70">{plan.speed_mbps} ميجا/ث</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(plan)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(plan)}>
                  <Power className={`h-4 w-4 ${plan.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل باقة' : 'إضافة باقة'}</DialogTitle>
            <DialogDescription>أدخل بيانات الباقة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الشبكة</Label>
              <Select value={form.network_id} onValueChange={(v) => setForm({...form, network_id: v})}>
                <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="اختر الشبكة" /></SelectTrigger>
                <SelectContent>
                  {networks.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>اسم الباقة</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="مثال: باقة شهر" className="bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>القيمة (ريال)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({...form, value: e.target.value})} className="bg-secondary/50" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>المدة (ساعات)</Label>
                <Input type="number" value={form.duration_hours} onChange={(e) => setForm({...form, duration_hours: e.target.value})} className="bg-secondary/50" dir="ltr" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>السرعة (ميجا/ث) - اختياري</Label>
              <Input type="number" value={form.speed_mbps} onChange={(e) => setForm({...form, speed_mbps: e.target.value})} className="bg-secondary/50" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="وصف الباقة" className="bg-secondary/50" />
            </div>
            <div className="flex items-center justify-between">
              <Label>الباقة مفعّلة</Label>
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
