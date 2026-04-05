-- ============================================================
-- autoreplai — Autopilot Schema
-- ============================================================
-- Adds the tables and columns needed for the Telegram autopilot.
-- The bot migrates from Prisma to Supabase-only after this.
-- ============================================================

-- 1. Autopilot columns on businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_checked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone          TEXT NOT NULL DEFAULT 'Europe/Madrid',
  ADD COLUMN IF NOT EXISTS summary_time      TEXT NOT NULL DEFAULT '09:00';

-- 2. personas — tone + instructions per business
CREATE TABLE IF NOT EXISTS personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  tone                TEXT NOT NULL DEFAULT 'warm',
  good_instructions   TEXT NOT NULL,
  medium_instructions TEXT NOT NULL,
  bad_instructions    TEXT NOT NULL,
  language            TEXT NOT NULL DEFAULT 'es',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages personas" ON personas
  USING (true) WITH CHECK (true);

-- 3. reply_status enum + reply_logs table
DO $$ BEGIN
  CREATE TYPE reply_status AS ENUM ('PENDING', 'POSTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reply_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  review_id        TEXT NOT NULL UNIQUE,
  review_text      TEXT NOT NULL,
  review_rating    INT  NOT NULL,
  review_language  TEXT NOT NULL,
  generated_reply  TEXT NOT NULL DEFAULT '',
  status           reply_status NOT NULL DEFAULT 'PENDING',
  posted_at        TIMESTAMPTZ,
  error            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_logs_business_id ON reply_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_reply_logs_review_id   ON reply_logs(review_id);

ALTER TABLE reply_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages reply_logs" ON reply_logs
  USING (true) WITH CHECK (true);

-- 4. onboarding_tokens — deeplink tokens from web app to bot
CREATE TABLE IF NOT EXISTS onboarding_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  token            TEXT NOT NULL UNIQUE,
  gmb_account_id   TEXT NOT NULL DEFAULT '',
  gmb_location_id  TEXT NOT NULL DEFAULT '',
  business_name    TEXT NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  used_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_token ON onboarding_tokens(token);

ALTER TABLE onboarding_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages onboarding_tokens" ON onboarding_tokens
  USING (true) WITH CHECK (true);
