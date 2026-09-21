/*
# Create Al-Mutahidun (المتحدون) Database Schema

## Overview
Full schema for a digital gifts platform where users buy virtual gifts via e-payment
and exchange them for internet network cards from 3 networks (5G-NET, al-alam-net, tawfeer-Net).

## Tables Created
1. **profiles** — extends Supabase auth.users with app-specific data (name, username, phone, role, balance, status)
2. **gifts** — digital gifts with value, price, description, terms
3. **networks** — 3 internet network providers
4. **cards** — network card inventory with unique codes, statuses, and assignment tracking
5. **user_gifts** — gifts purchased by users (available/used/expired)
6. **transactions** — full audit log of all financial operations
7. **payments** — payment records for gift purchases
8. **exchanges** — gift-to-card exchange records
9. **notifications** — user notifications
10. **support_tickets** — user support tickets with tracking numbers
11. **audit_logs** — admin action audit trail

## Security
- RLS enabled on all tables
- Users can only access their own data (profiles, user_gifts, transactions, payments, exchanges, notifications, support_tickets)
- Admins (role='admin') have full access to all tables
- Gifts and networks are readable by all authenticated users (catalog browsing)
- Cards are only readable by admins (sensitive inventory data); users see their assigned cards via exchanges
- Audit logs are admin-only

## Important Notes
1. A trigger `handle_new_user` automatically creates a profile row when a new auth.user is created.
2. The `profiles` table uses the auth.users id as its primary key (1:1 relationship).
3. User balance defaults to 0; admin can adjust.
4. Card codes are unique to prevent duplicate usage.
5. Transaction and payment references are unique.
*/

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  phone text NOT NULL UNIQUE,
  email text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin')),
  balance numeric NOT NULL DEFAULT 0,
  avatar_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "select_all_profiles_admin" ON public.profiles;
DROP POLICY IF EXISTS "select_all_profiles_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_all_profiles_admin" ON public.profiles;
DROP POLICY IF EXISTS "delete_all_profiles_admin" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "select_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (but NOT role/balance/status — protected by column-level logic in app)
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "select_all_profiles_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins can update all profiles
CREATE POLICY "update_all_profiles_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins can delete profiles
CREATE POLICY "delete_all_profiles_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Insert is handled by the trigger function (SECURITY DEFINER)

-- ============================================================
-- 2. GIFTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  description text,
  terms text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_active_gifts_authenticated" ON public.gifts;
DROP POLICY IF EXISTS "select_all_gifts_admin" ON public.gifts;
DROP POLICY IF EXISTS "insert_gifts_admin" ON public.gifts;
DROP POLICY IF EXISTS "update_gifts_admin" ON public.gifts;
DROP POLICY IF EXISTS "delete_gifts_admin" ON public.gifts;

-- All authenticated users can see active gifts (catalog)
CREATE POLICY "select_active_gifts_authenticated" ON public.gifts
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins can see all gifts (including inactive)
CREATE POLICY "select_all_gifts_admin" ON public.gifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins can manage gifts
CREATE POLICY "insert_gifts_admin" ON public.gifts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "update_gifts_admin" ON public.gifts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "delete_gifts_admin" ON public.gifts
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 3. NETWORKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_active_networks_authenticated" ON public.networks;
DROP POLICY IF EXISTS "select_all_networks_admin" ON public.networks;
DROP POLICY IF EXISTS "insert_networks_admin" ON public.networks;
DROP POLICY IF EXISTS "update_networks_admin" ON public.networks;
DROP POLICY IF EXISTS "delete_networks_admin" ON public.networks;

CREATE POLICY "select_active_networks_authenticated" ON public.networks
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "select_all_networks_admin" ON public.networks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_networks_admin" ON public.networks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "update_networks_admin" ON public.networks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "delete_networks_admin" ON public.networks
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 4. CARDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  value numeric NOT NULL DEFAULT 0,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'exchanged', 'unavailable')),
  assigned_to_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_network_id ON public.cards(network_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_assigned_to_user ON public.cards(assigned_to_user_id);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cards" ON public.cards;
DROP POLICY IF EXISTS "select_all_cards_admin" ON public.cards;
DROP POLICY IF EXISTS "insert_cards_admin" ON public.cards;
DROP POLICY IF EXISTS "update_cards_admin" ON public.cards;
DROP POLICY IF EXISTS "delete_cards_admin" ON public.cards;

-- Users can see cards assigned to them
CREATE POLICY "select_own_cards" ON public.cards
  FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid());

-- Admins can see and manage all cards
CREATE POLICY "select_all_cards_admin" ON public.cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_cards_admin" ON public.cards
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "update_cards_admin" ON public.cards
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "delete_cards_admin" ON public.cards
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 5. USER_GIFTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_id uuid NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
  gifted_to_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_gifts_user_id ON public.user_gifts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gifts_status ON public.user_gifts(status);

ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_gifts" ON public.user_gifts;
DROP POLICY IF EXISTS "select_all_user_gifts_admin" ON public.user_gifts;
DROP POLICY IF EXISTS "insert_own_user_gifts" ON public.user_gifts;
DROP POLICY IF EXISTS "update_own_user_gifts" ON public.user_gifts;
DROP POLICY IF EXISTS "update_all_user_gifts_admin" ON public.user_gifts;
DROP POLICY IF EXISTS "delete_all_user_gifts_admin" ON public.user_gifts;

CREATE POLICY "select_own_user_gifts" ON public.user_gifts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "select_all_user_gifts_admin" ON public.user_gifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_own_user_gifts" ON public.user_gifts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_user_gifts" ON public.user_gifts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_all_user_gifts_admin" ON public.user_gifts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "delete_all_user_gifts_admin" ON public.user_gifts
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 6. TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'exchange', 'gift_sent', 'gift_received', 'refund')),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
  reference text NOT NULL UNIQUE,
  description text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "select_all_transactions_admin" ON public.transactions;
DROP POLICY IF EXISTS "insert_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "update_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "update_all_transactions_admin" ON public.transactions;

CREATE POLICY "select_own_transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "select_all_transactions_admin" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_own_transactions" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_all_transactions_admin" ON public.transactions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 7. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_id uuid NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('kuraimi', 'amqi', 'qatibi', 'inma')),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  reference text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON public.payments;
DROP POLICY IF EXISTS "select_all_payments_admin" ON public.payments;
DROP POLICY IF EXISTS "insert_own_payments" ON public.payments;
DROP POLICY IF EXISTS "update_own_payments" ON public.payments;
DROP POLICY IF EXISTS "update_all_payments_admin" ON public.payments;

CREATE POLICY "select_own_payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "select_all_payments_admin" ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_own_payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_all_payments_admin" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 8. EXCHANGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_gift_id uuid NOT NULL REFERENCES public.user_gifts(id) ON DELETE CASCADE,
  network_id uuid NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  reference text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchanges_user_id ON public.exchanges(user_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_status ON public.exchanges(status);

ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_exchanges" ON public.exchanges;
DROP POLICY IF EXISTS "select_all_exchanges_admin" ON public.exchanges;
DROP POLICY IF EXISTS "insert_own_exchanges" ON public.exchanges;
DROP POLICY IF EXISTS "update_own_exchanges" ON public.exchanges;
DROP POLICY IF EXISTS "update_all_exchanges_admin" ON public.exchanges;

CREATE POLICY "select_own_exchanges" ON public.exchanges
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "select_all_exchanges_admin" ON public.exchanges
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_own_exchanges" ON public.exchanges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_exchanges" ON public.exchanges
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_all_exchanges_admin" ON public.exchanges
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system' CHECK (type IN ('payment', 'gift', 'exchange', 'card', 'system', 'issue')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "select_all_notifications_admin" ON public.notifications;
DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_all_notifications_admin" ON public.notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_all_notifications_admin" ON public.notifications;
DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;

CREATE POLICY "select_own_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "select_all_notifications_admin" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_own_notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insert_all_notifications_admin" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_all_notifications_admin" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "delete_own_notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 10. SUPPORT_TICKETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  tracking_number text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "select_all_tickets_admin" ON public.support_tickets;
DROP POLICY IF EXISTS "insert_own_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "update_own_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "update_all_tickets_admin" ON public.support_tickets;

CREATE POLICY "select_own_tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "select_all_tickets_admin" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_own_tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_all_tickets_admin" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 11. AUDIT_LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_audit_logs_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "insert_audit_logs_admin" ON public.audit_logs;

CREATE POLICY "select_all_audit_logs_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_audit_logs_admin" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 12. TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'مستخدم'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'phone', '0000000000'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
