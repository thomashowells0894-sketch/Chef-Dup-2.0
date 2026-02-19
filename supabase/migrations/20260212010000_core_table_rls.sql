-- ============================================================================
-- VibeFit Core Table RLS Migration
-- Date: 2026-02-12
-- Purpose: Add Row Level Security to core user data tables (profiles,
--          food_logs, workouts, weight_history, recipes, recipe_ingredients).
--          These tables previously lacked RLS, meaning any authenticated user
--          could query any other user's private health data.
-- Severity: CRITICAL security fix
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE RLS ON ALL CORE TABLES
-- ============================================================================

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: REVOKE ANONYMOUS ACCESS
-- ============================================================================

REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON food_logs FROM anon;
REVOKE ALL ON workouts FROM anon;
REVOKE ALL ON recipes FROM anon;
REVOKE ALL ON recipe_ingredients FROM anon;

-- ============================================================================
-- PART 3: GRANT AUTHENTICATED ACCESS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON food_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_ingredients TO authenticated;

-- ============================================================================
-- PART 4: RLS POLICIES — profiles
-- Users can only read/write their own profile.
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PART 5: RLS POLICIES — food_logs
-- Strictly private: users can only CRUD their own food logs.
-- ============================================================================

DROP POLICY IF EXISTS "food_logs_select_own" ON food_logs;
CREATE POLICY "food_logs_select_own" ON food_logs
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_logs_insert_own" ON food_logs;
CREATE POLICY "food_logs_insert_own" ON food_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_logs_update_own" ON food_logs;
CREATE POLICY "food_logs_update_own" ON food_logs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_logs_delete_own" ON food_logs;
CREATE POLICY "food_logs_delete_own" ON food_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PART 6: RLS POLICIES — workouts
-- Strictly private: users can only CRUD their own workouts.
-- ============================================================================

DROP POLICY IF EXISTS "workouts_select_own" ON workouts;
CREATE POLICY "workouts_select_own" ON workouts
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "workouts_insert_own" ON workouts;
CREATE POLICY "workouts_insert_own" ON workouts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workouts_update_own" ON workouts;
CREATE POLICY "workouts_update_own" ON workouts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workouts_delete_own" ON workouts;
CREATE POLICY "workouts_delete_own" ON workouts
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PART 7: RLS POLICIES — recipes
-- Strictly private: users can only CRUD their own recipes.
-- ============================================================================

DROP POLICY IF EXISTS "recipes_select_own" ON recipes;
CREATE POLICY "recipes_select_own" ON recipes
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recipes_insert_own" ON recipes;
CREATE POLICY "recipes_insert_own" ON recipes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recipes_update_own" ON recipes;
CREATE POLICY "recipes_update_own" ON recipes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recipes_delete_own" ON recipes;
CREATE POLICY "recipes_delete_own" ON recipes
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PART 9: RLS POLICIES — recipe_ingredients
-- Access gated through parent recipe ownership.
-- Users can CRUD ingredients only in their own recipes.
-- ============================================================================

DROP POLICY IF EXISTS "recipe_ingredients_select_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_select_own" ON recipe_ingredients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "recipe_ingredients_insert_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_insert_own" ON recipe_ingredients
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "recipe_ingredients_update_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_update_own" ON recipe_ingredients
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "recipe_ingredients_delete_own" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_delete_own" ON recipe_ingredients
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- ============================================================================
-- PART 10: SERVER-SIDE RATE LIMITING FUNCTION
-- Tracks per-user call counts in a rate_limits table.
-- Called by Edge Functions before forwarding to AI endpoints.
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    action_key      text        NOT NULL,
    call_count      integer     NOT NULL DEFAULT 1,
    window_start    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, action_key)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits FROM anon;

-- Only the service role (Edge Functions) can read/write rate_limits.
-- Authenticated users cannot bypass by querying directly.
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO service_role;

-- Rate limit check function (called from Edge Functions via .rpc())
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id uuid,
    p_action text,
    p_max_calls integer DEFAULT 10,
    p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry rate_limits%ROWTYPE;
    v_now timestamptz := now();
    v_window_start timestamptz := v_now - (p_window_seconds || ' seconds')::interval;
BEGIN
    -- Try to find existing rate limit entry
    SELECT * INTO v_entry
    FROM rate_limits
    WHERE user_id = p_user_id AND action_key = p_action
    FOR UPDATE;

    IF NOT FOUND THEN
        -- First call for this user/action
        INSERT INTO rate_limits (user_id, action_key, call_count, window_start)
        VALUES (p_user_id, p_action, 1, v_now);
        RETURN jsonb_build_object('allowed', true, 'remaining', p_max_calls - 1);
    END IF;

    -- Check if window expired
    IF v_entry.window_start < v_window_start THEN
        -- Reset window
        UPDATE rate_limits
        SET call_count = 1, window_start = v_now
        WHERE id = v_entry.id;
        RETURN jsonb_build_object('allowed', true, 'remaining', p_max_calls - 1);
    END IF;

    -- Check if over limit
    IF v_entry.call_count >= p_max_calls THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'remaining', 0,
            'retry_after_seconds', EXTRACT(EPOCH FROM (v_entry.window_start + (p_window_seconds || ' seconds')::interval - v_now))::integer
        );
    END IF;

    -- Increment counter
    UPDATE rate_limits
    SET call_count = v_entry.call_count + 1
    WHERE id = v_entry.id;

    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_calls - v_entry.call_count - 1);
END;
$$;

-- Cleanup old rate limit entries (run periodically via pg_cron or manually)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
    ON rate_limits (user_id, action_key);
