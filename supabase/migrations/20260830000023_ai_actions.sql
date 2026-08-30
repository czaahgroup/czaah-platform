-- ============================================================
-- P2 — logged AI actions
-- ============================================================
-- Every AI-assisted action on the platform writes one row here: who ran
-- it, against what, which model, a summary of the prompt and the output,
-- token usage and outcome. This is the audit surface for the Phase-2 AI
-- layer — nothing the AI does is invisible.
--
-- RLS: admins see everything, a user sees their own actions. Writes are
-- service-role only (API routes).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE ai_action_status AS ENUM ('ok','error','not_configured');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ai_actions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type    TEXT NOT NULL,
  related_type   crm_object,
  related_id     UUID,
  model          TEXT,
  prompt_summary TEXT,
  output         TEXT,
  status         ai_action_status NOT NULL DEFAULT 'ok',
  error          TEXT,
  tokens_in      INT NOT NULL DEFAULT 0,
  tokens_out     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((related_type IS NULL) = (related_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_ai_actions_actor   ON ai_actions (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_related ON ai_actions (related_type, related_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_created ON ai_actions (created_at DESC);

ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_actions_select ON ai_actions;
CREATE POLICY ai_actions_select ON ai_actions FOR SELECT
  USING (is_super_admin() OR is_admin() OR actor_id = auth.uid());
DROP POLICY IF EXISTS ai_actions_write ON ai_actions;
CREATE POLICY ai_actions_write ON ai_actions FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

REVOKE ALL ON ai_actions FROM anon, authenticated;
GRANT SELECT ON ai_actions TO authenticated;
GRANT ALL ON ai_actions TO service_role;
