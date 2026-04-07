-- ============================================================
-- autoreplai — Service Tiers Migration
-- ============================================================
-- Adds service_tier enum and columns for manual/manager/automated tiers.
-- ============================================================

-- 1. service_tier enum
DO $$ BEGIN
  CREATE TYPE service_tier AS ENUM ('manual', 'manager', 'automated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add service_tier + user_rating_count to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS service_tier   service_tier NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS user_rating_count INT;

-- 3. Add review_author + ops_posted_by to reply_logs
ALTER TABLE reply_logs
  ADD COLUMN IF NOT EXISTS review_author  TEXT,
  ADD COLUMN IF NOT EXISTS ops_posted_by  TEXT;

-- 4. Extend reply_status enum with MANUAL value
ALTER TYPE reply_status ADD VALUE IF NOT EXISTS 'MANUAL';
