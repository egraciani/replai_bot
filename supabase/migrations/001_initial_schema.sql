-- ============================================================
-- autoreplai — Initial Schema Migration
-- ============================================================
-- Supabase (PostgreSQL) schema for the autoreplai SaaS platform.
-- Monitors Google reviews and generates AI responses.
-- ============================================================

-- ===================
-- 1. ENUMS
-- ===================

CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE response_status AS ENUM ('pending', 'approved', 'edited', 'rejected');
CREATE TYPE monitoring_status AS ENUM ('active', 'paused', 'disconnected');

-- ===================
-- 2. TABLES
-- ===================

-- profiles: extends auth.users 1:1
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT,
    avatar_url  TEXT,
    company_name TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- plans: available subscription plans (seed data below)
CREATE TABLE plans (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             plan_type NOT NULL UNIQUE,
    display_name     TEXT NOT NULL,
    max_businesses   INT NOT NULL,
    max_responses_mo INT NOT NULL,  -- -1 = unlimited
    price_cents      INT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- subscriptions: one active subscription per user
CREATE TABLE subscriptions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id              UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status               TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
    responses_used       INT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- businesses: Google Places connected by the user
CREATE TABLE businesses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    google_place_id   TEXT NOT NULL,
    name              TEXT NOT NULL,
    address           TEXT,
    google_rating     NUMERIC(2,1),
    total_reviews     INT DEFAULT 0,
    business_type     TEXT,
    google_types      TEXT[] DEFAULT '{}',
    monitoring_status monitoring_status NOT NULL DEFAULT 'active',
    polling_interval  INTERVAL NOT NULL DEFAULT INTERVAL '1 hour',
    last_fetched_at   TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, google_place_id)
);

-- reviews: Google reviews imported per business
CREATE TABLE reviews (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    google_review_id     TEXT,
    author_name          TEXT NOT NULL,
    author_photo_url     TEXT,
    rating               INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text          TEXT,
    review_language      TEXT,
    google_published_at  TIMESTAMPTZ,
    relative_time_desc   TEXT,
    fetched_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- responses: AI-generated responses to reviews
CREATE TABLE responses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id         UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    generated_text    TEXT NOT NULL,
    final_text        TEXT,
    status            response_status NOT NULL DEFAULT 'pending',
    model_used        TEXT,
    prompt_tokens     INT,
    completion_tokens INT,
    approved_at       TIMESTAMPTZ,
    rejected_at       TIMESTAMPTZ,
    published_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fetch_logs: log of review-fetching operations
CREATE TABLE fetch_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    reviews_found INT DEFAULT 0,
    new_reviews   INT DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'running',
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- 3. INDEXES
-- ===================

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_reviews_business_id ON reviews(business_id);
CREATE INDEX idx_responses_review_id ON responses(review_id);
CREATE INDEX idx_fetch_logs_business_id ON fetch_logs(business_id);

-- Dedup: unique on (business_id, google_review_id) when google_review_id is present
CREATE UNIQUE INDEX idx_reviews_google_review_id
    ON reviews (business_id, google_review_id)
    WHERE google_review_id IS NOT NULL;

-- Dedup: unique on (business_id, author_name, rating, md5(review_text)) when google_review_id is NULL
CREATE UNIQUE INDEX idx_reviews_dedup_fallback
    ON reviews (business_id, author_name, rating, md5(review_text))
    WHERE google_review_id IS NULL;

-- ===================
-- 4. FUNCTIONS & TRIGGERS
-- ===================

-- 4a. Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_plans_updated_at
    BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_businesses_updated_at
    BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_responses_updated_at
    BEFORE UPDATE ON responses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4b. handle_new_user: on auth.users insert → create profile + free subscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id FROM plans WHERE name = 'free';

    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );

    INSERT INTO subscriptions (user_id, plan_id)
    VALUES (NEW.id, free_plan_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4c. update_business_last_fetched: when fetch_log completes → update business
CREATE OR REPLACE FUNCTION update_business_last_fetched()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.completed_at IS NOT NULL THEN
        UPDATE businesses
        SET last_fetched_at = NEW.completed_at
        WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_fetch_log_completed
    AFTER INSERT OR UPDATE ON fetch_logs
    FOR EACH ROW EXECUTE FUNCTION update_business_last_fetched();

-- 4d. increment_responses_used: on new response → bump subscription counter
CREATE OR REPLACE FUNCTION increment_responses_used()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
BEGIN
    SELECT b.user_id INTO owner_id
    FROM reviews r
    JOIN businesses b ON b.id = r.business_id
    WHERE r.id = NEW.review_id;

    UPDATE subscriptions
    SET responses_used = responses_used + 1
    WHERE user_id = owner_id
      AND status = 'active';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_response_inserted
    AFTER INSERT ON responses
    FOR EACH ROW EXECUTE FUNCTION increment_responses_used();

-- 4e. can_generate_response(user_id): check if user has remaining responses
CREATE OR REPLACE FUNCTION can_generate_response(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    max_resp INT;
    used     INT;
BEGIN
    SELECT p.max_responses_mo, s.responses_used
    INTO max_resp, used
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user_id
      AND s.status = 'active';

    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF max_resp = -1 THEN RETURN TRUE; END IF;
    RETURN used < max_resp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4f. can_add_business(user_id): check if user can add another business
CREATE OR REPLACE FUNCTION can_add_business(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    max_biz  INT;
    cur_biz  INT;
BEGIN
    SELECT p.max_businesses
    INTO max_biz
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user_id
      AND s.status = 'active';

    IF NOT FOUND THEN RETURN FALSE; END IF;

    SELECT count(*) INTO cur_biz
    FROM businesses
    WHERE user_id = p_user_id;

    RETURN cur_biz < max_biz;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- 5. ROW LEVEL SECURITY
-- ===================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fetch_logs ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/update only their own profile
CREATE POLICY profiles_select ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- plans: any authenticated user can read plans
CREATE POLICY plans_select ON plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- subscriptions: users can read their own; writes via service_role only
CREATE POLICY subscriptions_select ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- businesses: full CRUD for own businesses
CREATE POLICY businesses_select ON businesses
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY businesses_insert ON businesses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY businesses_update ON businesses
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY businesses_delete ON businesses
    FOR DELETE USING (auth.uid() = user_id);

-- reviews: users can read reviews for their own businesses; inserts via service_role
CREATE POLICY reviews_select ON reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM businesses b
            WHERE b.id = reviews.business_id AND b.user_id = auth.uid()
        )
    );

-- responses: users can read/update responses for their own reviews; inserts via service_role
CREATE POLICY responses_select ON responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reviews r
            JOIN businesses b ON b.id = r.business_id
            WHERE r.id = responses.review_id AND b.user_id = auth.uid()
        )
    );
CREATE POLICY responses_update ON responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM reviews r
            JOIN businesses b ON b.id = r.business_id
            WHERE r.id = responses.review_id AND b.user_id = auth.uid()
        )
    );

-- fetch_logs: users can read logs for their own businesses; inserts via service_role
CREATE POLICY fetch_logs_select ON fetch_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM businesses b
            WHERE b.id = fetch_logs.business_id AND b.user_id = auth.uid()
        )
    );

-- ===================
-- 6. SEED DATA
-- ===================

INSERT INTO plans (name, display_name, max_businesses, max_responses_mo, price_cents) VALUES
    ('free',       'Free',       1,  50, 0),
    ('pro',        'Pro',        5, 500, 2900),
    ('enterprise', 'Enterprise', 50, -1, 9900);

-- ===================
-- 7. REALTIME
-- ===================

ALTER PUBLICATION supabase_realtime ADD TABLE responses;
