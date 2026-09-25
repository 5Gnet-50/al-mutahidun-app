'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';
import type { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: { name: string; username: string; phone: string; password: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PHONE_REGEX = /^7\d{8}$/;

function normalizePhone(input: string): string | null {
  let phone = input.trim();
  if (phone.startsWith('+967')) phone = phone.slice(4);
  else if (phone.startsWith('967')) phone = phone.slice(3);
  else if (phone.startsWith('0') && phone.length === 10) phone = phone.slice(1);
  phone = phone.replace(/\D/g, '');
  if (PHONE_REGEX.test(phone)) return phone;
  return null;
}

function isPhoneLike(input: string): boolean {
  const cleaned = input.trim().replace(/[\s\-+]/g, '');
  return /^\d+$/.test(cleaned) && cleaned.length >= 7;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    let email: string;

    if (isPhoneLike(identifier)) {
      const phone = normalizePhone(identifier);
      if (!phone) {
        return { error: 'رقم الهاتف غير صحيح. يجب أن يكون 9 أرقام تبدأ بـ 7' };
      }
      email = `${phone}@mutahidun.app`;
    } else {
      const { data: phoneResult, error: rpcError } = await supabase.rpc(
        'lookup_phone_by_username',
        { p_username: identifier.trim() }
      );
      if (rpcError || !phoneResult) {
        return { error: 'اسم المستخدم غير موجود' };
      }
      email = `${phoneResult}@mutahidun.app`;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: 'كلمة المرور غير صحيحة' };
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (data: { name: string; username: string; phone: string; password: string }) => {
    const phone = normalizePhone(data.phone);
    if (!phone) {
      return { error: 'رقم الهاتف غير صحيح. يجب أن يكون 9 أرقام تبدأ بـ 7' };
    }

    const { data: existingPhone } = await supabase.rpc(
      'lookup_phone_by_username',
      { p_username: data.username.trim() }
    );
    if (existingPhone) {
      return { error: 'اسم المستخدم محجوز مسبقاً' };
    }

    const email = `${phone}@mutahidun.app`;

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          username: data.username,
          phone,
        },
      },
    });

    if (error) {
      if (error.message === 'User already registered') {
        return { error: 'رقم الهاتف مسجل مسبقاً' };
      }
      return { error: error.message };
    }

    if (authData.user) {
      await fetchProfile(authData.user.id);
    }

    return { error: null };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
