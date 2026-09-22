/*
# Add Plans, Agents tables + Welcome Gift trigger

## What this does
1. Creates `plans` table — network subscription plans (value, duration, speed)
2. Creates `agents` table — agent/marketer profiles with commission tracking
3. Creates a trigger `handle_welcome_gift` that auto-issues a 1000 ريال welcome gift to new users on signup
4. Seeds default plans for each network

## Tables

### plans
- id (uuid PK)
- network_id (FK networks)
- name (text)
- value (numeric)
- duration_hours (integer)
- speed_mbps (integer, nullable)
- description (text, nullable)
- is_active (boolean, default true)
- sort_order (int, default 0)
- created_at (timestamptz)

### agents
- id (uuid PK)
- user_id (FK profiles)
- commission_rate (numeric, default 0)
- total_sales (numeric, default 0)
- total_commission (numeric, default 0)
- status (text: pending/active/suspended)
- permissions (jsonb, default '{}')
- created_at (timestamptz)

## Security
- RLS enabled on both new tables
- plans: all authenticated can read active; admin can manage all
- agents: admin can read/manage all; users can read their own agent profile
*/

-- ============================================================
-- PLANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  duration_hours integer NOT NULL DEFAULT 24,
  speed_mbps integer,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_network_id ON public.plans(network_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_active_plans_authenticated" ON public.plans;
DROP POLICY IF EXISTS "select_all_plans_admin" ON public.plans;
DROP POLICY IF EXISTS "insert_plans_admin" ON public.plans;
DROP POLICY IF EXISTS "update_plans_admin" ON public.plans;
DROP POLICY IF EXISTS "delete_plans_admin" ON public.plans;

CREATE POLICY "select_active_plans_authenticated" ON public.plans
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "select_all_plans_admin" ON public.plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_plans_admin" ON public.plans
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "update_plans_admin" ON public.plans
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "delete_plans_admin" ON public.plans
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- AGENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL DEFAULT 0,
  total_sales numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(status);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_agent" ON public.agents;
DROP POLICY IF EXISTS "select_all_agents_admin" ON public.agents;
DROP POLICY IF EXISTS "insert_agents_admin" ON public.agents;
DROP POLICY IF EXISTS "update_own_agent" ON public.agents;
DROP POLICY IF EXISTS "update_all_agents_admin" ON public.agents;
DROP POLICY IF EXISTS "delete_all_agents_admin" ON public.agents;

CREATE POLICY "select_own_agent" ON public.agents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "select_all_agents_admin" ON public.agents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "insert_agents_admin" ON public.agents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "update_own_agent" ON public.agents
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_all_agents_admin" ON public.agents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "delete_all_agents_admin" ON public.agents
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- WELCOME GIFT TRIGGER
-- Auto-issues a 1000 ريal welcome gift when a new profile is created
-- ============================================================

-- First, ensure a "welcome" gift exists
INSERT INTO public.gifts (name, value, price, description, terms, is_active, sort_order)
VALUES ('هدية الترحيب', 1000, 0, 'هدية ترحيبية مجانية بقيمة 1000 ريال للمستخدمين الجدد', 'هدية ترحيبية تلقائية', true, 0)
ON CONFLICT DO NOTHING;

-- Function to issue welcome gift after profile creation
CREATE OR REPLACE FUNCTION public.issue_welcome_gift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_welcome_gift_id uuid;
BEGIN
  -- Only issue to regular users (not agents/marketers/admins)
  IF NEW.role = 'user' THEN
    SELECT id INTO v_welcome_gift_id FROM public.gifts WHERE name = 'هدية الترحيب' AND is_active = true LIMIT 1;
    IF v_welcome_gift_id IS NOT NULL THEN
      INSERT INTO public.user_gifts (user_id, gift_id, status)
      VALUES (NEW.id, v_welcome_gift_id, 'available')
      ON CONFLICT DO NOTHING;

      -- Insert a transaction for the welcome gift
      INSERT INTO public.transactions (user_id, type, amount, status, reference, description)
      VALUES (
        NEW.id,
        'gift_received',
        1000,
        'success',
        'WELCOME-' || substring(NEW.id::text, 1, 8),
        'هدية ترحيبية بقيمة 1000 ريال'
      )
      ON CONFLICT DO NOTHING;

      -- Send notification
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.id,
        'مرحباً بك في المتحدون!',
        'لقد أرسلنا لك هدية ترحيبية بقيمة 1000 ريال. استخدمها لمبادلتها مع بطاقة شبكة.',
        'gift'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.issue_welcome_gift();

-- ============================================================
-- SEED PLANS
-- ============================================================
DO $$
DECLARE
  net_5g uuid;
  net_alam uuid;
  net_tawfeer uuid;
BEGIN
  SELECT id INTO net_5g FROM public.networks WHERE name = '5G-NET';
  SELECT id INTO net_alam FROM public.networks WHERE name = 'al-alam-net';
  SELECT id INTO net_tawfeer FROM public.networks WHERE name = 'tawfeer-Net';

  -- 5G-NET plans
  INSERT INTO public.plans (network_id, name, value, duration_hours, speed_mbps, description, sort_order) VALUES
    (net_5g, 'باقة ساعة', 200, 1, 20, 'ساعة واحدة بسرعة 20 ميجا', 1),
    (net_5g, 'باقة يوم', 300, 24, 20, 'يوم كامل بسرعة 20 ميجا', 2),
    (net_5g, 'باقة أسبوع', 500, 168, 30, 'أسبوع كامل بسرعة 30 ميجا', 3),
    (net_5g, 'باقة شهر', 1000, 720, 40, 'شهر كامل بسرعة 40 ميجا', 4)
  ON CONFLICT DO NOTHING;

  -- al-alam-net plans
  INSERT INTO public.plans (network_id, name, value, duration_hours, speed_mbps, description, sort_order) VALUES
    (net_alam, 'باقة ساعة', 200, 1, 15, 'ساعة واحدة بسرعة 15 ميجا', 1),
    (net_alam, 'باقة يوم', 300, 24, 15, 'يوم كامل بسرعة 15 ميجا', 2),
    (net_alam, 'باقة أسبوع', 500, 168, 25, 'أسبوع كامل بسرعة 25 ميجا', 3),
    (net_alam, 'باقة شهر', 1000, 720, 30, 'شهر كامل بسرعة 30 ميجا', 4)
  ON CONFLICT DO NOTHING;

  -- tawfeer-Net plans
  INSERT INTO public.plans (network_id, name, value, duration_hours, speed_mbps, description, sort_order) VALUES
    (net_tawfeer, 'باقة ساعة', 200, 1, 10, 'ساعة واحدة بسرعة 10 ميجا', 1),
    (net_tawfeer, 'باقة يوم', 300, 24, 10, 'يوم كامل بسرعة 10 ميجا', 2),
    (net_tawfeer, 'باقة أسبوع', 500, 168, 15, 'أسبوع كامل بسرعة 15 ميجا', 3),
    (net_tawfeer, 'باقة شهر', 1000, 720, 20, 'شهر كامل بسرعة 20 ميجا', 4)
  ON CONFLICT DO NOTHING;
END $$;
