-- ==========================================================================
-- Analytics Pipeline Tables
-- ==========================================================================

-- Core analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  category text NOT NULL,
  action text NOT NULL,
  label text,
  value numeric,
  metadata jsonb DEFAULT '{}',
  screen_name text,
  device_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for querying by user and time (most common pattern: "show me my recent events")
CREATE INDEX IF NOT EXISTS idx_analytics_user_time
  ON analytics_events(user_id, created_at DESC);

-- Index for category-based analysis (e.g. "all conversion events last week")
CREATE INDEX IF NOT EXISTS idx_analytics_category
  ON analytics_events(category, action);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own events"
  ON analytics_events
  FOR SELECT
  USING (auth.uid() = user_id);


-- ==========================================================================
-- Feature usage aggregate table (for fast lookups without scanning events)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS feature_usage (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  use_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);

ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own usage"
  ON feature_usage
  FOR ALL
  USING (auth.uid() = user_id);


-- ==========================================================================
-- RPC: Atomic increment for feature usage (avoids race conditions)
-- ==========================================================================

CREATE OR REPLACE FUNCTION increment_feature_usage(
  p_user_id uuid,
  p_feature text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO feature_usage (user_id, feature, use_count, last_used_at)
  VALUES (p_user_id, p_feature, 1, now())
  ON CONFLICT (user_id, feature)
  DO UPDATE SET
    use_count = feature_usage.use_count + 1,
    last_used_at = now();
END;
$$;
