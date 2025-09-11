// types/index.ts - COMPLETE FILE
export interface Profile {
  id: string
  name: string
  email: string
  role: 'patient' | 'doctor' | 'admin'
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  user_id: string
  name?: string // Added from profile
  email?: string // Added from profile
  target_hours_per_day: number
  total_trays: number
  current_tray: number
  treatment_start_date: string | null
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: string
  patient_id: string
  date: string
  wear_minutes: number
  comfort_level: number
  fit_ok: boolean
  notes: string | null
  created_at: string
}

export interface TrayChange {
  id: string
  patient_id: string
  tray_number: number
  date_changed: string
  fit_status: 'ok' | 'watch' | 'not_seated'
  photo_urls: string[]
  notes: string | null
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
  // Computed fields
  sender?: 'patient' | 'doctor'
  createdAt?: Date
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  starts_at: string
  ends_at: string
  purpose: string
  location: string | null
  provider: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  created_at: string
  // Computed fields
  startsAt?: Date
  endsAt?: Date
}

export interface WearSession {
  id: string
  patient_id: string
  start_time: string
  end_time: string | null
  is_active: boolean
  created_at: string
  // Computed fields
  startTime?: Date
  endTime?: Date
}

// UI specific types
export interface WeeklyProgressData {
  date: string
  hours: number
}

export interface PatientSummary {
  todayWearMinutes: number
  weeklyAverage: number
  currentStreak: number
  complianceRate: number
}

// Store types
export interface PatientStoreState {
  // Data
  patient: Patient | null
  profile: Profile | null
  loading: boolean
  error: string | null
  
  // Real-time data
  todayWearMinutes: number
  unreadMessages: number
  dailyLogs: DailyLog[]
  trayChanges: TrayChange[]
  appointments: Appointment[]
  messages: Message[]
  currentSession: WearSession | null
}

export interface PatientStoreActions {
  // Auth actions
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  
  // Data loading
  loadPatientData: () => Promise<void>
  loadDailyLogs: () => Promise<void>
  loadTrayChanges: () => Promise<void>
  loadAppointments: () => Promise<void>
  loadMessages: () => Promise<void>
  
  // Patient actions
  startWearSession: () => Promise<void>
  stopWearSession: () => Promise<void>
  addWearMinutes: (minutes: number) => Promise<void>
  logTrayChange: (trayNumber: number, fitStatus: string) => Promise<void>
  addMessage: (content: string, sender: string) => void
  markMessagesRead: () => void
  
  // Computed data
  getTodayLog: () => DailyLog | { date: string; wearMinutes: number }
  getWeeklyProgress: () => WeeklyProgressData[]
}

// Database types (matching Supabase schema)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      patients: {
        Row: Patient
        Insert: Omit<Patient, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Patient, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      daily_logs: {
        Row: DailyLog
        Insert: Omit<DailyLog, 'id' | 'created_at'> & {
          id?: string
          date?: string
          created_at?: string
        }
        Update: Partial<Omit<DailyLog, 'id' | 'patient_id' | 'created_at'>>
      }
      tray_changes: {
        Row: TrayChange
        Insert: Omit<TrayChange, 'id' | 'created_at'> & {
          id?: string
          date_changed?: string
          created_at?: string
        }
        Update: Partial<Omit<TrayChange, 'id' | 'patient_id' | 'created_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'> & {
          id?: string
          read?: boolean
          created_at?: string
        }
        Update: Partial<Omit<Message, 'id' | 'sender_id' | 'recipient_id' | 'created_at'>>
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at'> & {
          id?: string
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          created_at?: string
        }
        Update: Partial<Omit<Appointment, 'id' | 'patient_id' | 'created_at'>>
      }
      wear_sessions: {
        Row: WearSession
        Insert: Omit<WearSession, 'id' | 'created_at'> & {
          id?: string
          start_time?: string
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Omit<WearSession, 'id' | 'patient_id' | 'created_at'>>
      }
    }
  }
}

// Component prop types
export interface ProgressRingProps {
  progress: number
  size: number
  strokeWidth: number
  children?: React.ReactNode
}

export interface CardProps {
  children: React.ReactNode
  style?: any
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
}

export interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  style?: any
  textStyle?: any
}

// Navigation types
export type RootStackParamList = {
  '(tabs)': undefined
  auth: undefined
  modal: undefined
}

export type TabParamList = {
  index: undefined
  tray: undefined
  appointments: undefined
  messages: undefined
  progress: undefined
  profile: undefined
}

// Error types
export interface AuthError {
  message: string
  status?: number
}

export interface DatabaseError {
  message: string
  code?: string
  details?: string
}