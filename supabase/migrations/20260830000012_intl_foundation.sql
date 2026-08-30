-- ============================================================
-- P3-0 — international foundation
-- ============================================================
-- Reference data for countries, currencies and FX, plus per-user locale /
-- timezone / currency preferences. Monetary columns on module tables get a
-- paired currency code as those modules are built (P3-A..E); the pattern is
-- established here.

-- ---- countries -------------------------------------------------------

CREATE TABLE IF NOT EXISTS countries (
  code        CHAR(2) PRIMARY KEY,            -- ISO 3166-1 alpha-2
  name        TEXT NOT NULL,
  region      TEXT,
  dial_code   TEXT,
  currency    CHAR(3),                        -- default currency for the country
  flag        TEXT,                           -- emoji
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---- currencies -----------------------------------------------------

CREATE TABLE IF NOT EXISTS currencies (
  code        CHAR(3) PRIMARY KEY,            -- ISO 4217
  name        TEXT NOT NULL,
  symbol      TEXT NOT NULL,
  decimals    SMALLINT NOT NULL DEFAULT 2,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---- fx rates (one row per currency, rate vs the base) --------------

CREATE TABLE IF NOT EXISTS fx_rates (
  code        CHAR(3) PRIMARY KEY REFERENCES currencies(code) ON DELETE CASCADE,
  base        CHAR(3) NOT NULL DEFAULT 'USD',
  rate        NUMERIC(18,8) NOT NULL,         -- 1 base = <rate> <code>
  as_of       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source      TEXT
);

-- ---- per-user preferences ------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale             TEXT NOT NULL DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone           TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_currency CHAR(3) NOT NULL DEFAULT 'USD';

-- authenticated may set their own preference columns; role/status stay locked
-- (P1A finding). REVOKE was already done for role/status — re-grant the new ones.
GRANT UPDATE (locale, timezone, preferred_currency) ON public.profiles TO authenticated;

-- ---- RLS: reference data is world-readable, admin-writable ---------

ALTER TABLE countries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE fx_rates   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_countries_read ON countries;
CREATE POLICY ref_countries_read ON countries FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS ref_countries_write ON countries;
CREATE POLICY ref_countries_write ON countries FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS ref_currencies_read ON currencies;
CREATE POLICY ref_currencies_read ON currencies FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS ref_currencies_write ON currencies;
CREATE POLICY ref_currencies_write ON currencies FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS ref_fx_read ON fx_rates;
CREATE POLICY ref_fx_read ON fx_rates FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS ref_fx_write ON fx_rates;
CREATE POLICY ref_fx_write ON fx_rates FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

GRANT SELECT ON countries, currencies, fx_rates TO anon, authenticated;
GRANT ALL ON countries, currencies, fx_rates TO service_role;

-- ---- seed --------------------------------------------------------

INSERT INTO currencies (code, name, symbol, decimals) VALUES
  ('USD','US Dollar','$',2),
  ('GBP','Pound Sterling','£',2),
  ('EUR','Euro','€',2),
  ('AED','UAE Dirham','د.إ',2),
  ('PKR','Pakistani Rupee','₨',0),
  ('SAR','Saudi Riyal','﷼',2),
  ('CNY','Chinese Yuan','¥',2),
  ('HKD','Hong Kong Dollar','HK$',2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO fx_rates (code, base, rate, source) VALUES
  ('USD','USD',1,'seed'),
  ('GBP','USD',0.79,'seed'),
  ('EUR','USD',0.92,'seed'),
  ('AED','USD',3.67,'seed'),
  ('PKR','USD',278,'seed'),
  ('SAR','USD',3.75,'seed'),
  ('CNY','USD',7.1,'seed'),
  ('HKD','USD',7.8,'seed')
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (code, name, region, dial_code, currency, flag) VALUES
  ('GB','United Kingdom','Europe','+44','GBP','🇬🇧'),
  ('US','United States','Americas','+1','USD','🇺🇸'),
  ('AE','United Arab Emirates','Middle East','+971','AED','🇦🇪'),
  ('SA','Saudi Arabia','Middle East','+966','SAR','🇸🇦'),
  ('PK','Pakistan','South Asia','+92','PKR','🇵🇰'),
  ('HK','Hong Kong','Asia','+852','HKD','🇭🇰'),
  ('CN','China','Asia','+86','CNY','🇨🇳'),
  ('BE','Belgium','Europe','+32','EUR','🇧🇪'),
  ('DE','Germany','Europe','+49','EUR','🇩🇪'),
  ('FR','France','Europe','+33','EUR','🇫🇷'),
  ('QA','Qatar','Middle East','+974','QAR','🇶🇦'),
  ('KW','Kuwait','Middle East','+965','KWD','🇰🇼'),
  ('OM','Oman','Middle East','+968','OMR','🇴🇲'),
  ('IN','India','South Asia','+91','INR','🇮🇳'),
  ('SG','Singapore','Asia','+65','SGD','🇸🇬'),
  ('CH','Switzerland','Europe','+41','CHF','🇨🇭'),
  ('CA','Canada','Americas','+1','CAD','🇨🇦'),
  ('AU','Australia','Oceania','+61','AUD','🇦🇺'),
  ('ZA','South Africa','Africa','+27','ZAR','🇿🇦'),
  ('NG','Nigeria','Africa','+234','NGN','🇳🇬'),
  ('EG','Egypt','Africa','+20','EGP','🇪🇬'),
  ('TR','Turkey','Europe','+90','TRY','🇹🇷')
ON CONFLICT (code) DO NOTHING;
