-- ============================================================================
-- VibeFit Social Enhancements Migration
-- Date: 2026-02-13
-- Purpose: Add reactions (replacing simple likes), team challenges, friend
--          activity log, and leaderboard opt-in. Includes RLS policies,
--          indexes, and trigger functions.
-- ============================================================================


-- ============================================================================
-- PART 1: REACTIONS TABLE (replaces simple likes for richer engagement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fire', 'clap', 'flex', 'heart')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE social_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reactions (needed for reaction counts)
DROP POLICY IF EXISTS "Anyone can view reactions" ON social_reactions;
CREATE POLICY "Anyone can view reactions" ON social_reactions
  FOR SELECT
  USING (true);

-- Users can only manage their own reactions (insert, update, delete)
DROP POLICY IF EXISTS "Users can manage own reactions" ON social_reactions;
CREATE POLICY "Users can manage own reactions" ON social_reactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for reactions
CREATE INDEX IF NOT EXISTS idx_social_reactions_post_id
  ON social_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_social_reactions_user_id
  ON social_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_social_reactions_post_type
  ON social_reactions (post_id, reaction_type);

-- Grant permissions
REVOKE ALL ON social_reactions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_reactions TO authenticated;


-- ============================================================================
-- PART 2: TEAM CHALLENGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS challenge_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE challenge_teams ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view teams (needed for team leaderboard)
DROP POLICY IF EXISTS "Authenticated users can view teams" ON challenge_teams;
CREATE POLICY "Authenticated users can view teams" ON challenge_teams
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can create teams (must be the creator)
DROP POLICY IF EXISTS "Users can create teams" ON challenge_teams;
CREATE POLICY "Users can create teams" ON challenge_teams
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Team creator can update their team
DROP POLICY IF EXISTS "Creator can update team" ON challenge_teams;
CREATE POLICY "Creator can update team" ON challenge_teams
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Team creator can delete their team
DROP POLICY IF EXISTS "Creator can delete team" ON challenge_teams;
CREATE POLICY "Creator can delete team" ON challenge_teams
  FOR DELETE
  USING (auth.uid() = created_by);

-- Indexes for teams
CREATE INDEX IF NOT EXISTS idx_challenge_teams_challenge_id
  ON challenge_teams (challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_teams_created_by
  ON challenge_teams (created_by);

-- Grant permissions
REVOKE ALL ON challenge_teams FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_teams TO authenticated;

-- Add team_id column to challenge_participants (nullable FK to challenge_teams)
ALTER TABLE challenge_participants
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES challenge_teams(id);

-- Index on the new team_id column
CREATE INDEX IF NOT EXISTS idx_challenge_participants_team_id
  ON challenge_participants (team_id)
  WHERE team_id IS NOT NULL;


-- ============================================================================
-- PART 3: FRIEND ACTIVITY LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE friend_activity ENABLE ROW LEVEL SECURITY;

-- Friends can see each other's activity. A user can always see their own.
DROP POLICY IF EXISTS "Friends can see activity" ON friend_activity;
CREATE POLICY "Friends can see activity" ON friend_activity
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted' AND (
        (requester_id = auth.uid() AND addressee_id = friend_activity.user_id) OR
        (addressee_id = auth.uid() AND requester_id = friend_activity.user_id)
      )
    )
  );

-- Users can only create their own activity entries
DROP POLICY IF EXISTS "Users can create own activity" ON friend_activity;
CREATE POLICY "Users can create own activity" ON friend_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own activity entries
DROP POLICY IF EXISTS "Users can delete own activity" ON friend_activity;
CREATE POLICY "Users can delete own activity" ON friend_activity
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for friend activity
CREATE INDEX IF NOT EXISTS idx_friend_activity_user_id
  ON friend_activity (user_id);
CREATE INDEX IF NOT EXISTS idx_friend_activity_created_at
  ON friend_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activity_user_created
  ON friend_activity (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activity_type
  ON friend_activity (activity_type);

-- Grant permissions
REVOKE ALL ON friend_activity FROM anon;
GRANT SELECT, INSERT, DELETE ON friend_activity TO authenticated;


-- ============================================================================
-- PART 4: LEADERBOARD OPT-IN
-- ============================================================================

-- Add leaderboard_visible flag to profiles (default true = opted in)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS leaderboard_visible BOOLEAN NOT NULL DEFAULT true;

-- Add previous_rank for tracking position changes
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS previous_rank INTEGER;

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_visible
  ON profiles (leaderboard_visible)
  WHERE leaderboard_visible = true;


-- ============================================================================
-- PART 5: TRIGGER FOR REACTION COUNTS ON SOCIAL POSTS
-- ============================================================================

-- We reuse the existing likes_count column on social_posts to also reflect
-- total reactions. This trigger increments/decrements likes_count when
-- reactions are added/removed.

CREATE OR REPLACE FUNCTION fn_update_reaction_count()
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
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reaction type changed, count stays the same
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_reactions_count ON social_reactions;
CREATE TRIGGER trg_social_reactions_count
  AFTER INSERT OR DELETE ON social_reactions
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_reaction_count();
