-- ============================================================
-- 004: Negotiation messages for pre-deal conversations
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE public.negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acceptance_id UUID NOT NULL REFERENCES public.request_acceptances(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'admin_to_buyer', 'admin_to_manufacturer', 'buyer', 'manufacturer')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_negotiation_messages_acceptance ON public.negotiation_messages(acceptance_id);

ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins manage negotiation messages"
  ON public.negotiation_messages FOR ALL
  USING (public.get_my_role() = 'admin');

-- Buyers/manufacturers access via API (admin client), no direct RLS needed

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_messages;
