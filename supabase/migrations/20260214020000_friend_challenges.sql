-- Friend 1v1 Challenges
CREATE TABLE IF NOT EXISTS public.friend_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_name TEXT,
  challenged_name TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('calories', 'protein', 'streak', 'logging')),
  target NUMERIC NOT NULL DEFAULT 0,
  challenger_progress NUMERIC NOT NULL DEFAULT 0,
  challenged_progress NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  winner_id UUID REFERENCES auth.users(id),
  xp_reward INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.friend_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges" ON public.friend_challenges
  FOR SELECT USING (
    auth.uid() = challenger_user_id OR auth.uid() = challenged_user_id
  );

CREATE POLICY "Users can create challenges" ON public.friend_challenges
  FOR INSERT WITH CHECK (auth.uid() = challenger_user_id);

CREATE POLICY "Participants can update challenges" ON public.friend_challenges
  FOR UPDATE USING (
    auth.uid() = challenger_user_id OR auth.uid() = challenged_user_id
  );

CREATE INDEX idx_friend_challenges_users ON public.friend_challenges(challenger_user_id, challenged_user_id);
CREATE INDEX idx_friend_challenges_status ON public.friend_challenges(status);
