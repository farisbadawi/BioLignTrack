-- =====================================================
-- BioLignTrack Comprehensive Database Schema v2.0
-- Production-Ready for Global Deployment
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('patient', 'doctor', 'admin')) DEFAULT 'patient',
  doctor_code TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add doctor_code column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'doctor_code') THEN
    ALTER TABLE profiles ADD COLUMN doctor_code TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'timezone') THEN
    ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'language') THEN
    ALTER TABLE profiles ADD COLUMN language TEXT DEFAULT 'en';
  END IF;
END $$;

-- =====================================================
-- TREATMENT BOUTS SYSTEM
-- =====================================================

-- Treatment bouts table - tracks multiple treatment rounds
CREATE TABLE IF NOT EXISTS treatment_bouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bout_number INTEGER NOT NULL DEFAULT 1,
  total_trays INTEGER NOT NULL DEFAULT 24,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, bout_number)
);

-- Patients table (treatment-specific data, linked to current bout)
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_bout_id UUID REFERENCES treatment_bouts(id),
  current_tray INTEGER DEFAULT 1,
  total_trays INTEGER DEFAULT 24,
  target_hours_per_day DECIMAL(4,2) DEFAULT 22.0,
  treatment_start_date DATE DEFAULT CURRENT_DATE,
  doctor_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add current_bout_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'current_bout_id') THEN
    ALTER TABLE patients ADD COLUMN current_bout_id UUID REFERENCES treatment_bouts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'doctor_id') THEN
    ALTER TABLE patients ADD COLUMN doctor_id UUID REFERENCES profiles(id);
  END IF;
END $$;

-- =====================================================
-- DAILY TRACKING
-- =====================================================

-- Daily logs table
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  bout_id UUID REFERENCES treatment_bouts(id),
  date DATE NOT NULL,
  wear_minutes INTEGER DEFAULT 0,
  target_minutes INTEGER DEFAULT 1320,
  comfort_level INTEGER CHECK (comfort_level BETWEEN 1 AND 10),
  fit_ok BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, date)
);

-- Add bout_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_logs' AND column_name = 'bout_id') THEN
    ALTER TABLE daily_logs ADD COLUMN bout_id UUID REFERENCES treatment_bouts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_logs' AND column_name = 'target_minutes') THEN
    ALTER TABLE daily_logs ADD COLUMN target_minutes INTEGER DEFAULT 1320;
  END IF;
END $$;

-- Wear sessions table
CREATE TABLE IF NOT EXISTS wear_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  bout_id UUID REFERENCES treatment_bouts(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add bout_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wear_sessions' AND column_name = 'bout_id') THEN
    ALTER TABLE wear_sessions ADD COLUMN bout_id UUID REFERENCES treatment_bouts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wear_sessions' AND column_name = 'duration_minutes') THEN
    ALTER TABLE wear_sessions ADD COLUMN duration_minutes INTEGER;
  END IF;
END $$;

-- =====================================================
-- TRAY MANAGEMENT
-- =====================================================

-- Tray changes table
CREATE TABLE IF NOT EXISTS tray_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  bout_id UUID REFERENCES treatment_bouts(id),
  tray_number INTEGER NOT NULL,
  date_changed TIMESTAMPTZ DEFAULT NOW(),
  fit_status TEXT CHECK (fit_status IN ('ok', 'watch', 'not_seated', 'good', 'fair', 'poor')) DEFAULT 'ok',
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add bout_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tray_changes' AND column_name = 'bout_id') THEN
    ALTER TABLE tray_changes ADD COLUMN bout_id UUID REFERENCES treatment_bouts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tray_changes' AND column_name = 'notes') THEN
    ALTER TABLE tray_changes ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tray_changes' AND column_name = 'photo_urls') THEN
    ALTER TABLE tray_changes ADD COLUMN photo_urls TEXT[];
  END IF;
END $$;

-- =====================================================
-- MESSAGING SYSTEM
-- =====================================================

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'file', 'system')) DEFAULT 'text',
  attachment_url TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add message_type and attachment_url if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
    ALTER TABLE messages ADD COLUMN message_type TEXT CHECK (message_type IN ('text', 'image', 'file', 'system')) DEFAULT 'text';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'attachment_url') THEN
    ALTER TABLE messages ADD COLUMN attachment_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read_at') THEN
    ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- APPOINTMENTS SYSTEM
-- =====================================================

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  appointment_type TEXT CHECK (appointment_type IN ('checkup', 'adjustment', 'emergency', 'consultation', 'follow_up', 'other')) DEFAULT 'checkup',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'pending',
  location TEXT,
  video_link TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'doctor_id') THEN
    ALTER TABLE appointments ADD COLUMN doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_type') THEN
    ALTER TABLE appointments ADD COLUMN appointment_type TEXT CHECK (appointment_type IN ('checkup', 'adjustment', 'emergency', 'consultation', 'follow_up', 'other')) DEFAULT 'checkup';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'video_link') THEN
    ALTER TABLE appointments ADD COLUMN video_link TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'reminder_sent') THEN
    ALTER TABLE appointments ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- DOCTOR-PATIENT RELATIONSHIPS
-- =====================================================

-- Doctor-patient relationships table
CREATE TABLE IF NOT EXISTS doctor_patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'transferred')) DEFAULT 'active',
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, patient_id)
);

-- Patient invitations table
CREATE TABLE IF NOT EXISTS patient_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  patient_email TEXT NOT NULL,
  invitation_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  accepted_at TIMESTAMPTZ
);

-- =====================================================
-- PATIENT NOTES (FOR DOCTORS)
-- =====================================================

-- Patient notes table
CREATE TABLE IF NOT EXISTS patient_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bout_id UUID REFERENCES treatment_bouts(id),
  note_type TEXT CHECK (note_type IN ('clinical', 'progress', 'concern', 'general', 'treatment_plan')) DEFAULT 'general',
  title TEXT,
  content TEXT NOT NULL,
  is_flagged BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REMINDERS AND NOTIFICATIONS
-- =====================================================

-- User notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  wear_reminders BOOLEAN DEFAULT true,
  wear_reminder_times TEXT[] DEFAULT ARRAY['09:00', '14:00', '21:00'],
  appointment_reminders BOOLEAN DEFAULT true,
  appointment_reminder_hours INTEGER DEFAULT 24,
  tray_change_reminders BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('wear', 'appointment', 'tray_change', 'custom', 'medication')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  repeat_pattern TEXT CHECK (repeat_pattern IN ('none', 'daily', 'weekly', 'monthly')),
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- =====================================================
-- ANALYTICS AND METRICS
-- =====================================================

-- Compliance metrics (aggregated data)
CREATE TABLE IF NOT EXISTS compliance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  bout_id UUID REFERENCES treatment_bouts(id),
  period_type TEXT CHECK (period_type IN ('daily', 'weekly', 'monthly')) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_wear_minutes INTEGER DEFAULT 0,
  target_wear_minutes INTEGER DEFAULT 0,
  compliance_percentage DECIMAL(5,2) DEFAULT 0,
  days_on_track INTEGER DEFAULT 0,
  days_below_target INTEGER DEFAULT 0,
  average_daily_wear DECIMAL(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, period_type, period_start)
);

-- =====================================================
-- USER SETTINGS AND PREFERENCES
-- =====================================================

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme TEXT CHECK (theme IN ('light', 'dark', 'system')) DEFAULT 'system',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT CHECK (time_format IN ('12h', '24h')) DEFAULT '12h',
  units TEXT CHECK (units IN ('metric', 'imperial')) DEFAULT 'imperial',
  haptic_feedback BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  auto_start_wear BOOLEAN DEFAULT false,
  show_daily_tip BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROGRESS PHOTOS
-- =====================================================

-- Progress photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  bout_id UUID REFERENCES treatment_bouts(id),
  tray_number INTEGER,
  photo_type TEXT CHECK (photo_type IN ('front', 'left', 'right', 'top', 'bottom', 'other')) NOT NULL,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  notes TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_user_meta_data->>'user_role', 'patient')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate doctor code
CREATE OR REPLACE FUNCTION generate_doctor_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'doctor' AND NEW.doctor_code IS NULL THEN
    NEW.doctor_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS set_doctor_code ON profiles;
CREATE TRIGGER set_doctor_code
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_doctor_code();

-- Function to create initial treatment bout for new patients
CREATE OR REPLACE FUNCTION create_initial_bout()
RETURNS TRIGGER AS $$
DECLARE
  new_bout_id UUID;
BEGIN
  -- Create initial treatment bout
  INSERT INTO treatment_bouts (patient_id, bout_number, total_trays, start_date, status)
  VALUES (NEW.user_id, 1, NEW.total_trays, COALESCE(NEW.treatment_start_date, CURRENT_DATE), 'active')
  RETURNING id INTO new_bout_id;

  -- Update patient with bout reference
  NEW.current_bout_id := new_bout_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON daily_logs;
CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_treatment_bouts_updated_at ON treatment_bouts;
CREATE TRIGGER update_treatment_bouts_updated_at
  BEFORE UPDATE ON treatment_bouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_patient_notes_updated_at ON patient_notes;
CREATE TRIGGER update_patient_notes_updated_at
  BEFORE UPDATE ON patient_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_bouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wear_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tray_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Doctors can view patient profiles" ON profiles;
CREATE POLICY "Doctors can view patient profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patients dp
      WHERE dp.doctor_id = auth.uid() AND dp.patient_id = profiles.id
    )
  );

DROP POLICY IF EXISTS "Patients can view their doctor profile" ON profiles;
CREATE POLICY "Patients can view their doctor profile" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patients dp
      WHERE dp.patient_id = auth.uid() AND dp.doctor_id = profiles.id
    )
  );

DROP POLICY IF EXISTS "Public can view doctor codes" ON profiles;
CREATE POLICY "Public can view doctor codes" ON profiles
  FOR SELECT USING (role = 'doctor');

-- Patients policies
DROP POLICY IF EXISTS "Users can view own patient data" ON patients;
CREATE POLICY "Users can view own patient data" ON patients
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own patient data" ON patients;
CREATE POLICY "Users can insert own patient data" ON patients
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own patient data" ON patients;
CREATE POLICY "Users can update own patient data" ON patients
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Doctors can view assigned patient data" ON patients;
CREATE POLICY "Doctors can view assigned patient data" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patients dp
      WHERE dp.doctor_id = auth.uid() AND dp.patient_id = patients.user_id
    )
  );

-- Treatment bouts policies
DROP POLICY IF EXISTS "Users can manage own treatment bouts" ON treatment_bouts;
CREATE POLICY "Users can manage own treatment bouts" ON treatment_bouts
  FOR ALL USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Doctors can view patient treatment bouts" ON treatment_bouts;
CREATE POLICY "Doctors can view patient treatment bouts" ON treatment_bouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patients dp
      WHERE dp.doctor_id = auth.uid() AND dp.patient_id = treatment_bouts.patient_id
    )
  );

-- Daily logs policies
DROP POLICY IF EXISTS "Users can manage own logs" ON daily_logs;
CREATE POLICY "Users can manage own logs" ON daily_logs
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Doctors can view patient logs" ON daily_logs;
CREATE POLICY "Doctors can view patient logs" ON daily_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN doctor_patients dp ON dp.patient_id = p.user_id
      WHERE p.id = daily_logs.patient_id AND dp.doctor_id = auth.uid()
    )
  );

-- Wear sessions policies
DROP POLICY IF EXISTS "Users can manage own wear sessions" ON wear_sessions;
CREATE POLICY "Users can manage own wear sessions" ON wear_sessions
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Tray changes policies
DROP POLICY IF EXISTS "Users can manage own tray changes" ON tray_changes;
CREATE POLICY "Users can manage own tray changes" ON tray_changes
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Doctors can view patient tray changes" ON tray_changes;
CREATE POLICY "Doctors can view patient tray changes" ON tray_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN doctor_patients dp ON dp.patient_id = p.user_id
      WHERE p.id = tray_changes.patient_id AND dp.doctor_id = auth.uid()
    )
  );

-- Messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own received messages" ON messages;
CREATE POLICY "Users can update own received messages" ON messages
  FOR UPDATE USING (recipient_id = auth.uid());

-- Appointments policies
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR doctor_id = auth.uid()
  );

DROP POLICY IF EXISTS "Doctors can manage appointments" ON appointments;
CREATE POLICY "Doctors can manage appointments" ON appointments
  FOR ALL USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "Patients can request appointments" ON appointments;
CREATE POLICY "Patients can request appointments" ON appointments
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Doctor-patient relationships policies
DROP POLICY IF EXISTS "Doctors can view own relationships" ON doctor_patients;
CREATE POLICY "Doctors can view own relationships" ON doctor_patients
  FOR SELECT USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "Patients can view own relationships" ON doctor_patients;
CREATE POLICY "Patients can view own relationships" ON doctor_patients
  FOR SELECT USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Allow creating relationships" ON doctor_patients;
CREATE POLICY "Allow creating relationships" ON doctor_patients
  FOR INSERT WITH CHECK (patient_id = auth.uid() OR doctor_id = auth.uid());

-- Patient invitations policies
DROP POLICY IF EXISTS "Doctors can manage invitations" ON patient_invitations;
CREATE POLICY "Doctors can manage invitations" ON patient_invitations
  FOR ALL USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view invitations by code" ON patient_invitations;
CREATE POLICY "Anyone can view invitations by code" ON patient_invitations
  FOR SELECT USING (true);

-- Patient notes policies
DROP POLICY IF EXISTS "Doctors can manage patient notes" ON patient_notes;
CREATE POLICY "Doctors can manage patient notes" ON patient_notes
  FOR ALL USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "Patients can view non-private notes" ON patient_notes;
CREATE POLICY "Patients can view non-private notes" ON patient_notes
  FOR SELECT USING (patient_id = auth.uid() AND is_private = false);

-- Notification settings policies
DROP POLICY IF EXISTS "Users can manage own notification settings" ON notification_settings;
CREATE POLICY "Users can manage own notification settings" ON notification_settings
  FOR ALL USING (user_id = auth.uid());

-- Reminders policies
DROP POLICY IF EXISTS "Users can manage own reminders" ON reminders;
CREATE POLICY "Users can manage own reminders" ON reminders
  FOR ALL USING (user_id = auth.uid());

-- Push tokens policies
DROP POLICY IF EXISTS "Users can manage own push tokens" ON push_tokens;
CREATE POLICY "Users can manage own push tokens" ON push_tokens
  FOR ALL USING (user_id = auth.uid());

-- Compliance metrics policies
DROP POLICY IF EXISTS "Users can view own compliance metrics" ON compliance_metrics;
CREATE POLICY "Users can view own compliance metrics" ON compliance_metrics
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Doctors can view patient compliance metrics" ON compliance_metrics;
CREATE POLICY "Doctors can view patient compliance metrics" ON compliance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN doctor_patients dp ON dp.patient_id = p.user_id
      WHERE p.id = compliance_metrics.patient_id AND dp.doctor_id = auth.uid()
    )
  );

-- User settings policies
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid());

-- Progress photos policies
DROP POLICY IF EXISTS "Users can manage own photos" ON progress_photos;
CREATE POLICY "Users can manage own photos" ON progress_photos
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Doctors can view patient photos" ON progress_photos;
CREATE POLICY "Doctors can view patient photos" ON progress_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN doctor_patients dp ON dp.patient_id = p.user_id
      WHERE p.id = progress_photos.patient_id AND dp.doctor_id = auth.uid()
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_doctor_code ON profiles(doctor_code);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_current_bout ON patients(current_bout_id);
CREATE INDEX IF NOT EXISTS idx_treatment_bouts_patient ON treatment_bouts(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_bouts_status ON treatment_bouts(status);
CREATE INDEX IF NOT EXISTS idx_daily_logs_patient_date ON daily_logs(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_bout ON daily_logs(bout_id);
CREATE INDEX IF NOT EXISTS idx_wear_sessions_patient ON wear_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_wear_sessions_active ON wear_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tray_changes_patient ON tray_changes(patient_id);
CREATE INDEX IF NOT EXISTS idx_tray_changes_bout ON tray_changes(bout_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_doctor ON doctor_patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_patient ON doctor_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient ON patient_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_doctor ON patient_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_for) WHERE is_active = true AND is_sent = false;
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_patient ON compliance_metrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_patient ON progress_photos(patient_id);

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE doctor_patients;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_logs;

-- =====================================================
-- SAMPLE DATA (OPTIONAL - COMMENT OUT FOR PRODUCTION)
-- =====================================================

-- Uncomment below to add sample data for testing
/*
-- Sample notification settings defaults will be created when users sign up
-- Sample reminders and other data would be created through the app
*/

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_versions (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_versions (version, description)
VALUES ('2.0.0', 'Comprehensive schema with bouts, notes, reminders, analytics')
ON CONFLICT DO NOTHING;
