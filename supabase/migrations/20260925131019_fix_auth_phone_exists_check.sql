/*
# Authentication Fix: Phone Existence Check Function

## Purpose
The login flow needs to determine whether a phone number corresponds to an
existing user account BEFORE calling signInWithPassword. Without this,
Supabase Auth returns a generic "Invalid credentials" error for both
non-existent emails and wrong passwords, making it impossible to show
the correct error message to the user.

## New Function
- `phone_exists(p_phone text)` — returns `true` if a profile with the
  given phone number exists, `false` otherwise. Returns only a boolean
  — no user data is exposed.

## Security
- SECURITY DEFINER (runs with the function owner's privileges, bypassing RLS)
- EXECUTE granted to `anon` and `authenticated` (login happens before auth)
- Returns only a boolean — no sensitive data exposed
- search_path set to `public` to prevent injection
- No writes, no side effects — pure read-only lookup
*/

CREATE OR REPLACE FUNCTION public.phone_exists(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = p_phone
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.phone_exists(text) TO anon, authenticated;