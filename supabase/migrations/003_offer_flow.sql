-- ============================================================
-- 003: Offer flow — buyer must accept before deal is matched
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add 'offer_sent' status to request_acceptances
-- Flow: pending_confirmation → offer_sent → confirmed/rejected
ALTER TABLE public.request_acceptances
  DROP CONSTRAINT IF EXISTS request_acceptances_status_check;

ALTER TABLE public.request_acceptances
  ADD CONSTRAINT request_acceptances_status_check
  CHECK (status IN ('pending_confirmation', 'offer_sent', 'confirmed', 'rejected'));

-- Store the final price (with margin) on the acceptance so buyer can see it before accepting
ALTER TABLE public.request_acceptances
  ADD COLUMN IF NOT EXISTS final_price BIGINT,
  ADD COLUMN IF NOT EXISTS final_currency TEXT DEFAULT 'USD';

-- Add 'offer_sent' status to buyer_requests
ALTER TABLE public.buyer_requests
  DROP CONSTRAINT IF EXISTS buyer_requests_status_check;

ALTER TABLE public.buyer_requests
  ADD CONSTRAINT buyer_requests_status_check
  CHECK (status IN ('pending_review', 'approved', 'live', 'matched', 'offer_sent', 'in_progress', 'completed', 'rejected'));
