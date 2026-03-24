-- Persistent mapping: Telegram user <-> Supabase user
CREATE TABLE IF NOT EXISTS public.telegram_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  telegram_first_name TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own link" ON public.telegram_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_links_telegram_user_id
  ON public.telegram_links(telegram_user_id);

-- Temporary codes for account linking (TTL enforced by application)
CREATE TABLE IF NOT EXISTS public.link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own codes" ON public.link_codes
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_link_codes_code ON public.link_codes(code);
