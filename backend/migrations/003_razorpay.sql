-- 003_razorpay.sql
-- Adds Razorpay support to the PVL Commerce order + payment tables.
--
-- IDEMPOTENT: safe to run multiple times.
-- Run with your usual migration tool, or:
--   psql "$DATABASE_URL" -f backend/migrations/003_razorpay.sql

BEGIN;

-- ================================================================
-- orders: track the Razorpay order that pays for this internal order
-- ================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(60);

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_key
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- ================================================================
-- payments: enrich existing table for Razorpay flows
-- ================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(60),
  ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(60),
  ADD COLUMN IF NOT EXISTS event_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(60),
  ADD COLUMN IF NOT EXISTS failure_code VARCHAR(120),
  ADD COLUMN IF NOT EXISTS failure_description TEXT,
  ADD COLUMN IF NOT EXISTS raw_event JSONB;

-- Idempotency: same webhook event must never be applied twice.
CREATE UNIQUE INDEX IF NOT EXISTS payments_event_id_key
  ON public.payments (event_id)
  WHERE event_id IS NOT NULL;

-- One Razorpay payment ID = one row (post checkout verification).
CREATE UNIQUE INDEX IF NOT EXISTS payments_razorpay_payment_id_key
  ON public.payments (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- Fast lookup by internal order.
CREATE INDEX IF NOT EXISTS payments_order_id_idx
  ON public.payments (order_id);

-- ================================================================
-- refunds: add event bookkeeping (table already exists in base schema)
-- ================================================================
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS razorpay_refund_id VARCHAR(60),
  ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(60),
  ADD COLUMN IF NOT EXISTS event_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(60),
  ADD COLUMN IF NOT EXISTS raw_event JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_event_id_key
  ON public.refunds (event_id)
  WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_razorpay_refund_id_key
  ON public.refunds (razorpay_refund_id)
  WHERE razorpay_refund_id IS NOT NULL;

COMMIT;
