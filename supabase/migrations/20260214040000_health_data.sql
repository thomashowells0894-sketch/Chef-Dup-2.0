CREATE TABLE IF NOT EXISTS health_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  steps integer,
  active_calories integer,
  resting_hr integer,
  hrv_avg real,
  sleep_minutes integer,
  deep_sleep_minutes integer,
  rem_sleep_minutes integer,
  light_sleep_minutes integer,
  vo2_max real,
  spo2_avg real,
  respiratory_rate real,
  recovery_score integer,
  strain_score real,
  source text DEFAULT 'apple_health',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE health_snapshots ENABLE ROW LEVEL SECURITY;
-- user can only read/write own data
CREATE POLICY "health_own" ON health_snapshots
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_health_user_date ON health_snapshots(user_id, date DESC);
