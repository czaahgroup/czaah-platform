-- ============================================================
-- CZAAH Platform — Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'investor' CHECK (role IN ('admin', 'investor', 'manufacturer', 'buyer')),
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'deactivated')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  country TEXT,
  -- Investor-specific
  investment_interests TEXT[] DEFAULT '{}',
  -- Manufacturer-specific
  company_registration_number TEXT,
  company_profile_url TEXT,
  certifications_url TEXT,
  -- Buyer-specific
  industry TEXT,
  sourcing_description TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'investor'),
    'pending_approval'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. PRODUCT CATEGORIES
-- ============================================================
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. MANUFACTURER CAPABILITIES (junction)
-- ============================================================
CREATE TABLE public.manufacturer_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  UNIQUE(manufacturer_id, category_id)
);

-- ============================================================
-- 4. INVESTMENT OPPORTUNITIES
-- ============================================================
CREATE TABLE public.investment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sector TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closing_soon', 'closed', 'fully_subscribed')),
  minimum_investment BIGINT,
  currency TEXT DEFAULT 'USD',
  target_return TEXT,
  investment_timeline TEXT,
  description TEXT,
  key_highlights TEXT[] DEFAULT '{}',
  location TEXT,
  map_embed_url TEXT,
  images TEXT[] DEFAULT '{}',
  documents TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER on_opportunities_updated
  BEFORE UPDATE ON public.investment_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 5. INVESTOR INTERESTS (junction)
-- ============================================================
CREATE TABLE public.investor_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.investment_opportunities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'expressed' CHECK (status IN ('expressed', 'under_review', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(investor_id, opportunity_id)
);

-- ============================================================
-- 6. BUYER REQUESTS
-- ============================================================
CREATE TABLE public.buyer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id),
  reference_number TEXT NOT NULL UNIQUE,
  product_description TEXT NOT NULL,
  quantity TEXT,
  target_price_min BIGINT,
  target_price_max BIGINT,
  price_currency TEXT DEFAULT 'USD',
  delivery_timeline TEXT,
  destination_country TEXT,
  certifications_required TEXT[] DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'live', 'matched', 'in_progress', 'completed', 'rejected')),
  admin_notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER on_buyer_requests_updated
  BEFORE UPDATE ON public.buyer_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-generate reference number
CREATE OR REPLACE FUNCTION public.generate_reference_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.buyer_requests
  WHERE reference_number LIKE 'RFQ-' || TO_CHAR(now(), 'YYYY') || '-%';

  NEW.reference_number = 'RFQ-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_buyer_request_created
  BEFORE INSERT ON public.buyer_requests
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL OR NEW.reference_number = '')
  EXECUTE FUNCTION public.generate_reference_number();

-- ============================================================
-- 7. REQUEST ACCEPTANCES
-- ============================================================
CREATE TABLE public.request_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.buyer_requests(id) ON DELETE CASCADE,
  manufacturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, manufacturer_id)
);

-- ============================================================
-- 8. ORDERS
-- ============================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.buyer_requests(id),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  manufacturer_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in_production', 'quality_check', 'shipped', 'delivered', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER on_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 9. ORDER MESSAGES
-- ============================================================
CREATE TABLE public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications TEXT NOT NULL DEFAULT 'all' CHECK (email_notifications IN ('all', 'sector_specific', 'none')),
  sector_filters TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER on_notification_prefs_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 11. AUDIT LOG
-- ============================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturer_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's status
CREATE OR REPLACE FUNCTION public.get_my_status()
RETURNS TEXT AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES ──
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can do everything with profiles
CREATE POLICY "Admins full access to profiles"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── PRODUCT CATEGORIES ──
-- Anyone authenticated can read categories
CREATE POLICY "Authenticated users can view categories"
  ON public.product_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage categories
CREATE POLICY "Admins manage categories"
  ON public.product_categories FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── MANUFACTURER CAPABILITIES ──
-- Manufacturers can view their own capabilities
CREATE POLICY "Manufacturers view own capabilities"
  ON public.manufacturer_capabilities FOR SELECT
  USING (manufacturer_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins manage capabilities"
  ON public.manufacturer_capabilities FOR ALL
  USING (public.get_my_role() = 'admin');

-- Manufacturers can manage their own
CREATE POLICY "Manufacturers manage own capabilities"
  ON public.manufacturer_capabilities FOR INSERT
  WITH CHECK (manufacturer_id = auth.uid() AND public.get_my_role() = 'manufacturer');

CREATE POLICY "Manufacturers delete own capabilities"
  ON public.manufacturer_capabilities FOR DELETE
  USING (manufacturer_id = auth.uid() AND public.get_my_role() = 'manufacturer');

-- ── INVESTMENT OPPORTUNITIES ──
-- Approved investors can see published opportunities
CREATE POLICY "Investors view published opportunities"
  ON public.investment_opportunities FOR SELECT
  USING (
    status IN ('published', 'closing_soon', 'closed', 'fully_subscribed')
    AND public.get_my_role() = 'investor'
    AND public.get_my_status() = 'approved'
  );

-- Admins full access
CREATE POLICY "Admins manage opportunities"
  ON public.investment_opportunities FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── INVESTOR INTERESTS ──
-- Investors can view their own interests
CREATE POLICY "Investors view own interests"
  ON public.investor_interests FOR SELECT
  USING (investor_id = auth.uid());

-- Investors can express interest
CREATE POLICY "Investors can express interest"
  ON public.investor_interests FOR INSERT
  WITH CHECK (
    investor_id = auth.uid()
    AND public.get_my_role() = 'investor'
    AND public.get_my_status() = 'approved'
  );

-- Admins full access
CREATE POLICY "Admins manage interests"
  ON public.investor_interests FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── BUYER REQUESTS ──
-- Buyers see their own requests
CREATE POLICY "Buyers view own requests"
  ON public.buyer_requests FOR SELECT
  USING (buyer_id = auth.uid());

-- Buyers can create requests
CREATE POLICY "Buyers can create requests"
  ON public.buyer_requests FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid()
    AND public.get_my_role() = 'buyer'
    AND public.get_my_status() = 'approved'
  );

-- Manufacturers see live requests matching their capabilities
CREATE POLICY "Manufacturers view matching live requests"
  ON public.buyer_requests FOR SELECT
  USING (
    status = 'live'
    AND public.get_my_role() = 'manufacturer'
    AND public.get_my_status() = 'approved'
    AND category_id IN (
      SELECT category_id FROM public.manufacturer_capabilities
      WHERE manufacturer_id = auth.uid()
    )
  );

-- Admins full access
CREATE POLICY "Admins manage requests"
  ON public.buyer_requests FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── REQUEST ACCEPTANCES ──
-- Manufacturers see their own acceptances
CREATE POLICY "Manufacturers view own acceptances"
  ON public.request_acceptances FOR SELECT
  USING (manufacturer_id = auth.uid());

-- Manufacturers can accept requests
CREATE POLICY "Manufacturers can accept requests"
  ON public.request_acceptances FOR INSERT
  WITH CHECK (
    manufacturer_id = auth.uid()
    AND public.get_my_role() = 'manufacturer'
    AND public.get_my_status() = 'approved'
  );

-- Admins full access
CREATE POLICY "Admins manage acceptances"
  ON public.request_acceptances FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── ORDERS ──
-- Buyers see their own orders
CREATE POLICY "Buyers view own orders"
  ON public.orders FOR SELECT
  USING (buyer_id = auth.uid());

-- Manufacturers see their own orders
CREATE POLICY "Manufacturers view own orders"
  ON public.orders FOR SELECT
  USING (manufacturer_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins manage orders"
  ON public.orders FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── ORDER MESSAGES ──
-- Order participants can view messages
CREATE POLICY "Order participants view messages"
  ON public.order_messages FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE buyer_id = auth.uid() OR manufacturer_id = auth.uid()
    )
  );

-- Order participants can send messages
CREATE POLICY "Order participants send messages"
  ON public.order_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE buyer_id = auth.uid() OR manufacturer_id = auth.uid()
    )
  );

-- Admins full access
CREATE POLICY "Admins manage messages"
  ON public.order_messages FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── NOTIFICATION PREFERENCES ──
-- Users manage their own preferences
CREATE POLICY "Users view own notification prefs"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own notification prefs"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own notification prefs"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins manage notification prefs"
  ON public.notification_preferences FOR ALL
  USING (public.get_my_role() = 'admin');

-- ── AUDIT LOG ──
-- Only admins can view and write audit logs
CREATE POLICY "Admins manage audit log"
  ON public.audit_log FOR ALL
  USING (public.get_my_role() = 'admin');

-- ============================================================
-- 13. INDEXES
-- ============================================================
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_role_status ON public.profiles(role, status);
CREATE INDEX idx_opportunities_status ON public.investment_opportunities(status);
CREATE INDEX idx_opportunities_sector ON public.investment_opportunities(sector);
CREATE INDEX idx_investor_interests_investor ON public.investor_interests(investor_id);
CREATE INDEX idx_investor_interests_opportunity ON public.investor_interests(opportunity_id);
CREATE INDEX idx_buyer_requests_status ON public.buyer_requests(status);
CREATE INDEX idx_buyer_requests_category ON public.buyer_requests(category_id);
CREATE INDEX idx_buyer_requests_buyer ON public.buyer_requests(buyer_id);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_manufacturer ON public.orders(manufacturer_id);
CREATE INDEX idx_order_messages_order ON public.order_messages(order_id);
CREATE INDEX idx_audit_log_admin ON public.audit_log(admin_id);
CREATE INDEX idx_audit_log_target ON public.audit_log(target_type, target_id);

-- ============================================================
-- 14. ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investor_interests;
