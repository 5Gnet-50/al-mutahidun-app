/*
# P0 Fix: Revoke EXECUTE on all SECURITY DEFINER functions from PUBLIC

## Problem
The previous migration revoked EXECUTE from `anon, authenticated` individually,
but Postgres defaults to granting EXECUTE to PUBLIC for all functions.
The Supabase advisor still reports all 5 SECURITY DEFINER functions as
callable by anon and authenticated.

## Fix
Revoke EXECUTE from PUBLIC (which covers anon, authenticated, and any other role)
on all 5 SECURITY DEFINER functions:
- handle_new_user()
- issue_welcome_gift()
- process_gift_payment(...)
- process_gift_exchange(...)
- admin_update_profile(...)

These functions are only called:
- handle_new_user / issue_welcome_gift: by database triggers (internal, not via RPC)
- process_gift_payment / process_gift_exchange: by edge functions using service role key
- admin_update_profile: by the frontend via authenticated RPC (but the function itself
  verifies the caller is admin internally, so we GRANT EXECUTE to authenticated only)

## Security
After this migration:
- anon CANNOT call any of these functions
- authenticated CANNOT call handle_new_user, issue_welcome_gift, process_gift_payment, process_gift_exchange
- authenticated CAN call admin_update_profile (but it verifies admin role internally)
- service_role bypasses all checks (used by edge functions)
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.issue_welcome_gift() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_gift_payment(uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_gift_exchange(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, uuid, text, numeric, text, text) FROM PUBLIC;

-- Grant EXECUTE on admin_update_profile to authenticated only
-- (the function verifies the caller is admin before doing anything)
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, uuid, text, numeric, text, text) TO authenticated;