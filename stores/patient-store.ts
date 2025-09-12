// stores/patient-store.ts - FIXED VERSION WITH CORRECT DATABASE RELATIONSHIPS
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface EnhancedPatientState {
  // Existing data
  patient: any | null
  profile: any | null
  loading: boolean
  error: string | null
  todayWearMinutes: number
  unreadMessages: number
  dailyLogs: any[]
  trayChanges: any[]
  appointments: any[]
  messages: any[]
  currentSession: any | null
  
  // Role-based data
  userRole: 'patient' | 'doctor' | 'admin'
  assignedDoctor: any | null
  assignedPatients: any[]
  invitations: any[]
  
  // Auth state
  isAuthenticated: boolean
  
  // Actions
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name: string, role?: string, invitationCode?: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  clearAuth: () => void
  
  // Role-specific actions
  acceptInvitation: (invitationCode: string) => Promise<{ success: boolean; error?: string; doctorId?: string }>
  createPatientInvitation: (patientEmail: string) => Promise<{ success: boolean; invitationCode?: string; error?: string }>
  loadAssignedDoctor: () => Promise<void>
  loadAssignedPatients: () => Promise<void>
  loadInvitations: () => Promise<void>
  sendMessageToDoctor: (content: string) => Promise<void>
  sendMessageToPatient: (patientId: string, content: string) => Promise<void>
  
  // Existing actions
  loadPatientData: () => Promise<void>
  loadDailyLogs: () => Promise<void>
  loadTrayChanges: () => Promise<void>
  loadAppointments: () => Promise<void>
  loadMessages: () => Promise<void>
  startWearSession: () => Promise<void>
  stopWearSession: () => Promise<void>
  addWearMinutes: (minutes: number) => Promise<void>
  logTrayChange: (trayNumber: number, fitStatus: string) => Promise<void>
  addMessage: (content: string, sender: string) => void
  markMessagesRead: () => void
  getTodayLog: () => any
  getWeeklyProgress: () => { date: string; hours: number }[]
}

export const usePatientStore = create<EnhancedPatientState>((set, get) => ({
  // Initial state
  patient: null,
  profile: null,
  loading: false,
  error: null,
  todayWearMinutes: 0,
  unreadMessages: 0,
  dailyLogs: [],
  trayChanges: [],
  appointments: [],
  messages: [],
  currentSession: null,
  userRole: 'patient',
  assignedDoctor: null,
  assignedPatients: [],
  invitations: [],
  isAuthenticated: false,

  // Clear all auth state
  clearAuth: () => {
    set({
      patient: null,
      profile: null,
      todayWearMinutes: 0,
      unreadMessages: 0,
      dailyLogs: [],
      trayChanges: [],
      appointments: [],
      messages: [],
      currentSession: null,
      userRole: 'patient',
      assignedDoctor: null,
      assignedPatients: [],
      invitations: [],
      isAuthenticated: false,
      loading: false,
      error: null,
    })
  },

  // Enhanced initialize
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
        
        if (profile.role === 'patient') {
          await get().loadPatientData()
          await get().loadAssignedDoctor()
        } else if (profile.role === 'doctor') {
          await get().loadAssignedPatients()
          await get().loadInvitations()
        }
        
        await get().loadMessages()
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

  // Accept invitation (for patients) - REAL IMPLEMENTATION
  acceptInvitation: async (invitationCode: string) => {
    try {
      console.log('Looking for invitation with code:', invitationCode)
      
      // Look up the invitation in the database
      const { data: invitation, error: inviteError } = await supabase
        .from('patient_invitations')
        .select('*, profiles!patient_invitations_doctor_id_fkey(*)')
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending')
        .single()

      if (inviteError || !invitation) {
        console.log('Invitation not found or error:', inviteError)
        return { success: false, error: 'Invalid or expired invitation code' }
      }

      const { profile } = get()
      if (!profile) {
        return { success: false, error: 'User not authenticated' }
      }

      // Create doctor-patient relationship
      const { error: relationshipError } = await supabase
        .from('doctor_patients')
        .insert({
          doctor_id: invitation.doctor_id,
          patient_id: profile.id,
          status: 'active'
        })

      if (relationshipError) {
        console.error('Relationship creation error:', relationshipError)
        return { success: false, error: 'Failed to establish doctor-patient relationship' }
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('patient_invitations')
        .update({ 
          status: 'accepted'
        })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('Invitation update error:', updateError)
      }

      // Set the assigned doctor
      set({ assignedDoctor: invitation.profiles })
      
      return { 
        success: true, 
        doctorId: invitation.doctor_id 
      }
    } catch (error) {
      console.error('Accept invitation error:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  // Create patient invitation (for doctors) - REAL IMPLEMENTATION
  createPatientInvitation: async (patientEmail: string) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Only doctors can create invitations' }
    }

    try {
      // Generate a proper invitation code
      const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase()

      // Create invitation in database
      const { data: invitation, error: insertError } = await supabase
        .from('patient_invitations')
        .insert({
          doctor_id: profile.id,
          patient_email: patientEmail,
          invitation_code: invitationCode,
          status: 'pending'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert invitation error:', insertError)
        return { success: false, error: insertError.message }
      }

      // Reload invitations to update UI
      await get().loadInvitations()
      
      return { success: true, invitationCode }
    } catch (error) {
      console.error('Create invitation error:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  // Load assigned doctor for patients - CORRECTED VERSION
  loadAssignedDoctor: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'patient') return

    try {
      const { data: relationship, error } = await supabase
        .from('doctor_patients')
        .select(`
          doctor_id,
          profiles!doctor_patients_doctor_id_fkey (
            id, name, email, role
          )
        `)
        .eq('patient_id', profile.id)
        .eq('status', 'active')
        .single()

      if (error) {
        console.log('No assigned doctor found:', error)
        set({ assignedDoctor: null })
        return
      }

      if (relationship?.profiles) {
        set({ assignedDoctor: relationship.profiles })
      }
    } catch (error) {
      console.error('Load assigned doctor error:', error)
      set({ assignedDoctor: null })
    }
  },

  // Load assigned patients for doctors - COMPLETELY FIXED VERSION
  loadAssignedPatients: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      console.log('Loading assigned patients for doctor:', profile.id)
      
      // First get the doctor-patient relationships
      const { data: relationships, error: relationError } = await supabase
        .from('doctor_patients')
        .select(`
          patient_id,
          status,
          assigned_date
        `)
        .eq('doctor_id', profile.id)
        .eq('status', 'active')

      if (relationError) {
        console.error('Load relationships error:', relationError)
        set({ assignedPatients: [] })
        return
      }

      if (!relationships || relationships.length === 0) {
        console.log('No patient relationships found')
        set({ assignedPatients: [] })
        return
      }

      console.log('Found relationships:', relationships)

      // Get patient profile info
      const patientIds = relationships.map(r => r.patient_id)
      const { data: patientProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('id', patientIds)

      if (profileError) {
        console.error('Load patient profiles error:', profileError)
        set({ assignedPatients: [] })
        return
      }

      console.log('Found patient profiles:', patientProfiles)

      // Get patient data (treatment info) - this may not exist for all patients
      const { data: patientsData, error: patientError } = await supabase
        .from('patients')
        .select('id, user_id, current_tray, total_trays, target_hours_per_day')
        .in('user_id', patientIds)

      // Don't fail if patients data doesn't exist - it will be created when they first log in
      if (patientError) {
        console.log('Patients data not found (this is okay):', patientError)
      }

      console.log('Found patients data:', patientsData)

      // Combine the data
      const patients = patientProfiles?.map(profile => {
        const patientData = patientsData?.find(p => p.user_id === profile.id)
        return {
          ...profile,
          patientData: patientData || null
        }
      }) || []
      
      console.log('Combined patient data:', patients)
      set({ assignedPatients: patients })

    } catch (error) {
      console.error('Load assigned patients error:', error)
      set({ assignedPatients: [] })
    }
  },

  // Load invitations for doctors - REAL IMPLEMENTATION
  loadInvitations: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      const { data: invitations, error } = await supabase
        .from('patient_invitations')
        .select('*')
        .eq('doctor_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Load invitations error:', error)
        return
      }

      if (invitations) {
        set({ invitations })
      }
    } catch (error) {
      console.error('Load invitations error:', error)
    }
  },

  // Send message to doctor (for patients) - REAL IMPLEMENTATION
  sendMessageToDoctor: async (content: string) => {
    const { profile, assignedDoctor } = get()
    if (!profile || !assignedDoctor || profile.role !== 'patient') return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          recipient_id: assignedDoctor.id,
          content,
          read: false
        })

      if (error) throw error

      await get().loadMessages()
    } catch (error) {
      console.error('Send message to doctor error:', error)
    }
  },

  // Send message to patient (for doctors) - REAL IMPLEMENTATION
  sendMessageToPatient: async (patientId: string, content: string) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          recipient_id: patientId,
          content,
          read: false
        })

      if (error) throw error

      await get().loadMessages()
    } catch (error) {
      console.error('Send message to patient error:', error)
    }
  },

  // Enhanced sign up
  signUp: async (email: string, password: string, name: string, role: string = 'patient', invitationCode?: string) => {
    try {
      console.log('Store signUp called with:', { email, name, role, invitationCode })
      set({ loading: true })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: role
          }
        }
      })

      console.log('Supabase signUp response:', { data: data ? 'received' : 'null', error })

      if (error) {
        console.log('Supabase signUp error:', error)
        set({ loading: false })
        return { error }
      }

      if (data.user) {
        console.log('User created, setting up profile...')
        
        // Wait for profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Update profile with role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', data.user.id)

        if (updateError) {
          console.log('Profile update error:', updateError)
        }

        // If patient with invitation code, accept invitation
        if (role === 'patient' && invitationCode) {
          console.log('Accepting invitation for patient...')
          const inviteResult = await get().acceptInvitation(invitationCode)
          console.log('Invitation result:', inviteResult)
        }

        const profile = { 
          id: data.user.id, 
          email: email, 
          name: name,
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        console.log('Setting profile and auth state:', profile)
        
        set({ 
          profile,
          userRole: role as 'patient' | 'doctor',
          isAuthenticated: true
        })

        if (role === 'patient') {
          console.log('Loading patient data...')
          await get().loadPatientData()
          await get().loadAssignedDoctor()
        } else if (role === 'doctor') {
          console.log('Loading doctor data...')
          await get().loadAssignedPatients()
          await get().loadInvitations()
        }
        
        console.log('SignUp completed successfully')
      }

      set({ loading: false })
      return {}
    } catch (error) {
      console.error('SignUp exception:', error)
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
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
      }
      
      get().clearAuth()
      
      console.log('Successfully signed out')
    } catch (error) {
      console.error('Sign out error:', error)
      get().clearAuth()
    }
  },

  // Keep all existing methods (loadPatientData, loadMessages, etc.) unchanged
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

        const store = get()
        await Promise.all([
          store.loadDailyLogs(),
          store.loadTrayChanges(), 
          store.loadAppointments()
        ])
      }
    } catch (error) {
      console.error('Load patient data error:', error)
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

  loadDailyLogs: async () => {
    const { patient } = get()
    if (!patient?.id) return

    try {
      const { data: dailyLogs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('patient_id', patient.id)
        .order('date', { ascending: false })
        .limit(30)

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
    const { patient } = get()
    if (!patient?.id) return

    try {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('starts_at', { ascending: true })

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

  startWearSession: async () => {
    const { patient } = get()
    if (!patient?.id) return

    try {
      const { data: session, error } = await supabase
        .from('wear_sessions')
        .insert({
          patient_id: patient.id,
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
    const { patient, todayWearMinutes } = get()
    if (!patient?.id) return

    const today = new Date().toISOString().split('T')[0]
    const newTotal = todayWearMinutes + minutes

    try {
      const { error } = await supabase
        .from('daily_logs')
        .upsert({
          patient_id: patient.id,
          date: today,
          wear_minutes: newTotal,
          comfort_level: 8,
          fit_ok: true
        })

      if (error) throw error

      set({ todayWearMinutes: newTotal })
    } catch (error) {
      console.error('Add wear minutes error:', error)
    }
  },

  logTrayChange: async (trayNumber: number, fitStatus: string) => {
    const { patient, profile } = get()
    if (!patient?.id || !profile?.id) return

    try {
      await supabase
        .from('tray_changes')
        .insert({
          patient_id: patient.id,
          tray_number: trayNumber,
          date_changed: new Date().toISOString(),
          fit_status: fitStatus
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

  markMessagesRead: () => {
    set({ unreadMessages: 0 })
  },

  getTodayLog: () => {
    const { todayWearMinutes } = get()
    const today = new Date().toISOString().split('T')[0]
    return { date: today, wearMinutes: todayWearMinutes }
  },

  getWeeklyProgress: () => {
    const { dailyLogs, todayWearMinutes } = get()
    const days = []
    const today = new Date().toISOString().split('T')[0]
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const log = dailyLogs.find(l => l.date === dateStr)
      let hours = 0
      
      if (dateStr === today) {
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
}))