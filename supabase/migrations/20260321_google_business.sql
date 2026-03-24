-- Google Business Profile integration tables

-- Stores encrypted OAuth tokens for Google Business API access
CREATE TABLE IF NOT EXISTS public.google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tokens" ON public.google_tokens;
CREATE POLICY "Users manage own tokens" ON public.google_tokens FOR ALL USING (auth.uid() = user_id);

-- Add Google Business columns to existing businesses table if missing
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS google_account_id TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS google_location_id TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_user_id_google_location_id_key'
  ) THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_user_id_google_location_id_key UNIQUE (user_id, google_location_id);
  END IF;
END $$;

-- Ensure RLS is enabled and policy exists
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own businesses" ON public.businesses;
CREATE POLICY "Users manage own businesses" ON public.businesses FOR ALL USING (auth.uid() = user_id);
