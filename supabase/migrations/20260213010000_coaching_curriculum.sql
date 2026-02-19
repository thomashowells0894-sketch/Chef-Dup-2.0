-- Lesson curriculum
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week INT NOT NULL,
  day INT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('psychology', 'nutrition', 'behavior', 'fitness', 'mindset')),
  summary TEXT NOT NULL,
  content JSONB NOT NULL, -- { sections: [{ type: 'text'|'tip'|'quiz'|'action', body: string, options?: string[], answer?: number }] }
  duration_minutes INT DEFAULT 3,
  xp_reward INT DEFAULT 50,
  emoji TEXT DEFAULT '📖',
  UNIQUE(week, day)
);
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read lessons" ON lessons FOR SELECT USING (auth.uid() IS NOT NULL);

-- Track user progress
CREATE TABLE IF NOT EXISTS lesson_completions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  quiz_score INT,
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own completions" ON lesson_completions FOR ALL USING (auth.uid() = user_id);

-- Behavioral check-ins
CREATE TABLE IF NOT EXISTS behavioral_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hunger_level INT CHECK (hunger_level BETWEEN 1 AND 5),
  eating_speed TEXT CHECK (eating_speed IN ('rushed', 'moderate', 'mindful')),
  meal_environment TEXT CHECK (meal_environment IN ('desk', 'table', 'couch', 'out', 'car', 'standing')),
  emotional_state TEXT CHECK (emotional_state IN ('happy', 'stressed', 'bored', 'tired', 'social', 'anxious', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE behavioral_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own checkins" ON behavioral_checkins FOR ALL USING (auth.uid() = user_id);
