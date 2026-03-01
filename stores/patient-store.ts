// stores/patient-store.ts - COMPREHENSIVE VERSION FOR PRODUCTION
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface TreatmentBout {
  id: string
  patient_id: string
  bout_number: number
  total_trays: number
  start_date: string
  end_date: string | null
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  notes: string | null
  created_at: string
}

interface PatientNote {
  id: string
  patient_id: string
  doctor_id: string
  bout_id: string | null
  note_type: 'clinical' | 'progress' | 'concern' | 'general' | 'treatment_plan'
  title: string | null
  content: string
  is_flagged: boolean
  is_private: boolean
  created_at: string
}

interface NotificationSettings {
  id: string
  user_id: string
  push_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  wear_reminders: boolean
  wear_reminder_times: string[]
  appointment_reminders: boolean
  appointment_reminder_hours: number
  tray_change_reminders: boolean
  message_notifications: boolean
  weekly_summary: boolean
}

interface UserSettings {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  date_format: string
  time_format: '12h' | '24h'
  units: 'metric' | 'imperial'
  haptic_feedback: boolean
  sound_enabled: boolean
  auto_start_wear: boolean
  show_daily_tip: boolean
}

interface PracticeInfo {
  practice_name: string
  practice_phone: string
  practice_address: string
  calendly_url: string
  office_hours: string
}

interface ProgressPhoto {
  id: string
  patient_id: string
  bout_id: string | null
  tray_number: number | null
  photo_type: 'front' | 'left' | 'right' | 'top' | 'bottom' | 'other'
  photo_url: string
  thumbnail_url: string | null
  notes: string | null
  taken_at: string
  created_at: string
}

interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  title: string
  description: string | null
  appointment_type: 'checkup' | 'adjustment' | 'emergency' | 'consultation' | 'follow_up' | 'other'
  starts_at: string
  ends_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  location: string | null
  video_link: string | null
  notes: string | null
}

interface EnhancedPatientState {
  // Core data
  patient: any | null
  profile: any | null
  loading: boolean
  error: string | null

  // Treatment tracking
  todayWearMinutes: number
  dailyLogs: any[]
  trayChanges: any[]
  currentSession: any | null

  // Treatment bouts
  treatmentBouts: TreatmentBout[]
  currentBout: TreatmentBout | null

  // Messaging
  messages: any[]
  unreadMessages: number

  // Appointments
  appointments: Appointment[]

  // Role-based data
  userRole: 'patient' | 'doctor' | 'admin'
  assignedDoctor: any | null
  assignedPatients: any[]
  invitations: any[]
  doctorCode: string | null

  // Progress photos
  progressPhotos: ProgressPhoto[]

  // Doctor features
  patientNotes: PatientNote[]

  // Settings
  notificationSettings: NotificationSettings | null
  userSettings: UserSettings | null

  // Practice info (for doctors)
  practiceInfo: PracticeInfo | null

  // Auth state
  isAuthenticated: boolean

  // =====================================================
  // AUTH ACTIONS
  // =====================================================
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name: string, role?: string, invitationCode?: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  clearAuth: () => void

  // =====================================================
  // PATIENT DATA ACTIONS
  // =====================================================
  loadPatientData: () => Promise<void>
  loadDailyLogs: () => Promise<void>
  loadTrayChanges: () => Promise<void>
  loadAppointments: () => Promise<void>
  loadMessages: () => Promise<void>

  // =====================================================
  // WEAR TRACKING ACTIONS
  // =====================================================
  startWearSession: () => Promise<void>
  stopWearSession: () => Promise<void>
  addWearMinutes: (minutes: number) => Promise<void>

  // =====================================================
  // TRAY MANAGEMENT ACTIONS
  // =====================================================
  logTrayChange: (trayNumber: number, fitStatus: string, notes?: string) => Promise<void>
  updateTreatmentInfo: (totalTrays: number, currentTray: number) => Promise<{ success: boolean; error?: string }>

  // =====================================================
  // TREATMENT BOUTS ACTIONS
  // =====================================================
  loadTreatmentBouts: () => Promise<void>
  startNewTreatmentBout: (totalTrays: number, notes?: string) => Promise<{ success: boolean; error?: string }>
  completeTreatmentBout: (boutId: string, notes?: string) => Promise<{ success: boolean; error?: string }>
  pauseTreatmentBout: (boutId: string, notes?: string) => Promise<{ success: boolean; error?: string }>
  resumeTreatmentBout: (boutId: string) => Promise<{ success: boolean; error?: string }>

  // =====================================================
  // MESSAGING ACTIONS
  // =====================================================
  addMessage: (content: string, sender: string) => void
  markMessagesRead: (senderId?: string) => Promise<void>
  sendMessageToDoctor: (content: string) => Promise<void>
  sendMessageToPatient: (patientId: string, content: string) => Promise<void>

  // =====================================================
  // DOCTOR-PATIENT RELATIONSHIP ACTIONS
  // =====================================================
  acceptInvitation: (invitationCode: string) => Promise<{ success: boolean; error?: string; doctorId?: string }>
  createPatientInvitation: (patientEmail: string) => Promise<{ success: boolean; invitationCode?: string; error?: string; emailSent?: boolean }>
  sendInvitationEmail: (toEmail: string, doctorCode: string, doctorName: string) => Promise<boolean>
  loadAssignedDoctor: () => Promise<void>
  loadAssignedPatients: () => Promise<void>
  loadInvitations: () => Promise<void>
  getDoctorCode: () => Promise<string | null>
  joinDoctorByCode: (code: string) => Promise<{ success: boolean; error?: string }>
  getPatientById: (patientId: string) => Promise<any | null>

  // =====================================================
  // PROGRESS PHOTO ACTIONS
  // =====================================================
  loadProgressPhotos: () => Promise<void>
  uploadProgressPhoto: (photoUri: string, photoType: ProgressPhoto['photo_type']) => Promise<{ success: boolean; error?: string }>
  deleteProgressPhoto: (photoId: string) => Promise<{ success: boolean; error?: string }>

  // =====================================================
  // PATIENT NOTES ACTIONS (DOCTOR)
  // =====================================================
  loadPatientNotes: (patientId: string) => Promise<void>
  addPatientNote: (patientId: string, note: Partial<PatientNote>) => Promise<{ success: boolean; error?: string }>
  updatePatientNote: (noteId: string, updates: Partial<PatientNote>) => Promise<{ success: boolean; error?: string }>
  deletePatientNote: (noteId: string) => Promise<{ success: boolean; error?: string }>

  // =====================================================
  // APPOINTMENT ACTIONS
  // =====================================================
  requestAppointment: (doctorId: string, appointment: Partial<Appointment>) => Promise<{ success: boolean; error?: string }>
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => Promise<{ success: boolean; error?: string }>
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<{ success: boolean; error?: string }>

  // =====================================================
  // SETTINGS ACTIONS
  // =====================================================
  loadNotificationSettings: () => Promise<void>
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<{ success: boolean; error?: string }>
  loadUserSettings: () => Promise<void>
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<{ success: boolean; error?: string }>
  initializeUserSettings: () => Promise<void>

  // Practice info actions (for doctors)
  loadPracticeInfo: () => Promise<void>
  savePracticeInfo: (info: Partial<PracticeInfo>) => Promise<{ success: boolean; error?: string }>
  hasPracticeInfo: () => boolean

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================
  getTodayLog: () => any
  getWeeklyProgress: () => { date: string; hours: number }[]
  getComplianceStats: () => { weeklyAverage: number; monthlyAverage: number; streak: number }
}

// =====================================================
// STORE IMPLEMENTATION
// =====================================================

export const usePatientStore = create<EnhancedPatientState>((set, get) => ({
  // Initial state
  patient: null,
  profile: null,
  loading: false,
  error: null,
  todayWearMinutes: 0,
  dailyLogs: [],
  trayChanges: [],
  currentSession: null,
  treatmentBouts: [],
  currentBout: null,
  messages: [],
  unreadMessages: 0,
  appointments: [],
  userRole: 'patient',
  assignedDoctor: null,
  assignedPatients: [],
  invitations: [],
  doctorCode: null,
  progressPhotos: [],
  patientNotes: [],
  notificationSettings: null,
  userSettings: null,
  practiceInfo: null,
  isAuthenticated: false,

  // =====================================================
  // AUTH METHODS
  // =====================================================

  clearAuth: () => {
    set({
      patient: null,
      profile: null,
      todayWearMinutes: 0,
      dailyLogs: [],
      trayChanges: [],
      currentSession: null,
      treatmentBouts: [],
      currentBout: null,
      messages: [],
      unreadMessages: 0,
      appointments: [],
      userRole: 'patient',
      assignedDoctor: null,
      assignedPatients: [],
      invitations: [],
      doctorCode: null,
      progressPhotos: [],
      patientNotes: [],
      notificationSettings: null,
      userSettings: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    })
  },

  initialize: async () => {
    try {
      set({ loading: true, error: null })

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        get().clearAuth()
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError)
        get().clearAuth()
        return
      }

      if (profile) {
        set({
          profile,
          userRole: profile.role || 'patient',
          isAuthenticated: true
        })

        // Load role-specific data
        if (profile.role === 'patient') {
          await get().loadPatientData()
          await get().loadAssignedDoctor()
          await get().loadTreatmentBouts()
        } else if (profile.role === 'doctor') {
          await get().loadAssignedPatients()
          await get().loadInvitations()
          await get().loadPracticeInfo()
        }

        // Load common data
        await get().loadMessages()
        await get().loadAppointments()
        await get().loadNotificationSettings()
        await get().loadUserSettings()
      } else {
        get().clearAuth()
      }

      set({ loading: false })
    } catch (error) {
      console.error('Initialize error:', error)
      get().clearAuth()
      set({ error: (error as Error).message, loading: false })
    }
  },

  signUp: async (email: string, password: string, name: string, role: string = 'patient', invitationCode?: string) => {
    const waitForProfile = async (userId: string, maxAttempts = 10): Promise<any | null> => {
      for (let i = 0; i < maxAttempts; i++) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (data) return data
        await new Promise(r => setTimeout(r, 500))
      }
      return null
    }

    try {
      set({ loading: true })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, full_name: name, user_role: role }
        }
      })

      if (error) {
        set({ loading: false })
        return { error }
      }

      if (data.user) {
        await waitForProfile(data.user.id)

        // Update profile with correct role
        await supabase
          .from('profiles')
          .update({ role, name })
          .eq('id', data.user.id)

        // Handle invitation code for patients
        if (role === 'patient' && invitationCode) {
          await get().acceptInvitation(invitationCode)
        }

        const profile = {
          id: data.user.id,
          email,
          name,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        set({
          profile,
          userRole: role as 'patient' | 'doctor',
          isAuthenticated: true
        })

        // Load role-specific data
        if (role === 'patient') {
          await get().loadPatientData()
          await get().loadAssignedDoctor()
        } else if (role === 'doctor') {
          await get().loadAssignedPatients()
          await get().loadInvitations()
        }

        // Initialize settings for new users
        await get().initializeUserSettings()
      }

      set({ loading: false })
      return {}
    } catch (error) {
      set({ loading: false })
      return { error }
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        set({ loading: false })
        return { error }
      }

      if (data.user) {
        await get().initialize()
      }

      set({ loading: false })
      return {}
    } catch (error) {
      set({ loading: false })
      return { error }
    }
  },

  signOut: async () => {
    try {
      set({ loading: true })
      await supabase.auth.signOut()
      get().clearAuth()
    } catch (error) {
      console.error('Sign out error:', error)
      get().clearAuth()
    }
  },

  // =====================================================
  // PATIENT DATA METHODS
  // =====================================================

  loadPatientData: async () => {
    const { profile } = get()
    if (!profile) return

    try {
      let { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', profile.id)
        .single()

      if (patientError && patientError.code === 'PGRST116') {
        // Create new patient record
        const { data: newPatient, error: createError } = await supabase
          .from('patients')
          .insert({
            user_id: profile.id,
            target_hours_per_day: 22,
            total_trays: 24,
            current_tray: 1,
            treatment_start_date: new Date().toISOString().split('T')[0]
          })
          .select()
          .single()

        if (createError) {
          console.error('Create patient error:', createError)
          return
        }

        patient = newPatient

        // Create initial treatment bout
        await get().startNewTreatmentBout(24, 'Initial treatment')
      } else if (patientError) {
        console.error('Patient error:', patientError)
        return
      }

      if (patient) {
        set({
          patient: {
            ...patient,
            name: profile.name,
            email: profile.email
          }
        })

        // Load today's wear time
        const today = new Date().toISOString().split('T')[0]
        const { data: todayLog } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('patient_id', patient.id)
          .eq('date', today)
          .single()

        if (todayLog) {
          set({ todayWearMinutes: todayLog.wear_minutes })
        }

        // Check for active wear session
        const { data: activeSession } = await supabase
          .from('wear_sessions')
          .select('*')
          .eq('patient_id', patient.id)
          .eq('is_active', true)
          .single()

        if (activeSession) {
          set({
            currentSession: {
              ...activeSession,
              startTime: new Date(activeSession.start_time)
            }
          })
        }

        // Load related data
        await Promise.all([
          get().loadDailyLogs(),
          get().loadTrayChanges(),
          get().loadAppointments(),
          get().loadProgressPhotos()
        ])
      }
    } catch (error) {
      console.error('Load patient data error:', error)
    }
  },

  loadDailyLogs: async () => {
    const { patient } = get()
    if (!patient?.id) return

    try {
      const { data: dailyLogs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('patient_id', patient.id)
        .order('date', { ascending: false })
        .limit(90) // Last 90 days

      if (dailyLogs) {
        set({ dailyLogs })
      }
    } catch (error) {
      console.error('Load daily logs error:', error)
    }
  },

  loadTrayChanges: async () => {
    const { patient } = get()
    if (!patient?.id) return

    try {
      const { data: trayChanges } = await supabase
        .from('tray_changes')
        .select('*')
        .eq('patient_id', patient.id)
        .order('date_changed', { ascending: false })

      if (trayChanges) {
        set({ trayChanges })
      }
    } catch (error) {
      console.error('Load tray changes error:', error)
    }
  },

  loadAppointments: async () => {
    const { profile, patient } = get()
    if (!profile) return

    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          doctor:profiles!appointments_doctor_id_fkey(id, name, email),
          patient:patients!appointments_patient_id_fkey(id, user_id)
        `)
        .order('starts_at', { ascending: true })

      if (profile.role === 'patient' && patient?.id) {
        query = query.eq('patient_id', patient.id)
      } else if (profile.role === 'doctor') {
        query = query.eq('doctor_id', profile.id)
      }

      const { data: appointments, error } = await query

      if (error) {
        console.error('Load appointments error:', error)
        return
      }

      if (appointments) {
        set({
          appointments: appointments.map(apt => ({
            ...apt,
            startsAt: new Date(apt.starts_at),
            endsAt: new Date(apt.ends_at)
          }))
        })
      }
    } catch (error) {
      console.error('Load appointments error:', error)
    }
  },

  loadMessages: async () => {
    const { profile } = get()
    if (!profile) return

    try {
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, name, email, role),
          recipient:profiles!messages_recipient_id_fkey(id, name, email, role)
        `)
        .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .order('created_at', { ascending: true })

      if (messages) {
        const formattedMessages = messages.map(msg => ({
          ...msg,
          sender: msg.sender_id === profile.id ? profile.role : (profile.role === 'patient' ? 'doctor' : 'patient'),
          createdAt: new Date(msg.created_at)
        }))

        const unread = messages.filter(msg =>
          msg.recipient_id === profile.id && !msg.read
        ).length

        set({
          messages: formattedMessages,
          unreadMessages: unread
        })
      }
    } catch (error) {
      console.error('Load messages error:', error)
    }
  },

  // =====================================================
  // WEAR TRACKING METHODS
  // =====================================================

  startWearSession: async () => {
    const { patient, currentBout } = get()
    if (!patient?.id) return

    try {
      const { data: session, error } = await supabase
        .from('wear_sessions')
        .insert({
          patient_id: patient.id,
          bout_id: currentBout?.id,
          start_time: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      set({
        currentSession: {
          ...session,
          startTime: new Date(session.start_time)
        }
      })
    } catch (error) {
      console.error('Start session error:', error)
    }
  },

  stopWearSession: async () => {
    const { currentSession, patient } = get()
    if (!currentSession || !patient?.id) return

    const endTime = new Date()
    const sessionMinutes = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / (1000 * 60))

    try {
      await supabase
        .from('wear_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: sessionMinutes,
          is_active: false
        })
        .eq('id', currentSession.id)

      await get().addWearMinutes(sessionMinutes)

      set({ currentSession: null })
    } catch (error) {
      console.error('Stop session error:', error)
    }
  },

  addWearMinutes: async (minutes: number) => {
    const { patient, todayWearMinutes, currentBout } = get()
    if (!patient?.id) return

    const today = new Date().toISOString().split('T')[0]
    const newTotal = todayWearMinutes + minutes

    try {
      // First try to update existing record
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('id, wear_minutes')
        .eq('patient_id', patient.id)
        .eq('date', today)
        .single()

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('daily_logs')
          .update({
            wear_minutes: newTotal,
            bout_id: currentBout?.id,
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('daily_logs')
          .insert({
            patient_id: patient.id,
            bout_id: currentBout?.id,
            date: today,
            wear_minutes: newTotal,
            target_minutes: (patient.target_hours_per_day || 22) * 60,
            comfort_level: 8,
            fit_ok: true
          })

        if (error) throw error
      }

      set({ todayWearMinutes: newTotal })
    } catch (error) {
      console.error('Add wear minutes error:', error)
    }
  },

  // =====================================================
  // TRAY MANAGEMENT METHODS
  // =====================================================

  logTrayChange: async (trayNumber: number, fitStatus: string, notes?: string) => {
    const { patient, profile, currentBout } = get()
    if (!patient?.id || !profile?.id) return

    try {
      await supabase
        .from('tray_changes')
        .insert({
          patient_id: patient.id,
          bout_id: currentBout?.id,
          tray_number: trayNumber,
          date_changed: new Date().toISOString(),
          fit_status: fitStatus,
          notes: notes
        })

      await supabase
        .from('patients')
        .update({ current_tray: trayNumber })
        .eq('id', patient.id)

      set((state) => ({
        patient: state.patient ? { ...state.patient, current_tray: trayNumber } : null,
      }))

      await get().loadTrayChanges()
    } catch (error) {
      console.error('Log tray change error:', error)
    }
  },

  updateTreatmentInfo: async (totalTrays: number, currentTray: number) => {
    const { patient, profile } = get()
    if (!patient?.id || !profile?.id) {
      return { success: false, error: 'No patient record found' }
    }

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          total_trays: totalTrays,
          current_tray: currentTray,
          treatment_start_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', patient.id)

      if (error) {
        console.error('Update treatment info error:', error)
        return { success: false, error: error.message }
      }

      set((state) => ({
        patient: state.patient ? {
          ...state.patient,
          total_trays: totalTrays,
          current_tray: currentTray
        } : null,
      }))

      // Also log the initial tray change
      await supabase
        .from('tray_changes')
        .upsert({
          patient_id: patient.id,
          tray_number: currentTray,
          date_changed: new Date().toISOString(),
          fit_status: 'ok'
        }, { onConflict: 'patient_id,tray_number' })

      await get().loadTrayChanges()

      return { success: true }
    } catch (error) {
      console.error('Update treatment info error:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  // =====================================================
  // TREATMENT BOUTS METHODS
  // =====================================================

  loadTreatmentBouts: async () => {
    const { profile } = get()
    if (!profile) return

    try {
      const { data: bouts, error } = await supabase
        .from('treatment_bouts')
        .select('*')
        .eq('patient_id', profile.id)
        .order('bout_number', { ascending: false })

      if (error) {
        console.error('Load treatment bouts error:', error)
        return
      }

      const activeBout = bouts?.find(b => b.status === 'active') || null

      set({
        treatmentBouts: bouts || [],
        currentBout: activeBout
      })
    } catch (error) {
      console.error('Load treatment bouts error:', error)
    }
  },

  startNewTreatmentBout: async (totalTrays: number, notes?: string) => {
    const { profile, treatmentBouts, patient } = get()
    if (!profile) return { success: false, error: 'Not authenticated' }

    try {
      // Complete any active bouts first
      const activeBout = treatmentBouts.find(b => b.status === 'active')
      if (activeBout) {
        await get().completeTreatmentBout(activeBout.id, 'Completed to start new treatment')
      }

      const newBoutNumber = treatmentBouts.length + 1

      const { data: newBout, error } = await supabase
        .from('treatment_bouts')
        .insert({
          patient_id: profile.id,
          bout_number: newBoutNumber,
          total_trays: totalTrays,
          start_date: new Date().toISOString().split('T')[0],
          status: 'active',
          notes: notes
        })
        .select()
        .single()

      if (error) {
        console.error('Start new bout error:', error)
        return { success: false, error: error.message }
      }

      // Update patient record
      if (patient?.id) {
        await supabase
          .from('patients')
          .update({
            current_bout_id: newBout.id,
            total_trays: totalTrays,
            current_tray: 1,
            treatment_start_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', patient.id)

        set((state) => ({
          patient: state.patient ? {
            ...state.patient,
            current_bout_id: newBout.id,
            total_trays: totalTrays,
            current_tray: 1
          } : null,
        }))
      }

      await get().loadTreatmentBouts()

      return { success: true }
    } catch (error) {
      console.error('Start new bout error:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  completeTreatmentBout: async (boutId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('treatment_bouts')
        .update({
          status: 'completed',
          end_date: new Date().toISOString().split('T')[0],
          notes: notes
        })
        .eq('id', boutId)

      if (error) {
        return { success: false, error: error.message }
      }

      await get().loadTreatmentBouts()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  pauseTreatmentBout: async (boutId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('treatment_bouts')
        .update({
          status: 'paused',
          notes: notes
        })
        .eq('id', boutId)

      if (error) {
        return { success: false, error: error.message }
      }

      await get().loadTreatmentBouts()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  resumeTreatmentBout: async (boutId: string) => {
    try {
      const { error } = await supabase
        .from('treatment_bouts')
        .update({ status: 'active' })
        .eq('id', boutId)

      if (error) {
        return { success: false, error: error.message }
      }

      await get().loadTreatmentBouts()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  // =====================================================
  // MESSAGING METHODS
  // =====================================================

  addMessage: (content: string, sender: string) => {
    const newMessage = {
      id: Date.now().toString(),
      content,
      sender,
      createdAt: new Date(),
      read: sender === 'patient'
    }

    set((state) => ({
      messages: [...state.messages, newMessage]
    }))
  },

  markMessagesRead: async (senderId?: string) => {
    const { profile } = get()
    if (!profile) return

    try {
      let query = supabase
        .from('messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', profile.id)
        .eq('read', false)

      if (senderId) {
        query = query.eq('sender_id', senderId)
      }

      await query
      await get().loadMessages()
    } catch (error) {
      console.error('Mark messages read error:', error)
    }
  },

  sendMessageToDoctor: async (content: string) => {
    const { profile, assignedDoctor } = get()
    if (!profile || !assignedDoctor || profile.role !== 'patient') return

    try {
      await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          recipient_id: assignedDoctor.id,
          content,
          read: false
        })

      await get().loadMessages()
    } catch (error) {
      console.error('Send message to doctor error:', error)
    }
  },

  sendMessageToPatient: async (patientId: string, content: string) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          recipient_id: patientId,
          content,
          read: false
        })

      await get().loadMessages()
    } catch (error) {
      console.error('Send message to patient error:', error)
    }
  },

  // =====================================================
  // DOCTOR-PATIENT RELATIONSHIP METHODS
  // =====================================================

  acceptInvitation: async (invitationCode: string) => {
    try {
      const { data: invitation, error: inviteError } = await supabase
        .from('patient_invitations')
        .select('*, profiles!patient_invitations_doctor_id_fkey(*)')
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending')
        .single()

      if (inviteError || !invitation) {
        return { success: false, error: 'Invalid or expired invitation code' }
      }

      // Check if invitation has expired
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('patient_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)
        return { success: false, error: 'This invitation has expired. Please ask your doctor for a new one.' }
      }

      const { profile } = get()
      if (!profile) {
        return { success: false, error: 'User not authenticated' }
      }

      const { error: relationshipError } = await supabase
        .from('doctor_patients')
        .insert({
          doctor_id: invitation.doctor_id,
          patient_id: profile.id,
          status: 'active'
        })

      if (relationshipError) {
        return { success: false, error: 'Failed to establish doctor-patient relationship' }
      }

      await supabase
        .from('patient_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      set({ assignedDoctor: invitation.profiles })

      return { success: true, doctorId: invitation.doctor_id }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  createPatientInvitation: async (patientEmail: string) => {
    const { profile, doctorCode } = get()
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Only doctors can create invitations' }
    }

    try {
      let code = doctorCode
      if (!code) {
        code = await get().getDoctorCode()
      }

      if (!code) {
        return { success: false, error: 'Could not get doctor code' }
      }

      await supabase
        .from('patient_invitations')
        .insert({
          doctor_id: profile.id,
          patient_email: patientEmail,
          invitation_code: code,
          status: 'pending'
        })

      const emailSent = await get().sendInvitationEmail(patientEmail, code, profile.name)
      await get().loadInvitations()

      return { success: true, invitationCode: code, emailSent }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  sendInvitationEmail: async (toEmail: string, doctorCode: string, doctorName: string) => {
    // Email sending implementation - would use a service like Resend or SendGrid
    console.log(`Would send email to ${toEmail} with code ${doctorCode} from ${doctorName}`)
    return false
  },

  loadAssignedDoctor: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'patient') return

    try {
      const { data: relationship } = await supabase
        .from('doctor_patients')
        .select(`
          doctor_id,
          profiles!doctor_patients_doctor_id_fkey (
            id, name, email, role, phone,
            practice_name, practice_phone, practice_address, calendly_url, office_hours
          )
        `)
        .eq('patient_id', profile.id)
        .eq('status', 'active')
        .single()

      if (relationship?.profiles) {
        set({ assignedDoctor: relationship.profiles })
      }
    } catch (error) {
      console.error('Load assigned doctor error:', error)
      set({ assignedDoctor: null })
    }
  },

  loadAssignedPatients: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      const { data: relationships } = await supabase
        .from('doctor_patients')
        .select('patient_id, status, assigned_date')
        .eq('doctor_id', profile.id)
        .eq('status', 'active')

      if (!relationships || relationships.length === 0) {
        set({ assignedPatients: [] })
        return
      }

      const patientIds = relationships.map(r => r.patient_id)

      const { data: patientProfiles } = await supabase
        .from('profiles')
        .select('id, name, email, role, phone')
        .in('id', patientIds)

      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, user_id, current_tray, total_trays, target_hours_per_day, treatment_start_date')
        .in('user_id', patientIds)

      const patients = patientProfiles?.map(profile => {
        const patientData = patientsData?.find(p => p.user_id === profile.id)
        return { ...profile, patientData: patientData || null }
      }) || []

      set({ assignedPatients: patients })
    } catch (error) {
      console.error('Load assigned patients error:', error)
      set({ assignedPatients: [] })
    }
  },

  loadInvitations: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      const { data: invitations } = await supabase
        .from('patient_invitations')
        .select('*')
        .eq('doctor_id', profile.id)
        .order('created_at', { ascending: false })

      if (invitations) {
        set({ invitations })
      }
    } catch (error) {
      console.error('Load invitations error:', error)
    }
  },

  getDoctorCode: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return null

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('doctor_code')
        .eq('id', profile.id)
        .maybeSingle()

      if (profileData?.doctor_code) {
        set({ doctorCode: profileData.doctor_code })
        return profileData.doctor_code
      }

      // Generate new code using crypto-safe random
      const array = new Uint8Array(4)
      crypto.getRandomValues(array)
      const newCode = Array.from(array, b => b.toString(36).padStart(2, '0')).join('').substring(0, 6).toUpperCase()

      await supabase
        .from('profiles')
        .update({ doctor_code: newCode })
        .eq('id', profile.id)

      set({ doctorCode: newCode })
      return newCode
    } catch (error) {
      console.error('Get doctor code error:', error)
      return null
    }
  },

  joinDoctorByCode: async (code: string) => {
    const { profile } = get()
    if (!profile || profile.role !== 'patient') {
      return { success: false, error: 'Only patients can join doctors' }
    }

    try {
      const { data: doctor, error: findError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('doctor_code', code.toUpperCase())
        .eq('role', 'doctor')
        .single()

      if (findError || !doctor) {
        return { success: false, error: 'Invalid doctor code' }
      }

      const { data: existing } = await supabase
        .from('doctor_patients')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('patient_id', profile.id)
        .single()

      if (existing) {
        return { success: false, error: 'You are already linked to this doctor' }
      }

      const { error: relationshipError } = await supabase
        .from('doctor_patients')
        .insert({
          doctor_id: doctor.id,
          patient_id: profile.id,
          status: 'active'
        })

      if (relationshipError) {
        return { success: false, error: 'Failed to link to doctor' }
      }

      set({ assignedDoctor: doctor })
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  getPatientById: async (patientId: string) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return null

    try {
      // Verify patient is assigned to doctor
      const { data: relationship } = await supabase
        .from('doctor_patients')
        .select('*')
        .eq('doctor_id', profile.id)
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .single()

      if (!relationship) return null

      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('id, name, email, role, phone, created_at')
        .eq('id', patientId)
        .single()

      if (!patientProfile) return null

      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', patientId)
        .single()

      const { data: dailyLogs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('patient_id', patientData?.id)
        .order('date', { ascending: false })
        .limit(30)

      const { data: trayChanges } = await supabase
        .from('tray_changes')
        .select('*')
        .eq('patient_id', patientData?.id)
        .order('date_changed', { ascending: false })

      const { data: treatmentBouts } = await supabase
        .from('treatment_bouts')
        .select('*')
        .eq('patient_id', patientId)
        .order('bout_number', { ascending: false })

      const { data: progressPhotos } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('patient_id', patientData?.id)
        .order('taken_at', { ascending: false })

      return {
        ...patientProfile,
        patientData: patientData || null,
        dailyLogs: dailyLogs || [],
        trayChanges: trayChanges || [],
        treatmentBouts: treatmentBouts || [],
        progressPhotos: progressPhotos || []
      }
    } catch (error) {
      console.error('Get patient by ID error:', error)
      return null
    }
  },

  // =====================================================
  // PROGRESS PHOTO METHODS
  // =====================================================

  loadProgressPhotos: async () => {
    const { patient } = get()
    if (!patient?.id) return

    try {
      const { data: photos, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('patient_id', patient.id)
        .order('taken_at', { ascending: false })

      if (error) {
        console.error('Load progress photos error:', error)
        return
      }

      set({ progressPhotos: photos || [] })
    } catch (error) {
      console.error('Load progress photos error:', error)
    }
  },

  uploadProgressPhoto: async (photoUri: string, photoType: ProgressPhoto['photo_type']) => {
    const { patient, currentBout } = get()
    if (!patient?.id) {
      return { success: false, error: 'No patient record found' }
    }

    try {
      // Read file as base64
      const FileSystem = require('expo-file-system')
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const dataUri = `data:image/jpeg;base64,${base64}`

      const { error } = await supabase
        .from('progress_photos')
        .insert({
          patient_id: patient.id,
          bout_id: currentBout?.id || null,
          tray_number: patient.current_tray,
          photo_type: photoType,
          photo_url: dataUri,
          taken_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Upload progress photo error:', error)
        return { success: false, error: error.message }
      }

      await get().loadProgressPhotos()
      return { success: true }
    } catch (error) {
      console.error('Upload progress photo error:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  deleteProgressPhoto: async (photoId: string) => {
    const { patient } = get()
    if (!patient?.id) {
      return { success: false, error: 'No patient record found' }
    }

    try {
      const { error } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', photoId)
        .eq('patient_id', patient.id)

      if (error) {
        return { success: false, error: error.message }
      }

      await get().loadProgressPhotos()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  // =====================================================
  // PATIENT NOTES METHODS (DOCTOR)
  // =====================================================

  loadPatientNotes: async (patientId: string) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      const { data: notes, error } = await supabase
        .from('patient_notes')
        .select('*')
        .eq('patient_id', patientId)
        .eq('doctor_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Load patient notes error:', error)
        return
      }

      set({ patientNotes: notes || [] })
    } catch (error) {
      console.error('Load patient notes error:', error)
    }
  },

  addPatientNote: async (patientId: string, note: Partial<PatientNote>) => {
    const { profile, currentBout } = get()
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Only doctors can add notes' }
    }

    try {
      const { error } = await supabase
        .from('patient_notes')
        .insert({
          patient_id: patientId,
          doctor_id: profile.id,
          bout_id: currentBout?.id,
          note_type: note.note_type || 'general',
          title: note.title,
          content: note.content,
          is_flagged: note.is_flagged || false,
          is_private: note.is_private !== false
        })

      if (error) {
        return { success: false, error: error.message }
      }

      await get().loadPatientNotes(patientId)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  updatePatientNote: async (noteId: string, updates: Partial<PatientNote>) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Only doctors can update notes' }
    }

    try {
      const { error } = await supabase
        .from('patient_notes')
        .update(updates)
        .eq('id', noteId)
        .eq('doctor_id', profile.id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  deletePatientNote: async (noteId: string) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Only doctors can delete notes' }
    }

    try {
      const { error } = await supabase
        .from('patient_notes')
        .delete()
        .eq('id', noteId)
        .eq('doctor_id', profile.id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  // =====================================================
  // APPOINTMENT METHODS
  // =====================================================

  requestAppointment: async (doctorId: string, appointment: Partial<Appointment>) => {
    const { profile, patient } = get()
    if (!profile || !patient) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: patient.id,
          doctor_id: doctorId,
          title: appointment.title || 'Appointment Request',
          description: appointment.description,
          appointment_type: appointment.appointment_type || 'checkup',
          starts_at: appointment.starts_at,
          ends_at: appointment.ends_at,
          status: 'pending',
          location: appointment.location,
          notes: appointment.notes
        })

      if (error) {
        return { success: false, error: error.message }
      }

      await get().loadAppointments()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  updateAppointmentStatus: async (appointmentId: string, status: Appointment['status']) => {
    const { profile, patient } = get()
    if (!profile) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      // Scope update to appointments the user is a participant in
      let query = supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)

      if (profile.role === 'doctor') {
        query = query.eq('doctor_id', profile.id)
      } else if (patient?.id) {
        query = query.eq('patient_id', patient.id)
      }

      const { error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      await get().loadAppointments()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  cancelAppointment: async (appointmentId: string, reason?: string) => {
    const { profile, patient } = get()
    if (!profile) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      // Scope cancellation to appointments the user is a participant in
      let query = supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: reason
        })
        .eq('id', appointmentId)

      if (profile.role === 'doctor') {
        query = query.eq('doctor_id', profile.id)
      } else if (patient?.id) {
        query = query.eq('patient_id', patient.id)
      }

      const { error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      await get().loadAppointments()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  // =====================================================
  // SETTINGS METHODS
  // =====================================================

  loadNotificationSettings: async () => {
    const { profile } = get()
    if (!profile) return

    // Set default values first
    const defaults: NotificationSettings = {
      id: '',
      user_id: profile.id,
      push_enabled: true,
      email_enabled: true,
      sms_enabled: false,
      wear_reminders: true,
      wear_reminder_times: ['09:00', '14:00', '21:00'],
      appointment_reminders: true,
      appointment_reminder_hours: 24,
      tray_change_reminders: true,
      message_notifications: true,
      weekly_summary: true,
    }

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', profile.id)
        .single()

      if (data) {
        set({ notificationSettings: data })
      } else if (error && (error.code === 'PGRST116' || error.message?.includes('no rows'))) {
        // No settings found, use defaults
        set({ notificationSettings: defaults })
      } else {
        // Table might not exist, use defaults
        set({ notificationSettings: defaults })
      }
    } catch (error) {
      console.error('Load notification settings error:', error)
      // Use defaults on error
      set({ notificationSettings: defaults })
    }
  },

  updateNotificationSettings: async (settings: Partial<NotificationSettings>) => {
    const { profile, notificationSettings } = get()
    if (!profile) {
      return { success: false, error: 'Not authenticated' }
    }

    // Immediately update local state for responsive UI
    const updatedSettings = {
      ...notificationSettings,
      ...settings,
      user_id: profile.id,
      updated_at: new Date().toISOString(),
    } as NotificationSettings
    set({ notificationSettings: updatedSettings })

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: profile.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('notification_settings table not found, using local state only')
          return { success: true }
        }
        console.error('Update notification settings error:', error)
        // Keep local state but don't show error for non-critical settings
        return { success: true }
      }

      return { success: true }
    } catch (error) {
      console.error('Update notification settings exception:', error)
      // Keep local state, don't show error
      return { success: true }
    }
  },

  loadUserSettings: async () => {
    const { profile } = get()
    if (!profile) return

    // Set default values first
    const defaults: UserSettings = {
      id: '',
      user_id: profile.id,
      theme: 'system',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      date_format: 'MM/DD/YYYY',
      time_format: '12h',
      units: 'imperial',
      haptic_feedback: true,
      sound_enabled: true,
      auto_start_wear: false,
      show_daily_tip: true,
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', profile.id)
        .single()

      if (data) {
        set({ userSettings: data })
      } else if (error && (error.code === 'PGRST116' || error.message?.includes('no rows'))) {
        // No settings found, use defaults
        set({ userSettings: defaults })
      } else {
        // Table might not exist, use defaults
        set({ userSettings: defaults })
      }
    } catch (error) {
      console.error('Load user settings error:', error)
      // Use defaults on error
      set({ userSettings: defaults })
    }
  },

  updateUserSettings: async (settings: Partial<UserSettings>) => {
    const { profile, userSettings } = get()
    if (!profile) {
      return { success: false, error: 'Not authenticated' }
    }

    // Immediately update local state for responsive UI
    const updatedSettings = {
      ...userSettings,
      ...settings,
      user_id: profile.id,
      updated_at: new Date().toISOString(),
    } as UserSettings
    set({ userSettings: updatedSettings })

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: profile.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('user_settings table not found, using local state only')
          return { success: true }
        }
        console.error('Update user settings error:', error)
        // Keep local state but don't show error for non-critical settings
        return { success: true }
      }

      return { success: true }
    } catch (error) {
      console.error('Update user settings exception:', error)
      // Keep local state, don't show error
      return { success: true }
    }
  },

  // Helper to initialize settings for new users
  initializeUserSettings: async () => {
    const { profile } = get()
    if (!profile) return

    try {
      // Initialize notification settings
      await supabase
        .from('notification_settings')
        .upsert({
          user_id: profile.id,
          push_enabled: true,
          email_enabled: true,
          wear_reminders: true,
          wear_reminder_times: ['09:00', '14:00', '21:00'],
          appointment_reminders: true,
          appointment_reminder_hours: 24,
          tray_change_reminders: true,
          message_notifications: true,
          weekly_summary: true
        })

      // Initialize user settings
      await supabase
        .from('user_settings')
        .upsert({
          user_id: profile.id,
          theme: 'system',
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          date_format: 'MM/DD/YYYY',
          time_format: '12h',
          haptic_feedback: true,
          sound_enabled: true,
          show_daily_tip: true
        })

      await get().loadNotificationSettings()
      await get().loadUserSettings()
    } catch (error) {
      console.error('Initialize user settings error:', error)
    }
  },

  // =====================================================
  // PRACTICE INFO METHODS (FOR DOCTORS)
  // =====================================================

  loadPracticeInfo: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('practice_name, practice_phone, practice_address, calendly_url, office_hours')
        .eq('id', profile.id)
        .single()

      if (data) {
        set({
          practiceInfo: {
            practice_name: data.practice_name || '',
            practice_phone: data.practice_phone || '',
            practice_address: data.practice_address || '',
            calendly_url: data.calendly_url || '',
            office_hours: data.office_hours || '',
          }
        })
      }
    } catch (error) {
      console.error('Load practice info error:', error)
    }
  },

  savePracticeInfo: async (info: Partial<PracticeInfo>) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Not authorized' }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          practice_name: info.practice_name,
          practice_phone: info.practice_phone,
          practice_address: info.practice_address,
          calendly_url: info.calendly_url,
          office_hours: info.office_hours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) {
        console.error('Save practice info error:', error)
        return { success: false, error: error.message }
      }

      // Update local state
      set({
        practiceInfo: {
          practice_name: info.practice_name || '',
          practice_phone: info.practice_phone || '',
          practice_address: info.practice_address || '',
          calendly_url: info.calendly_url || '',
          office_hours: info.office_hours || '',
        }
      })

      return { success: true }
    } catch (error: any) {
      console.error('Save practice info exception:', error)
      return { success: false, error: error.message }
    }
  },

  hasPracticeInfo: () => {
    const { practiceInfo } = get()
    return !!(practiceInfo?.practice_name && practiceInfo?.practice_phone)
  },

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  getTodayLog: () => {
    const { todayWearMinutes } = get()
    const today = new Date().toISOString().split('T')[0]
    return { date: today, wearMinutes: todayWearMinutes }
  },

  getWeeklyProgress: () => {
    const { dailyLogs, todayWearMinutes } = get()
    const days = []
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Get Monday of current week
    const currentDayOfWeek = today.getDay()
    const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysSinceMonday)

    // Generate days Monday through Sunday
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      const log = dailyLogs.find(l => l.date === dateStr)
      let hours = 0

      if (dateStr === todayStr) {
        hours = todayWearMinutes / 60
      } else if (log) {
        hours = log.wear_minutes / 60
      }

      days.push({
        date: dateStr,
        hours: Math.round(hours * 10) / 10,
      })
    }
    return days
  },

  getComplianceStats: () => {
    const { dailyLogs, patient } = get()
    const targetMinutes = (patient?.target_hours_per_day || 22) * 60

    // Calculate weekly average
    const weeklyLogs = dailyLogs.slice(0, 7)
    const weeklyTotal = weeklyLogs.reduce((sum, log) => sum + (log.wear_minutes || 0), 0)
    const weeklyAverage = weeklyLogs.length > 0 ? weeklyTotal / weeklyLogs.length / 60 : 0

    // Calculate monthly average
    const monthlyLogs = dailyLogs.slice(0, 30)
    const monthlyTotal = monthlyLogs.reduce((sum, log) => sum + (log.wear_minutes || 0), 0)
    const monthlyAverage = monthlyLogs.length > 0 ? monthlyTotal / monthlyLogs.length / 60 : 0

    // Calculate streak (consecutive days meeting target)
    let streak = 0
    for (const log of dailyLogs) {
      if ((log.wear_minutes || 0) >= targetMinutes * 0.9) {
        streak++
      } else {
        break
      }
    }

    return {
      weeklyAverage: Math.round(weeklyAverage * 10) / 10,
      monthlyAverage: Math.round(monthlyAverage * 10) / 10,
      streak
    }
  },
}))
