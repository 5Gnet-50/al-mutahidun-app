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
    // identifier can be phone or username — we store email as phone@mutahidun.app
    // Look up the profile to find the email
    const { data: profileData, error: lookupError } = await supabase
      .from('profiles')
      .select('id, username, phone')
      .or(`phone.eq.${identifier},username.eq.${identifier}`)
      .maybeSingle();

    if (lookupError || !profileData) {
      return { error: 'رقم الهاتف أو اسم المستخدم غير موجود' };
    }

    const email = `${profileData.phone}@mutahidun.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: 'كلمة المرور غير صحيحة' };
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (data: { name: string; username: string; phone: string; password: string }) => {
    const email = `${data.phone}@mutahidun.app`;

    // Check if username or phone already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, username, phone')
      .or(`username.eq.${data.username},phone.eq.${data.phone}`)
      .maybeSingle();

    if (existing) {
      if (existing.username === data.username) return { error: 'اسم المستخدم محجوز مسبقاً' };
      if (existing.phone === data.phone) return { error: 'رقم الهاتف مسجل مسبقاً' };
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          username: data.username,
          phone: data.phone,
        },
      },
    });

    if (error) {
      return { error: error.message === 'User already registered' ? 'رقم الهاتف مسجل مسبقاً' : error.message };
    }

    if (authData.user) {
      // Profile is created via trigger, but fetch to confirm
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
