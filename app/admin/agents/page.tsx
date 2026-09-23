'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useAppToast } from '@/lib/use-app-toast';
import { formatCurrency, formatDate } from '@/lib/helpers';
import type { AgentProfile, Profile } from '@/lib/types';
import { UserCog, Plus, CheckCircle, Ban } from 'lucide-react';

export default function AdminAgentsPage() {
  return <AdminShell><AgentsContent role="agent" /></AdminShell>;
}

function AgentsContent({ role }: { role: 'agent' | 'marketer' }) {
  const toast = useAppToast();
  const { profile } = useAuth();
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [commission, setCommission] = useState('5');

  async function fetchAgents() {
    const { data } = await supabase
      .from('agents')
      .select('*, profile:profiles!agents_user_id_fkey(*)')
      .order('created_at', { ascending: false });
    setAgents((data as unknown as AgentProfile[]) || []);
    setLoading(false);
  }

  async function fetchCandidates() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'user')
      .eq('status', 'active')
      .limit(50);
    setCandidates((data as Profile[]) || []);
  }

  useEffect(() => { fetchAgents(); }, []);

  const openAdd = () => { fetchCandidates(); setSelectedUser(''); setCommission('5'); setShowAdd(true); };

  const handleAdd = async () => {
    if (!selectedUser) { toast.error('اختر مستخدماً'); return; }
    const { error: agentError } = await supabase.from('agents').insert({
      user_id: selectedUser,
      commission_rate: parseFloat(commission) || 0,
      status: 'active',
    });
    if (agentError) { toast.error('حدث خطأ'); return; }
    if (profile) {
      await supabase.rpc('admin_update_profile', {
        p_target_user_id: selectedUser,
        p_admin_id: profile.id,
        p_name: null,
        p_balance: null,
        p_status: null,
        p_role: role,
      });
    }
    toast.success(role === 'agent' ? 'تم إضافة وكيل' : 'تم إضافة مسوق');
    setShowAdd(false);
    fetchAgents();
  };

  const toggleStatus = async (agent: AgentProfile) => {
    const newStatus = agent.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('agents').update({ status: newStatus }).eq('id', agent.id);
    if (error) { toast.error('حدث خطأ'); return; }
    toast.success(newStatus === 'active' ? 'تم التفعيل' : 'تم الإيقاف');
    fetchAgents();
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: 'نشط', color: 'text-success' },
    pending: { label: 'قيد الانتظار', color: 'text-warning' },
    suspended: { label: 'موقوف', color: 'text-destructive' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">{role === 'agent' ? 'الوكلاء' : 'المسوقون'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{agents.length} {role === 'agent' ? 'وكيل' : 'مسوق'}</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="ml-1 h-4 w-4" />
          إضافة
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : agents.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <UserCog className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا يوجد {role === 'agent' ? 'وكلاء' : 'مسوقون'}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => {
            const st = statusLabels[agent.status] || statusLabels.pending;
            return (
              <Card key={agent.id} className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
                  <UserCog className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{agent.profile?.name || 'مستخدم'}</p>
                    <span className={`text-[10px] ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    العمولة: {agent.commission_rate}% · المبيعات: {formatCurrency(agent.total_sales)}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">{formatDate(agent.created_at)}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => toggleStatus(agent)}>
                  {agent.status === 'active' ? <Ban className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة {role === 'agent' ? 'وكيل' : 'مسوق'}</DialogTitle>
            <DialogDescription>اختر مستخدماً وحدد نسبة العمولة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>المستخدم</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="اختر مستخدماً" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>نسبة العمولة (%)</Label>
              <Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} className="bg-secondary/50" dir="ltr" />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleAdd} className="w-full">إضافة</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="w-full">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
