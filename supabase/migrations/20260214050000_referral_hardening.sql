-- Referral hardening: expiration, rate limiting, and indexing

-- 1. Add expires_at column with 30-day default
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days');

-- 2. Index on referral_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals (referral_code);

-- 3. Update validate_referral() to check expiration and rate limit submissions
CREATE OR REPLACE FUNCTION validate_referral(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_count INTEGER;
  v_recent_submissions INTEGER;
BEGIN
  -- Rate limit: max 5 referral code submissions per hour per user
  SELECT COUNT(*) INTO v_recent_submissions
  FROM public.referrals
  WHERE referred_user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_submissions >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many referral attempts. Please try again later.');
  END IF;

  -- Find referrer by code
  SELECT id INTO v_referrer_id
  FROM auth.users
  WHERE raw_user_meta_data->>'referral_code' = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_user_id = v_referrer_id AND referred_user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already referred');
  END IF;

  -- Count existing non-expired, non-rejected referrals (cap at 50)
  SELECT COUNT(*) INTO v_referral_count
  FROM public.referrals
  WHERE referrer_user_id = v_referrer_id
    AND status != 'rejected'
    AND expires_at > NOW();

  IF v_referral_count >= 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral limit reached');
  END IF;

  -- Create referral record with 30-day expiration
  INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status, validated_at, expires_at)
  VALUES (v_referrer_id, auth.uid(), p_referral_code, 'validated', NOW(), NOW() + INTERVAL '30 days');

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;
