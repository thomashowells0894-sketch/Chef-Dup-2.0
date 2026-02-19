-- ============================================================================
-- Premium Subscription Server-Side Gating
-- Ensures premium features are enforced at the database level,
-- not just by client-side RevenueCat checks.
-- ============================================================================

-- Add premium columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_verified_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';

-- ============================================================================
-- Premium verification function
-- Called by Edge Functions / RPC to check premium status server-side
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_premium_access(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium boolean;
  v_verified_at timestamptz;
  v_stale boolean;
BEGIN
  SELECT is_premium, subscription_verified_at
  INTO v_is_premium, v_verified_at
  FROM profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('premium', false, 'reason', 'no_profile');
  END IF;

  -- Check if verification is stale (older than 24 hours)
  v_stale := v_verified_at IS NULL OR v_verified_at < now() - interval '24 hours';

  RETURN jsonb_build_object(
    'premium', COALESCE(v_is_premium, false),
    'verified_at', v_verified_at,
    'stale', v_stale
  );
END;
$$;

-- ============================================================================
-- RLS policy for premium-gated content
-- AI coaching history: only premium users can access historical data beyond 7 days
-- ============================================================================

-- Create AI coaching history table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_coaching_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  prompt text,
  response jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE ai_coaching_history ENABLE ROW LEVEL SECURITY;

-- All users can see their own recent history (7 days)
DROP POLICY IF EXISTS "ai_history_select_recent" ON ai_coaching_history;
CREATE POLICY "ai_history_select_recent" ON ai_coaching_history
  FOR SELECT USING (
    auth.uid() = user_id
    AND (
      created_at > now() - interval '7 days'
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.is_premium = true
      )
    )
  );

-- Only the owner can insert
DROP POLICY IF EXISTS "ai_history_insert_own" ON ai_coaching_history;
CREATE POLICY "ai_history_insert_own" ON ai_coaching_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete
DROP POLICY IF EXISTS "ai_history_delete_own" ON ai_coaching_history;
CREATE POLICY "ai_history_delete_own" ON ai_coaching_history
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Premium AI call limit enforcement
-- Free users: 10 AI calls/day, Premium: 100 AI calls/day
-- ============================================================================
CREATE OR REPLACE FUNCTION check_ai_premium_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium boolean;
  v_daily_limit integer;
  v_today_count integer;
BEGIN
  SELECT COALESCE(is_premium, false) INTO v_is_premium
  FROM profiles WHERE user_id = p_user_id;

  v_daily_limit := CASE WHEN v_is_premium THEN 100 ELSE 10 END;

  SELECT count(*) INTO v_today_count
  FROM ai_coaching_history
  WHERE user_id = p_user_id
  AND created_at > date_trunc('day', now());

  IF v_today_count >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', v_daily_limit,
      'used', v_today_count,
      'premium', v_is_premium,
      'upgrade_needed', NOT v_is_premium
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_daily_limit,
    'used', v_today_count,
    'remaining', v_daily_limit - v_today_count,
    'premium', v_is_premium
  );
END;
$$;

-- Revoke direct access, only allow through RPC
REVOKE ALL ON ai_coaching_history FROM anon;
REVOKE ALL ON ai_coaching_history FROM authenticated;
GRANT SELECT, INSERT, DELETE ON ai_coaching_history TO authenticated;
