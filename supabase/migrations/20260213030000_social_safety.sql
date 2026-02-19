-- Block list
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Content reports
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'challenge', 'profile', 'message')),
  content_id UUID,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'self_harm', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);
CREATE INDEX idx_content_reports_status ON content_reports(status, created_at);
CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_id);

-- RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can manage their own blocks
CREATE POLICY "blocked_users_select_own" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "blocked_users_insert_own" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocked_users_delete_own" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- Users can create reports and view their own
CREATE POLICY "content_reports_insert" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "content_reports_select_own" ON content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Update social_posts policy to respect blocks
DROP POLICY IF EXISTS "social_posts_select_friends" ON social_posts;
CREATE POLICY "social_posts_select_visible" ON social_posts
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      NOT EXISTS (
        SELECT 1 FROM blocked_users
        WHERE (blocker_id = auth.uid() AND blocked_id = social_posts.user_id)
           OR (blocker_id = social_posts.user_id AND blocked_id = auth.uid())
      )
      AND (
        EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
          AND (
            (requester_id = auth.uid() AND addressee_id = social_posts.user_id)
            OR (addressee_id = auth.uid() AND requester_id = social_posts.user_id)
          )
        )
      )
    )
  );
