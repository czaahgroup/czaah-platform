-- Add role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'real_estate_partner';

-- Add notification types for property system
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'property_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'property_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'property_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'property_enquiry';

-- Properties table
CREATE TABLE IF NOT EXISTS property_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('residential', 'commercial', 'industrial', 'land', 'mixed_use')),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sale', 'rent', 'lease')),
  price NUMERIC,
  currency TEXT DEFAULT 'PKR',
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  area_sqft NUMERIC,
  bedrooms INT,
  bathrooms INT,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'inactive')),
  rejection_notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Property enquiry chats
CREATE TABLE IF NOT EXISTS property_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  enquirer_id UUID NOT NULL REFERENCES profiles(id),
  partner_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  UNIQUE(property_id, enquirer_id)
);

CREATE TABLE IF NOT EXISTS property_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES property_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_properties_partner ON property_listings(partner_id);
CREATE INDEX idx_properties_status ON property_listings(status);
CREATE INDEX idx_properties_city ON property_listings(city);
CREATE INDEX idx_property_chats_enquirer ON property_chats(enquirer_id);
CREATE INDEX idx_property_chats_partner ON property_chats(partner_id);
CREATE INDEX idx_property_messages_chat ON property_messages(chat_id);

-- RLS
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_messages ENABLE ROW LEVEL SECURITY;

-- Properties: partners see own, approved members see approved listings, admins see all
CREATE POLICY properties_select_own ON property_listings FOR SELECT USING (partner_id = auth.uid());
CREATE POLICY properties_select_approved ON property_listings FOR SELECT USING (status = 'approved');
CREATE POLICY properties_select_admin ON property_listings FOR SELECT USING (is_super_admin() OR is_admin());
CREATE POLICY properties_insert ON property_listings FOR INSERT WITH CHECK (partner_id = auth.uid());
CREATE POLICY properties_update_own ON property_listings FOR UPDATE USING (partner_id = auth.uid() AND status = 'pending');
CREATE POLICY properties_update_admin ON property_listings FOR UPDATE USING (is_super_admin() OR is_admin());

-- Property chats: participants + super admin
CREATE POLICY pchat_select ON property_chats FOR SELECT USING (enquirer_id = auth.uid() OR partner_id = auth.uid() OR is_super_admin());
CREATE POLICY pchat_insert ON property_chats FOR INSERT WITH CHECK (enquirer_id = auth.uid());

-- Property messages: participants + super admin
CREATE POLICY pmsg_select ON property_messages FOR SELECT USING (chat_id IN (SELECT id FROM property_chats WHERE enquirer_id = auth.uid() OR partner_id = auth.uid()) OR is_super_admin());
CREATE POLICY pmsg_insert ON property_messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY pmsg_update ON property_messages FOR UPDATE USING (chat_id IN (SELECT id FROM property_chats WHERE enquirer_id = auth.uid() OR partner_id = auth.uid()) OR is_super_admin());

GRANT ALL ON property_listings TO authenticated;
GRANT ALL ON property_listings TO service_role;
GRANT ALL ON property_chats TO authenticated;
GRANT ALL ON property_chats TO service_role;
GRANT ALL ON property_messages TO authenticated;
GRANT ALL ON property_messages TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE property_messages;
