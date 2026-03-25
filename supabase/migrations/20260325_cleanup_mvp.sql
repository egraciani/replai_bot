-- ============================================================
-- autoreplai — MVP Cleanup Migration
-- ============================================================
-- Removes unused tables, columns, functions and triggers
-- to simplify the schema for the Telegram-first MVP.
-- ============================================================

-- 1. Drop trigger that depends on fetch_logs
DROP TRIGGER IF EXISTS trg_fetch_log_completed ON fetch_logs;
DROP FUNCTION IF EXISTS update_business_last_fetched();

-- 2. Drop fetch_logs table (includes its index and RLS policies)
DROP TABLE IF EXISTS fetch_logs;

-- 3. Drop unused columns from businesses
ALTER TABLE businesses
  DROP COLUMN IF EXISTS monitoring_status,
  DROP COLUMN IF EXISTS polling_interval,
  DROP COLUMN IF EXISTS business_type,
  DROP COLUMN IF EXISTS google_types,
  DROP COLUMN IF EXISTS google_rating,
  DROP COLUMN IF EXISTS total_reviews,
  DROP COLUMN IF EXISTS last_fetched_at;

-- 4. Drop monitoring_status enum type (no longer referenced)
DROP TYPE IF EXISTS monitoring_status;

-- 5. Drop unused function
DROP FUNCTION IF EXISTS can_add_business(UUID);
