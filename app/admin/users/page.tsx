'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/shared/admin-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase-client';
import { useAppToast } from '@/lib/use-app-toast';
import { formatCurrency, formatDate, ROLE_LABELS } from '@/lib/helpers';
import type { Profile } from '@/lib/types';
import { Search, Users, MoreVertical, Ban, CheckCircle, Edit3, UserPlus } from 'lucide-react';

export default function AdminUsersPage() {
  return <AdminShell><UsersContent /></AdminShell>;
}

function UsersContent() {
  const toast = useAppToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('0');

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  const handleToggleStatus = async (user: Profile) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', user.id);
    if (error) { toast.error('حدث خطأ'); return; }
    toast.success(newStatus === 'active' ? 'تم تفعيل المستخدم' : 'تم إيقاف المستخدم');
    fetchUsers();
  };

  const handleEditSubmit = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        name: editName.trim(),
        balance: parseFloat(editBalance) || 0,
      })
      .eq('id', selected.id);
    if (error) { toast.error('حدث خطأ'); return; }
    toast.success('تم تحديث المستخدم');
    setShowEdit(false);
    fetchUsers();
  };

  const openEdit = (user: Profile) => {
    setSelected(user);
    setEditName(user.name);
    setEditBalance(user.balance.toString());
    setShowEdit(true);
  };

  return (
    <div className="space-y-4">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">المستخدمون</h1>
        <p className="mt-1 text-sm text-muted-foreground">{users.length} مستخدم</p>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="ابحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا يوجد مستخدمون</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.user;
            return (
              <Card key={user.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{user.name}</p>
                    <Badge variant="secondary" className={roleInfo.color}>{roleInfo.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">@{user.username} · {user.phone}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {formatCurrency(user.balance)} · {formatDate(user.created_at)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => openEdit(user)} className="cursor-pointer">
                      <Edit3 className="ml-2 h-4 w-4" /> تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleStatus(user)}
                      className={`cursor-pointer ${user.status === 'active' ? 'text-destructive' : 'text-success'}`}
                    >
                      {user.status === 'active' ? <><Ban className="ml-2 h-4 w-4" /> إيقاف</> : <><CheckCircle className="ml-2 h-4 w-4" /> تفعيل</>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {user.status === 'suspended' && <Badge variant="destructive" className="text-[10px]">موقوف</Badge>}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
            <DialogDescription>{selected?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">الاسم</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">الرصيد</label>
              <Input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} className="bg-secondary/50" dir="ltr" />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleEditSubmit} className="w-full">حفظ التغييرات</Button>
            <Button variant="outline" onClick={() => setShowEdit(false)} className="w-full">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
