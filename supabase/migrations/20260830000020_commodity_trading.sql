-- ============================================================
-- P3-E — commodity trading engine (oil & gas, mines & minerals)
-- ============================================================
-- One engine for both physical-commodity desks. A trade is a buy or sell
-- of a commodity against a counterparty, with a lifecycle checklist
-- (LOI / ICPO / SPA / inspection / B-L / payment …) and one or more
-- shipments.
--
-- Security model matches the other crm_* tables: RLS on, `authenticated`
-- gets SELECT only, every write goes through a service-role API route.
--
-- Written replay-safe (no local Docker to test against).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE trade_side AS ENUM ('buy','sell');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trade_desk AS ENUM ('oil_gas','minerals','agri','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trade_status AS ENUM ('inquiry','offer','negotiation','contract','nomination','in_transit','delivered','settled','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trade_step_status AS ENUM ('pending','in_progress','done','waived','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM ('planned','nominated','loading','sailed','arrived','discharged','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS commodity_trades (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference        TEXT UNIQUE,
  title            TEXT NOT NULL,
  desk             trade_desk NOT NULL DEFAULT 'oil_gas',
  side             trade_side NOT NULL DEFAULT 'buy',
  status           trade_status NOT NULL DEFAULT 'inquiry',
  commodity        TEXT NOT NULL,
  grade            TEXT,
  counterparty_id  UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  deal_id          UUID REFERENCES deals(id) ON DELETE SET NULL,
  quantity         NUMERIC(18,3),
  quantity_unit    TEXT,
  price_basis      TEXT,
  price_amount     NUMERIC(16,4),
  currency         CHAR(3) REFERENCES currencies(code) ON DELETE SET NULL,
  incoterm         TEXT,
  load_port        TEXT,
  discharge_port   TEXT,
  load_country     CHAR(2) REFERENCES countries(code) ON DELETE SET NULL,
  discharge_country CHAR(2) REFERENCES countries(code) ON DELETE SET NULL,
  contract_type    TEXT,
  laycan_start     DATE,
  laycan_end       DATE,
  notes            TEXT,
  owner_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trades_status       ON commodity_trades (status);
CREATE INDEX IF NOT EXISTS idx_trades_desk         ON commodity_trades (desk);
CREATE INDEX IF NOT EXISTS idx_trades_commodity    ON commodity_trades (lower(commodity));
CREATE INDEX IF NOT EXISTS idx_trades_counterparty ON commodity_trades (counterparty_id);
CREATE INDEX IF NOT EXISTS idx_trades_owner        ON commodity_trades (owner_id);
CREATE OR REPLACE TRIGGER commodity_trades_updated_at BEFORE UPDATE ON commodity_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS trade_steps (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id     UUID NOT NULL REFERENCES commodity_trades(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       trade_step_status NOT NULL DEFAULT 'pending',
  sort_order   INT NOT NULL DEFAULT 0,
  due_date     DATE,
  done_date    DATE,
  note         TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trade_steps_trade ON trade_steps (trade_id, sort_order);
CREATE OR REPLACE TRIGGER trade_steps_updated_at BEFORE UPDATE ON trade_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS trade_shipments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id         UUID NOT NULL REFERENCES commodity_trades(id) ON DELETE CASCADE,
  vessel_name      TEXT,
  status           shipment_status NOT NULL DEFAULT 'planned',
  bl_number        TEXT,
  bl_date          DATE,
  etd              DATE,
  eta              DATE,
  quantity_loaded  NUMERIC(18,3),
  quantity_discharged NUMERIC(18,3),
  demurrage_amount NUMERIC(14,2),
  note             TEXT,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trade_shipments_trade ON trade_shipments (trade_id);
CREATE OR REPLACE TRIGGER trade_shipments_updated_at BEFORE UPDATE ON trade_shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Stamp done_date when a step is marked done / waived.
CREATE OR REPLACE FUNCTION trade_steps_touch() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('done','waived') AND NEW.done_date IS NULL THEN
      NEW.done_date := CURRENT_DATE;
    ELSIF NEW.status NOT IN ('done','waived') THEN
      NEW.done_date := NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trade_steps_touch_status BEFORE UPDATE ON trade_steps
  FOR EACH ROW EXECUTE FUNCTION trade_steps_touch();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE commodity_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_shipments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commodity_trades_select ON commodity_trades;
CREATE POLICY commodity_trades_select ON commodity_trades FOR SELECT
  USING (is_super_admin() OR is_admin() OR owner_id = auth.uid() OR created_by = auth.uid());
DROP POLICY IF EXISTS commodity_trades_write ON commodity_trades;
CREATE POLICY commodity_trades_write ON commodity_trades FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS trade_steps_select ON trade_steps;
CREATE POLICY trade_steps_select ON trade_steps FOR SELECT
  USING (is_super_admin() OR is_admin()
         OR trade_id IN (SELECT id FROM commodity_trades WHERE owner_id = auth.uid() OR created_by = auth.uid()));
DROP POLICY IF EXISTS trade_steps_write ON trade_steps;
CREATE POLICY trade_steps_write ON trade_steps FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

DROP POLICY IF EXISTS trade_shipments_select ON trade_shipments;
CREATE POLICY trade_shipments_select ON trade_shipments FOR SELECT
  USING (is_super_admin() OR is_admin()
         OR trade_id IN (SELECT id FROM commodity_trades WHERE owner_id = auth.uid() OR created_by = auth.uid()));
DROP POLICY IF EXISTS trade_shipments_write ON trade_shipments;
CREATE POLICY trade_shipments_write ON trade_shipments FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

REVOKE ALL ON commodity_trades, trade_steps, trade_shipments FROM anon, authenticated;
GRANT SELECT ON commodity_trades, trade_steps, trade_shipments TO authenticated;
GRANT ALL ON commodity_trades, trade_steps, trade_shipments TO service_role;
