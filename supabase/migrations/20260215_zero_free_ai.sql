-- ============================================================================
-- Zero free AI calls: change free-tier limit from 10 to 0
-- Premium users retain 100 calls/day
-- This is a server-side backstop — client guards are the primary defense
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

  -- Free: 0 calls/day, Premium: 100 calls/day
  v_daily_limit := CASE WHEN v_is_premium THEN 100 ELSE 0 END;

  SELECT count(*) INTO v_today_count
  FROM ai_coaching_history
  WHERE user_id = p_user_id
  AND created_at > date_trunc('day', now());

  IF v_today_count >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', v_daily_limit,
      'used', v_today_count,
      'is_premium', v_is_premium,
      'upgrade_needed', NOT v_is_premium
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_daily_limit,
    'used', v_today_count,
    'is_premium', v_is_premium,
    'upgrade_needed', false
  );
END;
$$;
