CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('voice_call', 'video_call', 'in_person')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response TEXT NOT NULL DEFAULT 'pending' CHECK (response IN ('pending', 'accepted', 'declined')),
  UNIQUE(meeting_id, user_id)
);

CREATE INDEX idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX idx_meeting_participants_user ON meeting_participants(user_id);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY meetings_select ON meetings FOR SELECT
  USING (organizer_id = auth.uid() OR id IN (SELECT meeting_id FROM meeting_participants WHERE user_id = auth.uid()) OR is_super_admin());
CREATE POLICY meetings_insert ON meetings FOR INSERT
  WITH CHECK (organizer_id = auth.uid());
CREATE POLICY meetings_update ON meetings FOR UPDATE
  USING (organizer_id = auth.uid() OR is_super_admin());
CREATE POLICY mp_select ON meeting_participants FOR SELECT
  USING (meeting_id IN (SELECT id FROM meetings WHERE organizer_id = auth.uid()) OR user_id = auth.uid() OR is_super_admin());
CREATE POLICY mp_insert ON meeting_participants FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY mp_update ON meeting_participants FOR UPDATE
  USING (user_id = auth.uid());

GRANT ALL ON meetings TO authenticated;
GRANT ALL ON meetings TO service_role;
GRANT ALL ON meeting_participants TO authenticated;
GRANT ALL ON meeting_participants TO service_role;
