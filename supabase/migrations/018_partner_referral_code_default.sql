-- Auto-generate a referral code for every partner, same reliable
-- sequence-based pattern as Partner ID, and backfill existing partners
-- that were created before this default existed.

CREATE SEQUENCE partner_referral_code_seq;

ALTER TABLE partners ALTER COLUMN referral_code
  SET DEFAULT 'REF-' || LPAD(NEXTVAL('partner_referral_code_seq')::TEXT, 5, '0');

UPDATE partners
SET referral_code = 'REF-' || LPAD(NEXTVAL('partner_referral_code_seq')::TEXT, 5, '0')
WHERE referral_code IS NULL;
