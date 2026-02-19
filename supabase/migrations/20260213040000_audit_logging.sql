-- Immutable server-side audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Make immutable: prevent UPDATE and DELETE
CREATE OR REPLACE FUNCTION prevent_audit_modification() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries cannot be modified or deleted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_no_update ON audit_log;
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
DROP TRIGGER IF EXISTS audit_no_delete ON audit_log;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Index for querying
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at DESC);

-- RLS: users can only see their own audit entries
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own audit log" ON audit_log;
CREATE POLICY "Users can view own audit log" ON audit_log FOR SELECT USING (auth.uid() = user_id);
-- Only service_role can INSERT (from Edge Functions)
DROP POLICY IF EXISTS "Service role can insert" ON audit_log;
CREATE POLICY "Service role can insert" ON audit_log FOR INSERT WITH CHECK (true);

-- Helper function for Edge Functions to log audit entries
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-cleanup: entries older than 1 year
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS VOID AS $$
BEGIN
  -- Only delete entries older than 365 days (HIPAA: 6-year retention recommended, but 1 year for non-PHI)
  DELETE FROM audit_log WHERE created_at < now() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nonce deduplication table for replay prevention
CREATE TABLE IF NOT EXISTS request_nonces (
  nonce TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-cleanup nonces older than 10 minutes
CREATE OR REPLACE FUNCTION cleanup_nonces() RETURNS VOID AS $$
BEGIN
  DELETE FROM request_nonces WHERE created_at < now() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Session tracking for concurrent session limits
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sessions" ON active_sessions;
CREATE POLICY "Users manage own sessions" ON active_sessions FOR ALL USING (auth.uid() = user_id);

-- Enforce max 3 concurrent sessions
CREATE OR REPLACE FUNCTION enforce_session_limit() RETURNS TRIGGER AS $$
DECLARE
  session_count INT;
BEGIN
  SELECT COUNT(*) INTO session_count FROM active_sessions WHERE user_id = NEW.user_id;
  IF session_count >= 3 THEN
    -- Remove oldest session
    DELETE FROM active_sessions WHERE id = (
      SELECT id FROM active_sessions WHERE user_id = NEW.user_id ORDER BY last_active ASC LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_session_limit ON active_sessions;
CREATE TRIGGER check_session_limit BEFORE INSERT ON active_sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_session_limit();
