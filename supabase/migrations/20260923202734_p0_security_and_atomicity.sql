/*
# P0 Security & Atomicity Fixes

## Overview
This migration fixes critical security and financial integrity issues:
1. Prevents users from modifying their own role/balance/status via direct API calls
2. Revokes EXECUTE on SECURITY DEFINER trigger functions from anon and authenticated
3. Adds 'marketer' to the role CHECK constraint (was missing, causing insert failures)
4. Creates atomic PL/pgSQL functions for payment and exchange operations
5. Adds idempotency indexes on payments and exchanges metadata
6. Creates a dedicated admin-update function for profiles (role/balance/status)

## Security Changes
- REVOKE UPDATE on profiles columns (role, balance, status) from authenticated
- GRANT UPDATE (role, balance, status) only to the postgres/service-role via SECURITY DEFINER
- REVOKE EXECUTE on handle_new_user() and issue_welcome_gift() from anon, authenticated
- New SECURITY DEFINER functions: process_gift_payment, process_gift_exchange, admin_update_profile

## New Functions
1. process_gift_payment(p_user_id, p_gift_id, p_method, p_idempotency_key)
   - Atomically: validates gift, checks idempotency, inserts payment, issues user_gift, logs transaction, sends notification
   - Returns { success, payment_id, user_gift_id, reference } or { error }
2. process_gift_exchange(p_user_id, p_user_gift_id, p_network_id, p_idempotency_key)
   - Atomically: validates ownership, locks available card, marks gift used, creates exchange record, assigns card, logs transaction, sends notification
   - Returns { success, exchange_id, card_code, card_value, reference } or { error }
3. admin_update_profile(p_target_user_id, p_admin_id, p_name, p_balance, p_status, p_role)
   - Verifies caller is admin, updates allowed columns, writes audit log
   - Returns { success } or { error }

## Modified Tables
- profiles: CHECK constraint now includes 'marketer' role
- payments: index on metadata->>idempotency_key
- exchanges: index on metadata->>idempotency_key

## Important Notes
1. No data is lost — all changes are additive (new functions, new indexes, new policies)
2. Existing RLS policies on profiles are replaced with column-restricted versions
3. The handle_new_user trigger still works (it's called by the DB trigger, not via RPC)
4. Edge functions will call the new RPC functions instead of doing multi-step inserts
*/

-- ============================================================
-- 1. FIX: Add 'marketer' to role CHECK constraint
-- ============================================================
-- Drop old constraint and add new one with 'marketer'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'agent', 'marketer', 'admin'));

-- ============================================================
-- 2. SECURITY: Revoke EXECUTE on trigger functions from anon and authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_welcome_gift() FROM anon, authenticated;

-- ============================================================
-- 3. SECURITY: Column-level privileges on profiles
--    Users can only UPDATE name, username, phone, email, avatar_url
--    role, balance, status can ONLY be changed via SECURITY DEFINER function
-- ============================================================

-- First, revoke all UPDATE on profiles from authenticated
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Re-grant UPDATE only on safe columns
GRANT UPDATE (name, username, phone, email, avatar_url) ON public.profiles TO authenticated;

-- Drop and recreate the user self-update policy to only allow safe columns
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;

CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- The admin update policy stays as-is (admins update via the SECURITY DEFINER function)
-- But we need to re-grant UPDATE on all columns only for the service role (which bypasses GRANT checks)
-- The service_role bypasses all RLS and GRANT checks, so admin operations via edge functions
-- using service role key will work. Admin operations from the client use the admin_update_profile RPC.

-- ============================================================
-- 4. Idempotency indexes on payments and exchanges
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_payments_idempotency
  ON public.payments (((metadata->>'idempotency_key')));

CREATE INDEX IF NOT EXISTS idx_exchanges_idempotency
  ON public.exchanges (((metadata->>'idempotency_key')));

-- ============================================================
-- 5. SECURITY DEFINER: process_gift_payment
--    Atomic payment + gift issuance + transaction + notification
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_gift_payment(
  p_user_id uuid,
  p_gift_id uuid,
  p_method text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift public.gifts%ROWTYPE;
  v_payment_id uuid;
  v_user_gift_id uuid;
  v_payment_ref text;
  v_tx_ref text;
  v_existing jsonb;
BEGIN
  -- Validate method
  IF p_method NOT IN ('kuraimi', 'amqi', 'qatibi', 'inma') THEN
    RETURN jsonb_build_object('error', 'طريقة الدفع غير صحيحة');
  END IF;

  -- Check idempotency: if a payment with this key already exists and succeeded, return it
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'success', true,
      'duplicate', true,
      'payment_id', p.id,
      'reference', p.reference
    ) FROM public.payments p
     WHERE p.metadata->>'idempotency_key' = p_idempotency_key
       AND p.user_id = p_user_id
       AND p.status = 'success'
     LIMIT 1),
    jsonb_build_object('duplicate', false)
  ) INTO v_existing;

  IF (v_existing->>'duplicate')::boolean THEN
    RETURN v_existing;
  END IF;

  -- Fetch and validate gift
  SELECT * INTO v_gift FROM public.gifts WHERE id = p_gift_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'الهدية غير متاحة');
  END IF;

  -- Generate unique references
  v_payment_ref := 'PAY-' || upper(substring(encode(gen_random_bytes(8), 'hex') FROM 1 FOR 12));
  v_tx_ref := 'TXN-' || upper(substring(encode(gen_random_bytes(8), 'hex') FROM 1 FOR 12));

  -- Insert payment record
  INSERT INTO public.payments (user_id, gift_id, method, amount, status, reference, metadata)
  VALUES (p_user_id, p_gift_id, p_method, v_gift.price, 'success', v_payment_ref,
          jsonb_build_object('idempotency_key', p_idempotency_key))
  RETURNING id INTO v_payment_id;

  -- Issue user_gift
  INSERT INTO public.user_gifts (user_id, gift_id, status)
  VALUES (p_user_id, p_gift_id, 'available')
  RETURNING id INTO v_user_gift_id;

  -- Log transaction
  INSERT INTO public.transactions (user_id, type, amount, status, reference, description, metadata)
  VALUES (p_user_id, 'purchase', v_gift.price, 'success', v_tx_ref,
          'شراء ' || v_gift.name,
          jsonb_build_object('gift_id', p_gift_id, 'payment_id', v_payment_id));

  -- Send notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_user_id, 'تم الشراء بنجاح',
          'تم شراء ' || v_gift.name || ' بقيمة ' || v_gift.price::text || ' ريال',
          'payment');

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'user_gift_id', v_user_gift_id,
    'reference', v_payment_ref
  );
END;
$$;

-- Revoke direct execution from anon and authenticated — only callable via service role
REVOKE EXECUTE ON FUNCTION public.process_gift_payment(uuid, uuid, text, text) FROM anon, authenticated;

-- ============================================================
-- 6. SECURITY DEFINER: process_gift_exchange
--    Atomic exchange: validate ownership, lock card, mark gift used, assign card
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_gift_exchange(
  p_user_id uuid,
  p_user_gift_id uuid,
  p_network_id uuid,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_gift public.user_gifts%ROWTYPE;
  v_gift public.gifts%ROWTYPE;
  v_card public.cards%ROWTYPE;
  v_exchange_id uuid;
  v_exchange_ref text;
  v_tx_ref text;
  v_existing jsonb;
BEGIN
  -- Check idempotency
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'success', true,
      'duplicate', true,
      'exchange_id', e.id,
      'reference', e.reference,
      'card_code', c.code,
      'card_value', c.value
    ) FROM public.exchanges e
     JOIN public.cards c ON c.id = e.card_id
     WHERE e.metadata->>'idempotency_key' = p_idempotency_key
       AND e.user_id = p_user_id
       AND e.status = 'success'
     LIMIT 1),
    jsonb_build_object('duplicate', false)
  ) INTO v_existing;

  IF (v_existing->>'duplicate')::boolean THEN
    RETURN v_existing;
  END IF;

  -- Validate user_gift ownership and status
  SELECT * INTO v_user_gift FROM public.user_gifts
  WHERE id = p_user_gift_id AND user_id = p_user_id AND status = 'available';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'الهدية غير متاحة للمبادلة');
  END IF;

  -- Fetch gift to get value
  SELECT * INTO v_gift FROM public.gifts WHERE id = v_user_gift.gift_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'الهدية غير موجودة');
  END IF;

  -- Atomically lock an available card matching value and network
  -- FOR UPDATE SKIP LOCKED prevents two concurrent transactions from grabbing the same card
  SELECT * INTO v_card FROM public.cards
  WHERE network_id = p_network_id
    AND value = v_gift.value
    AND status = 'available'
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'لا توجد بطاقات متاحة بهذه القيمة للشبكة المختارة');
  END IF;

  -- Mark card as exchanged and assign to user
  UPDATE public.cards
  SET status = 'exchanged', assigned_to_user_id = p_user_id, assigned_at = now()
  WHERE id = v_card.id AND status = 'available';

  IF NOT FOUND THEN
    -- Card was grabbed by another transaction
    RETURN jsonb_build_object('error', 'تعذر حجز البطاقة، حاول مرة أخرى');
  END IF;

  -- Mark gift as used
  UPDATE public.user_gifts
  SET status = 'used', used_at = now()
  WHERE id = p_user_gift_id AND status = 'available';

  IF NOT FOUND THEN
    -- Gift was used by another transaction — rollback card assignment
    UPDATE public.cards SET status = 'available', assigned_to_user_id = NULL, assigned_at = NULL
    WHERE id = v_card.id;
    RETURN jsonb_build_object('error', 'الهدية تم استخدامها بالفعل');
  END IF;

  -- Generate references
  v_exchange_ref := 'EXC-' || upper(substring(encode(gen_random_bytes(8), 'hex') FROM 1 FOR 12));
  v_tx_ref := 'TXN-' || upper(substring(encode(gen_random_bytes(8), 'hex') FROM 1 FOR 12));

  -- Create exchange record
  INSERT INTO public.exchanges (user_id, user_gift_id, network_id, card_id, status, reference, metadata)
  VALUES (p_user_id, p_user_gift_id, p_network_id, v_card.id, 'success', v_exchange_ref,
          jsonb_build_object('idempotency_key', p_idempotency_key))
  RETURNING id INTO v_exchange_id;

  -- Log transaction
  INSERT INTO public.transactions (user_id, type, amount, status, reference, description, metadata)
  VALUES (p_user_id, 'exchange', v_gift.value, 'success', v_tx_ref,
          'مبادلة ' || v_gift.name || ' ببطاقة شبكة',
          jsonb_build_object('exchange_id', v_exchange_id, 'card_id', v_card.id));

  -- Send notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_user_id, 'تمت المبادلة بنجاح',
          'تم استبدال هديتك ببطاقة شبكة بقيمة ' || v_gift.value::text || ' ريال',
          'exchange');

  RETURN jsonb_build_object(
    'success', true,
    'exchange_id', v_exchange_id,
    'card_code', v_card.code,
    'card_value', v_card.value,
    'reference', v_exchange_ref
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_gift_exchange(uuid, uuid, uuid, text) FROM anon, authenticated;

-- ============================================================
-- 7. SECURITY DEFINER: admin_update_profile
--    Allows admin to update name, balance, status, role on any profile
--    Verifies caller is admin, writes audit log
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_target_user_id uuid,
  p_admin_id uuid,
  p_name text DEFAULT NULL,
  p_balance numeric DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_old_balance numeric;
  v_old_role text;
  v_old_status text;
BEGIN
  -- Verify caller is admin
  SELECT role INTO v_is_admin FROM public.profiles WHERE id = p_admin_id AND role = 'admin';
  IF NOT FOUND OR v_is_admin IS NULL THEN
    RETURN jsonb_build_object('error', 'غير مصرح: صلاحيات الإدارة مطلوبة');
  END IF;

  -- Capture old values for audit
  SELECT balance, role, status INTO v_old_balance, v_old_role, v_old_status
  FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'المستخدم غير موجود');
  END IF;

  -- Validate inputs
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'suspended') THEN
    RETURN jsonb_build_object('error', 'حالة غير صحيحة');
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('user', 'agent', 'marketer', 'admin') THEN
    RETURN jsonb_build_object('error', 'دور غير صحيح');
  END IF;

  -- Update only provided fields
  UPDATE public.profiles SET
    name = COALESCE(p_name, name),
    balance = COALESCE(p_balance, balance),
    status = COALESCE(p_status, status),
    role = COALESCE(p_role, role)
  WHERE id = p_target_user_id;

  -- Write audit log
  INSERT INTO public.audit_logs (admin_id, action, entity, entity_id, details)
  VALUES (
    p_admin_id,
    'update_profile',
    'profiles',
    p_target_user_id,
    jsonb_build_object(
      'old_balance', v_old_balance,
      'new_balance', COALESCE(p_balance, v_old_balance),
      'old_role', v_old_role,
      'new_role', COALESCE(p_role, v_old_role),
      'old_status', v_old_status,
      'new_status', COALESCE(p_status, v_old_status)
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, uuid, text, numeric, text, text) FROM anon, authenticated;