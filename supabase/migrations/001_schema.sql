-- ============================================
-- CZAAH Platform — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'member');
CREATE TYPE user_status AS ENUM ('pending_kyc_review', 'approved', 'rejected', 'deactivated');
CREATE TYPE document_type AS ENUM ('government_id_front', 'government_id_back', 'company_registration', 'proof_of_address');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE investment_status AS ENUM ('draft', 'published', 'closing_soon', 'closed', 'fully_subscribed');
CREATE TYPE investment_doc_type AS ENUM ('teaser', 'prospectus', 'due_diligence', 'other');
CREATE TYPE enquiry_timeline AS ENUM ('urgent', '1_3_months', '3_6_months', '6_plus_months', 'flexible');
CREATE TYPE enquiry_status AS ENUM ('submitted', 'assigned', 'active', 'waiting', 'resolved', 'archived');
CREATE TYPE message_type AS ENUM ('text', 'file', 'system', 'internal_note');
CREATE TYPE shared_doc_type AS ENUM ('contract', 'quotation', 'spec_sheet', 'brochure', 'other');
CREATE TYPE notification_type AS ENUM ('new_message', 'enquiry_assigned', 'enquiry_resolved', 'kyc_approved', 'kyc_rejected', 'new_investment', 'chat_reassigned');

-- ============================================
-- PROFILES
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  status user_status NOT NULL DEFAULT 'pending_kyc_review',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  company_registration_number TEXT,
  country TEXT,
  industry_interests TEXT[] DEFAULT '{}',
  company_website TEXT,
  company_description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- KYC DOCUMENTS
-- ============================================

CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  review_status review_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT
);

-- ============================================
-- SECTORS
-- ============================================

CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SERVICES
-- ============================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_enquiry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ADMIN SECTOR ASSIGNMENTS
-- ============================================

CREATE TABLE admin_sector_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(admin_id, sector_id)
);

-- ============================================
-- INVESTMENT OPPORTUNITIES
-- ============================================

CREATE TABLE investment_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  sector_tag TEXT,
  status investment_status NOT NULL DEFAULT 'draft',
  min_investment_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  target_return TEXT,
  investment_timeline TEXT,
  description TEXT,
  key_highlights TEXT[] DEFAULT '{}',
  location TEXT,
  created_by UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE investment_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  document_type investment_doc_type NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE investment_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INT NOT NULL DEFAULT 0
);

-- ============================================
-- ENQUIRIES
-- ============================================

-- Sequence for reference numbers
CREATE SEQUENCE enquiry_ref_seq START 1;

CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number TEXT NOT NULL UNIQUE DEFAULT 'ENQ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('enquiry_ref_seq')::TEXT, 4, '0'),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  product_name TEXT,
  description TEXT,
  estimated_quantity TEXT,
  timeline enquiry_timeline DEFAULT 'flexible',
  additional_notes TEXT,
  status enquiry_status NOT NULL DEFAULT 'submitted',
  assigned_admin_id UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE enquiry_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CHAT MESSAGES
-- ============================================

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SHARED DOCUMENTS
-- ============================================

CREATE TABLE shared_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES profiles(id),
  shared_with UUID NOT NULL REFERENCES profiles(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  document_type shared_doc_type NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MEMBER BOOKMARKS
-- ============================================

CREATE TABLE member_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  email_new_message BOOLEAN NOT NULL DEFAULT TRUE,
  email_enquiry_status BOOLEAN NOT NULL DEFAULT TRUE,
  email_new_investment BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_new_message BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enquiry_status BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_kyc_documents_user ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(review_status);
CREATE INDEX idx_products_sector ON products(sector_id);
CREATE INDEX idx_products_service ON products(service_id);
CREATE INDEX idx_admin_assignments_admin ON admin_sector_assignments(admin_id);
CREATE INDEX idx_admin_assignments_sector ON admin_sector_assignments(sector_id);
CREATE INDEX idx_enquiries_member ON enquiries(member_id);
CREATE INDEX idx_enquiries_admin ON enquiries(assigned_admin_id);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_enquiries_sector ON enquiries(sector_id);
CREATE INDEX idx_chat_messages_enquiry ON chat_messages(enquiry_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_investment_opportunities_status ON investment_opportunities(status);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sectors_updated_at BEFORE UPDATE ON sectors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER enquiries_updated_at BEFORE UPDATE ON enquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER investment_opportunities_updated_at BEFORE UPDATE ON investment_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is approved
CREATE OR REPLACE FUNCTION is_approved()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (id = auth.uid());

-- Super admin can read all profiles
CREATE POLICY profiles_select_super_admin ON profiles FOR SELECT
  USING (is_super_admin());

-- Admins can read profiles of members in their assigned enquiries
CREATE POLICY profiles_select_admin ON profiles FOR SELECT
  USING (
    is_admin() AND (
      id IN (
        SELECT member_id FROM enquiries WHERE assigned_admin_id = auth.uid()
      )
      OR id = auth.uid()
    )
  );

-- Users can insert their own profile (on signup)
CREATE POLICY profiles_insert_own ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Super admin can update any profile
CREATE POLICY profiles_update_super_admin ON profiles FOR UPDATE
  USING (is_super_admin());

-- ============================================
-- KYC DOCUMENTS POLICIES
-- ============================================

-- Users can see their own KYC docs
CREATE POLICY kyc_select_own ON kyc_documents FOR SELECT
  USING (user_id = auth.uid());

-- Super admin can see all KYC docs
CREATE POLICY kyc_select_super_admin ON kyc_documents FOR SELECT
  USING (is_super_admin());

-- Users can upload their own KYC docs
CREATE POLICY kyc_insert_own ON kyc_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Super admin can update KYC docs (approve/reject)
CREATE POLICY kyc_update_super_admin ON kyc_documents FOR UPDATE
  USING (is_super_admin());

-- ============================================
-- SECTORS POLICIES — readable by approved members
-- ============================================

CREATE POLICY sectors_select_approved ON sectors FOR SELECT
  USING (is_active = TRUE AND is_approved());

CREATE POLICY sectors_select_super_admin ON sectors FOR SELECT
  USING (is_super_admin());

CREATE POLICY sectors_insert_super_admin ON sectors FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY sectors_update_super_admin ON sectors FOR UPDATE
  USING (is_super_admin());

CREATE POLICY sectors_delete_super_admin ON sectors FOR DELETE
  USING (is_super_admin());

-- ============================================
-- SERVICES POLICIES
-- ============================================

CREATE POLICY services_select_approved ON services FOR SELECT
  USING (is_active = TRUE AND is_approved());

CREATE POLICY services_select_super_admin ON services FOR SELECT
  USING (is_super_admin());

CREATE POLICY services_insert_super_admin ON services FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY services_update_super_admin ON services FOR UPDATE
  USING (is_super_admin());

CREATE POLICY services_delete_super_admin ON services FOR DELETE
  USING (is_super_admin());

-- ============================================
-- PRODUCTS POLICIES
-- ============================================

CREATE POLICY products_select_approved ON products FOR SELECT
  USING (is_active = TRUE AND is_approved());

CREATE POLICY products_select_super_admin ON products FOR SELECT
  USING (is_super_admin());

CREATE POLICY products_insert_super_admin ON products FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY products_update_super_admin ON products FOR UPDATE
  USING (is_super_admin());

CREATE POLICY products_delete_super_admin ON products FOR DELETE
  USING (is_super_admin());

-- ============================================
-- ADMIN SECTOR ASSIGNMENTS POLICIES
-- ============================================

-- Admins can see their own assignments
CREATE POLICY admin_assignments_select_own ON admin_sector_assignments FOR SELECT
  USING (admin_id = auth.uid());

-- Super admin can see and manage all assignments
CREATE POLICY admin_assignments_select_super_admin ON admin_sector_assignments FOR SELECT
  USING (is_super_admin());

CREATE POLICY admin_assignments_insert_super_admin ON admin_sector_assignments FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY admin_assignments_delete_super_admin ON admin_sector_assignments FOR DELETE
  USING (is_super_admin());

-- ============================================
-- INVESTMENT OPPORTUNITIES POLICIES
-- ============================================

-- Approved members can see published investments
CREATE POLICY investments_select_approved ON investment_opportunities FOR SELECT
  USING (status IN ('published', 'closing_soon') AND is_approved());

CREATE POLICY investments_select_super_admin ON investment_opportunities FOR SELECT
  USING (is_super_admin());

CREATE POLICY investments_insert_super_admin ON investment_opportunities FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY investments_update_super_admin ON investment_opportunities FOR UPDATE
  USING (is_super_admin());

CREATE POLICY investments_delete_super_admin ON investment_opportunities FOR DELETE
  USING (is_super_admin());

-- Investment documents — same visibility as opportunities
CREATE POLICY inv_docs_select_approved ON investment_documents FOR SELECT
  USING (
    is_approved() AND opportunity_id IN (
      SELECT id FROM investment_opportunities WHERE status IN ('published', 'closing_soon')
    )
  );

CREATE POLICY inv_docs_select_super_admin ON investment_documents FOR SELECT
  USING (is_super_admin());

CREATE POLICY inv_docs_manage_super_admin ON investment_documents FOR ALL
  USING (is_super_admin());

-- Investment images
CREATE POLICY inv_images_select_approved ON investment_images FOR SELECT
  USING (
    is_approved() AND opportunity_id IN (
      SELECT id FROM investment_opportunities WHERE status IN ('published', 'closing_soon')
    )
  );

CREATE POLICY inv_images_select_super_admin ON investment_images FOR SELECT
  USING (is_super_admin());

CREATE POLICY inv_images_manage_super_admin ON investment_images FOR ALL
  USING (is_super_admin());

-- ============================================
-- ENQUIRIES POLICIES
-- ============================================

-- Members see their own enquiries
CREATE POLICY enquiries_select_member ON enquiries FOR SELECT
  USING (member_id = auth.uid());

-- Admins see enquiries assigned to them
CREATE POLICY enquiries_select_admin ON enquiries FOR SELECT
  USING (assigned_admin_id = auth.uid() AND is_admin());

-- Super admin sees all
CREATE POLICY enquiries_select_super_admin ON enquiries FOR SELECT
  USING (is_super_admin());

-- Members can create enquiries
CREATE POLICY enquiries_insert_member ON enquiries FOR INSERT
  WITH CHECK (member_id = auth.uid() AND is_approved());

-- Super admin can update any enquiry (assign, reassign)
CREATE POLICY enquiries_update_super_admin ON enquiries FOR UPDATE
  USING (is_super_admin());

-- Admin can update their assigned enquiries (status changes)
CREATE POLICY enquiries_update_admin ON enquiries FOR UPDATE
  USING (assigned_admin_id = auth.uid() AND is_admin());

-- Member can update their own enquiry (mark resolved)
CREATE POLICY enquiries_update_member ON enquiries FOR UPDATE
  USING (member_id = auth.uid());

-- Enquiry attachments
CREATE POLICY enq_attach_select_member ON enquiry_attachments FOR SELECT
  USING (enquiry_id IN (SELECT id FROM enquiries WHERE member_id = auth.uid()));

CREATE POLICY enq_attach_select_admin ON enquiry_attachments FOR SELECT
  USING (enquiry_id IN (SELECT id FROM enquiries WHERE assigned_admin_id = auth.uid()));

CREATE POLICY enq_attach_select_super_admin ON enquiry_attachments FOR SELECT
  USING (is_super_admin());

CREATE POLICY enq_attach_insert ON enquiry_attachments FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- ============================================
-- CHAT MESSAGES POLICIES (CRITICAL)
-- ============================================

-- Members see messages in their enquiries, EXCLUDING internal notes
CREATE POLICY chat_select_member ON chat_messages FOR SELECT
  USING (
    is_internal_note = FALSE
    AND enquiry_id IN (SELECT id FROM enquiries WHERE member_id = auth.uid())
  );

-- Admins see all messages (including internal notes) in their assigned enquiries
CREATE POLICY chat_select_admin ON chat_messages FOR SELECT
  USING (
    enquiry_id IN (SELECT id FROM enquiries WHERE assigned_admin_id = auth.uid())
    AND is_admin()
  );

-- Super admin sees ALL messages
CREATE POLICY chat_select_super_admin ON chat_messages FOR SELECT
  USING (is_super_admin());

-- Participants can send messages
CREATE POLICY chat_insert_member ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND is_internal_note = FALSE
    AND enquiry_id IN (SELECT id FROM enquiries WHERE member_id = auth.uid())
  );

CREATE POLICY chat_insert_admin ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND enquiry_id IN (SELECT id FROM enquiries WHERE assigned_admin_id = auth.uid())
    AND is_admin()
  );

CREATE POLICY chat_insert_super_admin ON chat_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND is_super_admin());

-- Update (mark as read)
CREATE POLICY chat_update_read ON chat_messages FOR UPDATE
  USING (
    enquiry_id IN (
      SELECT id FROM enquiries
      WHERE member_id = auth.uid() OR assigned_admin_id = auth.uid()
    )
    OR is_super_admin()
  );

-- ============================================
-- SHARED DOCUMENTS POLICIES
-- ============================================

CREATE POLICY shared_docs_select_own ON shared_documents FOR SELECT
  USING (shared_by = auth.uid() OR shared_with = auth.uid());

CREATE POLICY shared_docs_select_super_admin ON shared_documents FOR SELECT
  USING (is_super_admin());

CREATE POLICY shared_docs_insert ON shared_documents FOR INSERT
  WITH CHECK (shared_by = auth.uid() AND (is_admin() OR is_super_admin()));

-- ============================================
-- MEMBER BOOKMARKS POLICIES
-- ============================================

CREATE POLICY bookmarks_select_own ON member_bookmarks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY bookmarks_insert_own ON member_bookmarks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY bookmarks_delete_own ON member_bookmarks FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- NOTIFICATION PREFERENCES POLICIES
-- ============================================

CREATE POLICY notif_prefs_select_own ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notif_prefs_insert_own ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notif_prefs_update_own ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

CREATE POLICY notifications_select_own ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY notifications_insert_system ON notifications FOR INSERT
  WITH CHECK (is_super_admin() OR is_admin());

-- Also allow service role to insert (for API routes)
-- Service role bypasses RLS by default, so no extra policy needed

-- ============================================
-- AUDIT LOG POLICIES
-- ============================================

CREATE POLICY audit_select_super_admin ON audit_log FOR SELECT
  USING (is_super_admin());

CREATE POLICY audit_insert ON audit_log FOR INSERT
  WITH CHECK (is_super_admin() OR is_admin());

-- ============================================
-- REALTIME — Enable for chat and notifications
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE enquiries;
