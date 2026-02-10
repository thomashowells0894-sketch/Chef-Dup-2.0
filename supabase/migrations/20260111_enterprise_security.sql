-- ============================================================================
-- VibeFit Enterprise Security & Scale Migration
-- Date: 2026-01-11
-- Purpose: Add indexes for 100M+ scale and harden RLS policies
-- ============================================================================

-- ============================================================================
-- PART 1: PERFORMANCE INDEXES
-- These indexes ensure O(log n) query performance even with millions of rows
-- ============================================================================

-- Index for food_logs: Most queries filter by user_id and date
-- This composite index covers the most common query pattern
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date
ON food_logs(user_id, date DESC);

-- Index for food_logs: Quick lookup by user_id alone
CREATE INDEX IF NOT EXISTS idx_food_logs_user_id
ON food_logs(user_id);

-- Index for food_logs: Date-based queries (e.g., weekly stats)
CREATE INDEX IF NOT EXISTS idx_food_logs_date
ON food_logs(date DESC);

-- Index for workouts: Same pattern as food_logs
CREATE INDEX IF NOT EXISTS idx_workouts_user_date
ON workouts(user_id, date DESC);

-- Index for workouts: Quick lookup by user_id alone
CREATE INDEX IF NOT EXISTS idx_workouts_user_id
ON workouts(user_id);

-- Index for profiles: Primary lookup by user_id (already PK, but explicit)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
ON profiles(id);

-- ============================================================================
-- PART 2: ROW LEVEL SECURITY (RLS) - STRICT MODE
-- Bank-grade security: Users can ONLY access their own data
-- ============================================================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Drop existing policies to recreate with strict rules
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- SELECT: Users can ONLY view their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- INSERT: Users can ONLY insert their own profile (with matching ID)
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- UPDATE: Users can ONLY update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- DELETE: Users can delete their own profile (for account deletion)
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- ============================================================================
-- FOOD_LOGS TABLE POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can insert own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can update own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can delete own food logs" ON food_logs;
DROP POLICY IF EXISTS "food_logs_select_own" ON food_logs;
DROP POLICY IF EXISTS "food_logs_insert_own" ON food_logs;
DROP POLICY IF EXISTS "food_logs_update_own" ON food_logs;
DROP POLICY IF EXISTS "food_logs_delete_own" ON food_logs;

-- SELECT: Users can ONLY view their own food logs
CREATE POLICY "food_logs_select_own" ON food_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Users can ONLY insert logs with their own user_id
CREATE POLICY "food_logs_insert_own" ON food_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can ONLY update their own logs
CREATE POLICY "food_logs_update_own" ON food_logs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can ONLY delete their own logs
CREATE POLICY "food_logs_delete_own" ON food_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- WORKOUTS TABLE POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;
DROP POLICY IF EXISTS "workouts_select_own" ON workouts;
DROP POLICY IF EXISTS "workouts_insert_own" ON workouts;
DROP POLICY IF EXISTS "workouts_update_own" ON workouts;
DROP POLICY IF EXISTS "workouts_delete_own" ON workouts;

-- SELECT: Users can ONLY view their own workouts
CREATE POLICY "workouts_select_own" ON workouts
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Users can ONLY insert workouts with their own user_id
CREATE POLICY "workouts_insert_own" ON workouts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can ONLY update their own workouts
CREATE POLICY "workouts_update_own" ON workouts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can ONLY delete their own workouts
CREATE POLICY "workouts_delete_own" ON workouts
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PART 3: SECURITY HARDENING
-- ============================================================================

-- Revoke all public access (defense in depth)
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON food_logs FROM anon;
REVOKE ALL ON workouts FROM anon;

-- Grant only necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON food_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workouts TO authenticated;

-- ============================================================================
-- PART 4: QUERY OPTIMIZATION VIEWS (Optional - for analytics)
-- ============================================================================

-- Create a materialized view for daily stats (can be refreshed periodically)
-- This prevents expensive aggregations on the main table
CREATE OR REPLACE VIEW user_daily_stats AS
SELECT
    user_id,
    date,
    SUM(CASE WHEN is_water = false THEN calories ELSE 0 END) as total_calories,
    SUM(CASE WHEN is_water = false THEN protein ELSE 0 END) as total_protein,
    SUM(CASE WHEN is_water = false THEN carbs ELSE 0 END) as total_carbs,
    SUM(CASE WHEN is_water = false THEN fat ELSE 0 END) as total_fat,
    SUM(CASE WHEN is_water = true THEN 1 ELSE 0 END) as water_count,
    COUNT(*) as entry_count
FROM food_logs
GROUP BY user_id, date;

-- Enable RLS on the view
ALTER VIEW user_daily_stats SET (security_invoker = on);

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify policies are working)
-- ============================================================================

-- Test 1: This should return policies for all tables
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- Test 2: This should show indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename IN ('food_logs', 'workouts', 'profiles');

-- ============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ============================================================================
-- 1. Run ANALYZE after creating indexes: ANALYZE food_logs; ANALYZE workouts;
-- 2. Monitor query performance with: EXPLAIN ANALYZE SELECT ...
-- 3. Consider partitioning food_logs by date for 100M+ rows
-- 4. Set up connection pooling (PgBouncer) for high concurrency
-- 5. Enable pg_stat_statements for query performance monitoring
