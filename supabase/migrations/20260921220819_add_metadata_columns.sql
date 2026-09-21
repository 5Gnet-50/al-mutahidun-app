/*
# Add metadata column to payments and exchanges

The edge functions for payment and exchange processing store idempotency keys
in a metadata jsonb column. This migration adds that column to both tables.
*/

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.exchanges ADD COLUMN IF NOT EXISTS metadata jsonb;
