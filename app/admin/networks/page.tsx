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
import type { Network } from '@/lib/types';
import { Wifi, Plus, Edit3, Power } from 'lucide-react';

export default function AdminNetworksPage() {
  return <AdminShell><NetworksContent /></AdminShell>;
}

function NetworksContent() {
  const toast = useAppToast();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Network | null>(null);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });

  async function fetchNetworks() {
    const { data } = await supabase.from('networks').select('*').order('name');
    setNetworks((data as Network[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchNetworks(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', is_active: true }); setShowForm(true); };
  const openEdit = (net: Network) => { setEditing(net); setForm({ name: net.name, description: net.description || '', is_active: net.is_active }); setShowForm(true); };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('الرجاء إدخال اسم الشبكة'); return; }
    const payload = { name: form.name.trim(), description: form.description.trim() || null, is_active: form.is_active };
    if (editing) {
      const { error } = await supabase.from('networks').update(payload).eq('id', editing.id);
      if (error) { toast.error('حدث خطأ'); return; }
      toast.success('تم تحديث الشبكة');
    } else {
      const { error } = await supabase.from('networks').insert(payload);
      if (error) { toast.error('حدث خطأ'); return; }
      toast.success('تم إضافة الشبكة');
    }
    setShowForm(false);
    fetchNetworks();
  };

  const toggleActive = async (net: Network) => {
    const { error } = await supabase.from('networks').update({ is_active: !net.is_active }).eq('id', net.id);
    if (error) { toast.error('حدث خطأ'); return; }
    toast.success(net.is_active ? 'تم تعطيل الشبكة' : 'تم تفعيل الشبكة');
    fetchNetworks();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">الشبكات</h1>
          <p className="mt-1 text-sm text-muted-foreground">{networks.length} شبكة</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="ml-1 h-4 w-4" />
          إضافة
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {networks.map((net) => (
            <Card key={net.id} className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Wifi className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate">{net.name}</p>
                  {!net.is_active && <Badge variant="secondary" className="text-[10px]">معطلة</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{net.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(net)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(net)}>
                  <Power className={`h-4 w-4 ${net.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل شبكة' : 'إضافة شبكة'}</DialogTitle>
            <DialogDescription>أدخل بيانات الشبكة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>اسم الشبكة</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="مثال: 5G-NET" className="bg-secondary/50" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="وصف الشبكة" className="bg-secondary/50 min-h-[60px]" />
            </div>
            <div className="flex items-center justify-between">
              <Label>الشبكة مفعّلة</Label>
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
