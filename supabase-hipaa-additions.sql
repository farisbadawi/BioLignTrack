-- =====================================================
-- HIPAA COMPLIANCE ADDITIONS
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- AUDIT LOG TABLE
-- Tracks all access and modifications to patient data
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'login', 'logout', 'export'
  resource_type TEXT NOT NULL, -- 'patient_data', 'messages', 'appointments', 'profile', etc.
  resource_id UUID,
  details JSONB, -- Additional context about the action
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (or the user can view their own)
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- Allow inserting audit logs (the app will do this)
DROP POLICY IF EXISTS "Allow inserting audit logs" ON audit_logs;
CREATE POLICY "Allow inserting audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- LOGIN HISTORY TABLE
-- Tracks all login attempts
-- =====================================================

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own login history" ON login_history;
CREATE POLICY "Users can view own login history" ON login_history
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow inserting login history" ON login_history;
CREATE POLICY "Allow inserting login history" ON login_history
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- SESSION MANAGEMENT TABLE
-- Tracks active sessions for timeout management
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL,
  device_info JSONB,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;
CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- DATA ACCESS CONSENT TABLE
-- Tracks patient consent for data access
-- =====================================================

CREATE TABLE IF NOT EXISTS data_consent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  privacy_policy_accepted BOOLEAN DEFAULT false,
  privacy_policy_version TEXT,
  privacy_policy_accepted_at TIMESTAMPTZ,
  terms_accepted BOOLEAN DEFAULT false,
  terms_version TEXT,
  terms_accepted_at TIMESTAMPTZ,
  data_sharing_consent BOOLEAN DEFAULT false,
  data_sharing_consent_at TIMESTAMPTZ,
  hipaa_acknowledgment BOOLEAN DEFAULT false,
  hipaa_acknowledgment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE data_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own consent" ON data_consent;
CREATE POLICY "Users can manage own consent" ON data_consent
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- FUNCTION: Log Audit Event
-- Call this from the app to log actions
-- =====================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_audit_id UUID;
BEGIN
  -- Get current user info
  SELECT id, email, role INTO v_user_id, v_user_email, v_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Insert audit log
  INSERT INTO audit_logs (user_id, user_email, user_role, action, resource_type, resource_id, details)
  VALUES (v_user_id, v_user_email, v_user_role, p_action, p_resource_type, p_resource_id, p_details)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Clean up expired sessions
-- Run this periodically via a cron job
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW() OR is_active = false;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Auto-log patient data access
-- =====================================================

CREATE OR REPLACE FUNCTION log_patient_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when someone reads patient data
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  SELECT
    auth.uid(),
    'view',
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object('table', TG_TABLE_NAME)
  WHERE auth.uid() IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You can add triggers to specific tables if you want automatic logging
-- Example:
-- CREATE TRIGGER log_patient_access AFTER SELECT ON patients
--   FOR EACH ROW EXECUTE FUNCTION log_patient_data_access();

-- =====================================================
-- UPDATE SCHEMA VERSION
-- =====================================================

INSERT INTO schema_versions (version, description)
VALUES ('2.1.0', 'Added HIPAA compliance tables: audit_logs, login_history, user_sessions, data_consent')
ON CONFLICT DO NOTHING;
