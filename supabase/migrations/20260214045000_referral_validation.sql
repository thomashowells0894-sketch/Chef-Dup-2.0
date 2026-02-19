-- Referral tracking and validation
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rewarded', 'rejected')),
  reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  UNIQUE(referrer_user_id, referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "System can insert referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_user_id);

-- Function to validate and reward referrals
CREATE OR REPLACE FUNCTION validate_referral(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_count INTEGER;
BEGIN
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

  -- Count existing referrals (cap at 50)
  SELECT COUNT(*) INTO v_referral_count
  FROM public.referrals
  WHERE referrer_user_id = v_referrer_id AND status != 'rejected';

  IF v_referral_count >= 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral limit reached');
  END IF;

  -- Create referral record
  INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status, validated_at)
  VALUES (v_referrer_id, auth.uid(), p_referral_code, 'validated', NOW());

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;
