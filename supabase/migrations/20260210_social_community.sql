-- ============================================================================
-- FuelIQ Social & Community Features Migration
-- Date: 2026-02-09
-- Purpose: Create all tables needed for social feed, challenges, friendships,
--          journaling, and public profiles. Includes RLS policies, indexes,
--          and trigger functions for denormalized counters.
-- ============================================================================

-- ============================================================================
-- PART 1: TABLE CREATION
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. user_public_profiles
-- Public-facing profile data for social features (display names, avatars).
-- The hooks (useSocialFeed, useFriends, useChallenges) currently join to
-- the existing "profiles" table. This table serves as an additional public
-- profile layer for social discovery.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_public_profiles (
    id              uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    display_name    text,
    avatar_url      text,
    bio             text,
    is_public       boolean     NOT NULL DEFAULT true,
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 2. social_posts
-- Community feed posts: achievements, workouts, milestones, progress, meals.
-- The hook uses "content" for the post body and joins related likes/comments.
-- We include both "title" and "body" from the spec, plus "content" as the
-- column the hook actually writes/reads, for full compatibility.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_posts (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    type            text        CHECK (type IN ('achievement', 'workout', 'milestone', 'progress', 'meal')),
    title           text,
    body            text,
    content         text,
    metadata        jsonb       NOT NULL DEFAULT '{}',
    image_url       text,
    likes_count     integer     NOT NULL DEFAULT 0,
    comments_count  integer     NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3. social_likes
-- Like toggle for social posts. Unique per (post, user) pair.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_likes (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid        NOT NULL REFERENCES social_posts ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);

-- --------------------------------------------------------------------------
-- 4. social_comments
-- Comments on social posts. The hook inserts with "content" column.
-- We include both "body" (from spec) and "content" (from hook) for compat.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_comments (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid        NOT NULL REFERENCES social_posts ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    body            text,
    content         text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT social_comments_has_text CHECK (body IS NOT NULL OR content IS NOT NULL)
);

-- --------------------------------------------------------------------------
-- 5. challenges
-- Community challenges / competitions. The hook uses "goal" (numeric),
-- "status" (text), "max_participants", and "reward_xp" columns in addition
-- to the spec columns. We include everything.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenges (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id          uuid        REFERENCES auth.users ON DELETE SET NULL,
    title               text        NOT NULL,
    description         text,
    type                text        NOT NULL,
    target_value        numeric     NOT NULL DEFAULT 0,
    goal                numeric     NOT NULL DEFAULT 0,
    start_date          timestamptz NOT NULL,
    end_date            timestamptz NOT NULL,
    is_public           boolean     NOT NULL DEFAULT true,
    status              text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    max_participants    integer     DEFAULT 50,
    reward_xp           integer     DEFAULT 100,
    participants_count  integer     NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 6. challenge_participants
-- Tracks who joined which challenge and their progress.
-- The hook uses "status" (active/completed) and "updated_at", "completed_at".
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenge_participants (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id    uuid        NOT NULL REFERENCES challenges ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    progress        numeric     NOT NULL DEFAULT 0,
    completed       boolean     NOT NULL DEFAULT false,
    status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    joined_at       timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz,
    UNIQUE (challenge_id, user_id)
);

-- --------------------------------------------------------------------------
-- 7. friendships
-- Bidirectional friend requests: pending -> accepted / declined.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS friendships (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    addressee_id    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

-- --------------------------------------------------------------------------
-- 8. journal_entries
-- Wellness journaling. The hook uses "date" (text/date), "content" (text),
-- "mood" (integer 1-10), "tags" (text[]), "prompt", and "category".
-- We include both the spec columns and the hook columns for compatibility.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    date            date        NOT NULL DEFAULT CURRENT_DATE,
    prompt          text,
    body            text,
    content         text,
    mood            integer     CHECK (mood >= 1 AND mood <= 10),
    tags            text[]      NOT NULL DEFAULT '{}',
    category        text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journal_entries_has_text CHECK (body IS NOT NULL OR content IS NOT NULL)
);


-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

-- user_public_profiles
CREATE INDEX IF NOT EXISTS idx_user_public_profiles_display_name
    ON user_public_profiles (display_name);

-- social_posts
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id
    ON social_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at
    ON social_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_type
    ON social_posts (type);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created
    ON social_posts (user_id, created_at DESC);

-- social_likes
CREATE INDEX IF NOT EXISTS idx_social_likes_post_id
    ON social_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_user_id
    ON social_likes (user_id);

-- social_comments
CREATE INDEX IF NOT EXISTS idx_social_comments_post_id
    ON social_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_user_id
    ON social_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_created_at
    ON social_comments (created_at DESC);

-- challenges
CREATE INDEX IF NOT EXISTS idx_challenges_creator_id
    ON challenges (creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status
    ON challenges (status);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date
    ON challenges (end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_created_at
    ON challenges (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_public_active
    ON challenges (is_public, status) WHERE is_public = true AND status = 'active';

-- challenge_participants
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id
    ON challenge_participants (challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id
    ON challenge_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_status
    ON challenge_participants (status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_progress
    ON challenge_participants (challenge_id, progress DESC);

-- friendships
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id
    ON friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id
    ON friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status
    ON friendships (status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester_status
    ON friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status
    ON friendships (addressee_id, status);

-- journal_entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id
    ON journal_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date
    ON journal_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date
    ON journal_entries (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at
    ON journal_entries (created_at DESC);


-- ============================================================================
-- PART 3: TRIGGER FUNCTIONS FOR DENORMALIZED COUNTERS
-- ============================================================================

-- --------------------------------------------------------------------------
-- Likes counter: increment/decrement social_posts.likes_count
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts
           SET likes_count = likes_count + 1
         WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE social_posts
           SET likes_count = GREATEST(likes_count - 1, 0)
         WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_likes_count ON social_likes;
CREATE TRIGGER trg_social_likes_count
    AFTER INSERT OR DELETE ON social_likes
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_likes_count();

-- --------------------------------------------------------------------------
-- Comments counter: increment/decrement social_posts.comments_count
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts
           SET comments_count = comments_count + 1
         WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE social_posts
           SET comments_count = GREATEST(comments_count - 1, 0)
         WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_comments_count ON social_comments;
CREATE TRIGGER trg_social_comments_count
    AFTER INSERT OR DELETE ON social_comments
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_comments_count();

-- --------------------------------------------------------------------------
-- Participants counter: increment/decrement challenges.participants_count
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_participants_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE challenges
           SET participants_count = participants_count + 1
         WHERE id = NEW.challenge_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE challenges
           SET participants_count = GREATEST(participants_count - 1, 0)
         WHERE id = OLD.challenge_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenge_participants_count ON challenge_participants;
CREATE TRIGGER trg_challenge_participants_count
    AFTER INSERT OR DELETE ON challenge_participants
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_participants_count();

-- --------------------------------------------------------------------------
-- Auto-update updated_at on user_public_profiles
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_public_profiles_updated_at ON user_public_profiles;
CREATE TRIGGER trg_user_public_profiles_updated_at
    BEFORE UPDATE ON user_public_profiles
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================================
-- PART 4: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE user_public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_likes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships           ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries       ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- PART 5: RLS POLICIES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 5a. user_public_profiles
-- Anyone authenticated can read public profiles. Users manage their own.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_public_profiles_select_public" ON user_public_profiles;
CREATE POLICY "user_public_profiles_select_public" ON user_public_profiles
    FOR SELECT
    USING (is_public = true OR auth.uid() = id);

DROP POLICY IF EXISTS "user_public_profiles_insert_own" ON user_public_profiles;
CREATE POLICY "user_public_profiles_insert_own" ON user_public_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_public_profiles_update_own" ON user_public_profiles;
CREATE POLICY "user_public_profiles_update_own" ON user_public_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_public_profiles_delete_own" ON user_public_profiles;
CREATE POLICY "user_public_profiles_delete_own" ON user_public_profiles
    FOR DELETE
    USING (auth.uid() = id);

-- --------------------------------------------------------------------------
-- 5b. social_posts
-- All authenticated users can read all posts (public feed).
-- Users can only create/update/delete their own posts.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "social_posts_select_all" ON social_posts;
CREATE POLICY "social_posts_select_all" ON social_posts
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "social_posts_insert_own" ON social_posts;
CREATE POLICY "social_posts_insert_own" ON social_posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_posts_update_own" ON social_posts;
CREATE POLICY "social_posts_update_own" ON social_posts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_posts_delete_own" ON social_posts;
CREATE POLICY "social_posts_delete_own" ON social_posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 5c. social_likes
-- All authenticated users can read likes (for like counts / "is liked" check).
-- Users can only create/delete their own likes.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "social_likes_select_all" ON social_likes;
CREATE POLICY "social_likes_select_all" ON social_likes
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "social_likes_insert_own" ON social_likes;
CREATE POLICY "social_likes_insert_own" ON social_likes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_likes_delete_own" ON social_likes;
CREATE POLICY "social_likes_delete_own" ON social_likes
    FOR DELETE
    USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 5d. social_comments
-- All authenticated users can read comments on any post.
-- Users can only create/update/delete their own comments.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "social_comments_select_all" ON social_comments;
CREATE POLICY "social_comments_select_all" ON social_comments
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "social_comments_insert_own" ON social_comments;
CREATE POLICY "social_comments_insert_own" ON social_comments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_comments_update_own" ON social_comments;
CREATE POLICY "social_comments_update_own" ON social_comments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_comments_delete_own" ON social_comments;
CREATE POLICY "social_comments_delete_own" ON social_comments
    FOR DELETE
    USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 5e. challenges
-- All authenticated users can read public/active challenges.
-- Creators can update/delete their own challenges.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "challenges_select_public" ON challenges;
CREATE POLICY "challenges_select_public" ON challenges
    FOR SELECT
    USING (is_public = true OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "challenges_insert_own" ON challenges;
CREATE POLICY "challenges_insert_own" ON challenges
    FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "challenges_update_own" ON challenges;
CREATE POLICY "challenges_update_own" ON challenges
    FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "challenges_delete_own" ON challenges;
CREATE POLICY "challenges_delete_own" ON challenges
    FOR DELETE
    USING (auth.uid() = creator_id);

-- --------------------------------------------------------------------------
-- 5f. challenge_participants
-- Participants of a challenge can see the leaderboard (all participants).
-- Users can only insert/update/delete their own participation rows.
-- Read access is open so leaderboards work for all authenticated users.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "challenge_participants_select_all" ON challenge_participants;
CREATE POLICY "challenge_participants_select_all" ON challenge_participants
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "challenge_participants_insert_own" ON challenge_participants;
CREATE POLICY "challenge_participants_insert_own" ON challenge_participants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "challenge_participants_update_own" ON challenge_participants;
CREATE POLICY "challenge_participants_update_own" ON challenge_participants
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "challenge_participants_delete_own" ON challenge_participants;
CREATE POLICY "challenge_participants_delete_own" ON challenge_participants
    FOR DELETE
    USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 5g. friendships
-- Users can see friendships they are part of (either side).
-- Users can insert requests where they are the requester.
-- Users can update requests where they are the addressee (accept/decline).
-- Either party can delete (unfriend / cancel request).
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "friendships_select_own" ON friendships;
CREATE POLICY "friendships_select_own" ON friendships
    FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "friendships_insert_own" ON friendships;
CREATE POLICY "friendships_insert_own" ON friendships
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "friendships_update_addressee" ON friendships;
CREATE POLICY "friendships_update_addressee" ON friendships
    FOR UPDATE
    USING (auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = addressee_id);

DROP POLICY IF EXISTS "friendships_delete_own" ON friendships;
CREATE POLICY "friendships_delete_own" ON friendships
    FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- --------------------------------------------------------------------------
-- 5h. journal_entries
-- Strictly private: users can only CRUD their own journal entries.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "journal_entries_select_own" ON journal_entries;
CREATE POLICY "journal_entries_select_own" ON journal_entries
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries_insert_own" ON journal_entries;
CREATE POLICY "journal_entries_insert_own" ON journal_entries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries_update_own" ON journal_entries;
CREATE POLICY "journal_entries_update_own" ON journal_entries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries_delete_own" ON journal_entries;
CREATE POLICY "journal_entries_delete_own" ON journal_entries
    FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================================
-- PART 6: SECURITY HARDENING
-- ============================================================================

-- Revoke all anonymous access
REVOKE ALL ON user_public_profiles  FROM anon;
REVOKE ALL ON social_posts          FROM anon;
REVOKE ALL ON social_likes          FROM anon;
REVOKE ALL ON social_comments       FROM anon;
REVOKE ALL ON challenges            FROM anon;
REVOKE ALL ON challenge_participants FROM anon;
REVOKE ALL ON friendships           FROM anon;
REVOKE ALL ON journal_entries       FROM anon;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_public_profiles  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_posts          TO authenticated;
GRANT SELECT, INSERT, DELETE         ON social_likes          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_comments       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON challenges            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON friendships           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries       TO authenticated;
