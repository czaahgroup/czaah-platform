-- ============================================================
-- 002: Add bid pricing to acceptances + final pricing to orders
-- Run this in Supabase SQL Editor
-- ============================================================

-- Manufacturer's bid price (only admin sees this)
ALTER TABLE public.request_acceptances
  ADD COLUMN bid_price BIGINT,
  ADD COLUMN bid_currency TEXT DEFAULT 'USD',
  ADD COLUMN bid_notes TEXT;

-- Admin's final price to buyer (bid + CZAAH margin)
ALTER TABLE public.orders
  ADD COLUMN final_price BIGINT,
  ADD COLUMN final_currency TEXT DEFAULT 'USD';

-- Add sender_role to order_messages so we can label messages properly
-- (avoids needing to join profiles every time to check role)
ALTER TABLE public.order_messages
  ADD COLUMN sender_role TEXT DEFAULT 'admin' CHECK (sender_role IN ('admin', 'buyer', 'manufacturer'));
