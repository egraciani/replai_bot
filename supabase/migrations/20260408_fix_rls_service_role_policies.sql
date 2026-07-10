-- ============================================================
-- autoreplai — Fix RLS Policies: Restrict to service_role
-- ============================================================
-- The previous policies used USING (true) WITHOUT specifying a
-- role, which effectively granted public access (anon + authenticated)
-- to these tables. This migration drops those permissive policies
-- and recreates them with TO service_role so only the Supabase
-- service-role key can access them.
--
-- Resolves Supabase security alerts:
--   • rls_disabled_in_public  (personas, reply_logs, onboarding_tokens)
--   • sensitive_columns_exposed (onboarding_tokens.email)
-- ============================================================

-- personas
DROP POLICY IF EXISTS "Service role manages personas" ON personas;
CREATE POLICY "Service role manages personas" ON personas
  TO service_role
  USING (true)
  WITH CHECK (true);

-- reply_logs
DROP POLICY IF EXISTS "Service role manages reply_logs" ON reply_logs;
CREATE POLICY "Service role manages reply_logs" ON reply_logs
  TO service_role
  USING (true)
  WITH CHECK (true);

-- onboarding_tokens
DROP POLICY IF EXISTS "Service role manages onboarding_tokens" ON onboarding_tokens;
CREATE POLICY "Service role manages onboarding_tokens" ON onboarding_tokens
  TO service_role
  USING (true)
  WITH CHECK (true);
