-- ============================================================================
-- FuelIQ Security Hardening Migration
-- Date: 2026-02-11
-- Purpose: Fix overly permissive RLS policies on social_posts and
--          challenge_participants. Posts are now only visible to the author's
--          friends (accepted friendships) or to the author themselves.
--          Challenge participants are scoped to members of the same challenge.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Fix social_posts SELECT policy
--    Previously: USING (true) — any authenticated user could see ALL posts
--    Now: Users see their own posts + posts from accepted friends only
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "social_posts_select_all" ON social_posts;
CREATE POLICY "social_posts_select_friends" ON social_posts
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM friendships
            WHERE status = 'accepted'
            AND (
                (requester_id = auth.uid() AND addressee_id = social_posts.user_id)
                OR (addressee_id = auth.uid() AND requester_id = social_posts.user_id)
            )
        )
    );

-- --------------------------------------------------------------------------
-- 2. Fix challenge_participants SELECT policy
--    Previously: USING (true) — any user could see all participant progress
--    Now: Only participants of the same challenge can see each other,
--         OR the challenge creator can see all participants
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "challenge_participants_select_all" ON challenge_participants;
CREATE POLICY "challenge_participants_select_members" ON challenge_participants
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM challenge_participants cp2
            WHERE cp2.challenge_id = challenge_participants.challenge_id
            AND cp2.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM challenges
            WHERE challenges.id = challenge_participants.challenge_id
            AND challenges.creator_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- 3. Enforce server-side timestamps on challenge_participants
--    Prevent clients from spoofing joined_at or completed_at
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_enforce_participant_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.joined_at = now();
        NEW.updated_at = now();
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.joined_at = OLD.joined_at;  -- Cannot change join date
        NEW.updated_at = now();
        IF NEW.completed = true AND OLD.completed = false THEN
            NEW.completed_at = now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_participant_timestamps ON challenge_participants;
CREATE TRIGGER trg_enforce_participant_timestamps
    BEFORE INSERT OR UPDATE ON challenge_participants
    FOR EACH ROW
    EXECUTE FUNCTION fn_enforce_participant_timestamps();

-- --------------------------------------------------------------------------
-- 4. Enforce server-side timestamps on social_posts
--    Prevent clients from spoofing created_at
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_enforce_post_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_post_timestamps ON social_posts;
CREATE TRIGGER trg_enforce_post_timestamps
    BEFORE INSERT ON social_posts
    FOR EACH ROW
    EXECUTE FUNCTION fn_enforce_post_timestamps();
