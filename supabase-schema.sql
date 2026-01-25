-- =====================================================
-- BioLignTrack Complete Database Schema
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension (should already be enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (linked to auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  doctor_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. PATIENTS TABLE (treatment data for patients)
-- =====================================================
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_hours_per_day INTEGER DEFAULT 22,
  total_trays INTEGER DEFAULT 24,
  current_tray INTEGER DEFAULT 1,
  treatment_start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- 3. DAILY_LOGS TABLE (daily wear tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  wear_minutes INTEGER DEFAULT 0,
  comfort_level INTEGER DEFAULT 8 CHECK (comfort_level >= 1 AND comfort_level <= 10),
  fit_ok BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, date)
);

-- =====================================================
-- 4. TRAY_CHANGES TABLE (tray change history)
-- =====================================================
CREATE TABLE IF NOT EXISTS tray_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tray_number INTEGER NOT NULL,
  date_changed TIMESTAMPTZ DEFAULT NOW(),
  fit_status TEXT NOT NULL DEFAULT 'ok' CHECK (fit_status IN ('ok', 'watch', 'not_seated')),
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. MESSAGES TABLE (doctor-patient messaging)
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. APPOINTMENTS TABLE (scheduled appointments)
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  purpose TEXT NOT NULL,
  location TEXT,
  provider TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. WEAR_SESSIONS TABLE (active wear tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS wear_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. PATIENT_INVITATIONS TABLE (doctor invites patients)
-- =====================================================
CREATE TABLE IF NOT EXISTS patient_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_email TEXT NOT NULL,
  invitation_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- =====================================================
-- 9. DOCTOR_PATIENTS TABLE (doctor-patient relationships)
-- =====================================================
CREATE TABLE IF NOT EXISTS doctor_patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, patient_id)
);

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_user_meta_data->>'user_role', 'patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Trigger for doctor code generation
DROP TRIGGER IF EXISTS set_doctor_code ON profiles;
CREATE TRIGGER set_doctor_code
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_doctor_code();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tray_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wear_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patients ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- PATIENTS policies
CREATE POLICY "Users can view own patient data" ON patients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patient data" ON patients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patient data" ON patients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view assigned patients data" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patients dp
      WHERE dp.doctor_id = auth.uid()
      AND dp.patient_id = patients.user_id
      AND dp.status = 'active'
    )
  );

-- DAILY_LOGS policies
CREATE POLICY "Users can manage own daily logs" ON daily_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = daily_logs.patient_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can view assigned patients logs" ON daily_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN doctor_patients dp ON dp.patient_id = p.user_id
      WHERE p.id = daily_logs.patient_id
      AND dp.doctor_id = auth.uid()
      AND dp.status = 'active'
    )
  );

-- TRAY_CHANGES policies
CREATE POLICY "Users can manage own tray changes" ON tray_changes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = tray_changes.patient_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can view assigned patients tray changes" ON tray_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN doctor_patients dp ON dp.patient_id = p.user_id
      WHERE p.id = tray_changes.patient_id
      AND dp.doctor_id = auth.uid()
      AND dp.status = 'active'
    )
  );

-- MESSAGES policies
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own received messages" ON messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- APPOINTMENTS policies
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = doctor_id OR
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = appointments.patient_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can manage appointments" ON appointments
  FOR ALL USING (auth.uid() = doctor_id);

-- WEAR_SESSIONS policies
CREATE POLICY "Users can manage own wear sessions" ON wear_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = wear_sessions.patient_id
      AND p.user_id = auth.uid()
    )
  );

-- PATIENT_INVITATIONS policies
CREATE POLICY "Doctors can manage own invitations" ON patient_invitations
  FOR ALL USING (auth.uid() = doctor_id);

CREATE POLICY "Anyone can view invitations by code" ON patient_invitations
  FOR SELECT USING (true);

CREATE POLICY "Invitations can be updated by anyone" ON patient_invitations
  FOR UPDATE USING (true);

-- DOCTOR_PATIENTS policies
CREATE POLICY "Doctors can view their patients" ON doctor_patients
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can view their doctors" ON doctor_patients
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Anyone can create relationships" ON doctor_patients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Relationships can be updated" ON doctor_patients
  FOR UPDATE USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_doctor_code ON profiles(doctor_code);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_patient_id ON daily_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);

CREATE INDEX IF NOT EXISTS idx_tray_changes_patient_id ON tray_changes(patient_id);
CREATE INDEX IF NOT EXISTS idx_tray_changes_date ON tray_changes(date_changed);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(starts_at);

CREATE INDEX IF NOT EXISTS idx_wear_sessions_patient ON wear_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_wear_sessions_active ON wear_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_patient_invitations_code ON patient_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_patient_invitations_doctor ON patient_invitations(doctor_id);

CREATE INDEX IF NOT EXISTS idx_doctor_patients_doctor ON doctor_patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_patient ON doctor_patients(patient_id);

-- =====================================================
-- DONE! Your database is ready.
-- =====================================================
