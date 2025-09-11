// stores/patient-store.ts - COMPLETE REPLACEMENT
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
  
  // Actions
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name: string, role?: string, invitationCode?: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  
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

  // Enhanced initialize
  initialize: async () => {
    try {
      set({ loading: true, error: null })
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile error:', profileError)
        }

        if (profile) {
          set({ 
            profile,
            userRole: profile.role || 'patient'
          })
          
          if (profile.role === 'patient') {
            await get().loadPatientData()
            await get().loadAssignedDoctor()
          } else if (profile.role === 'doctor') {
            await get().loadAssignedPatients()
            await get().loadInvitations()
          }
          
          await get().loadMessages()
        }
      }
      
      set({ loading: false })
    } catch (error) {
      console.error('Initialize error:', error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  // Accept invitation (for patients)
  acceptInvitation: async (invitationCode: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_patient_invitation', {
        invitation_code_param: invitationCode
      })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Accept invitation error:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  // Create patient invitation (for doctors)
  createPatientInvitation: async (patientEmail: string) => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Only doctors can create invitations' }
    }

    try {
      // Generate invitation code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_invitation_code')
      if (codeError) throw codeError

      const invitationCode = codeData

      // Create invitation
      const { error: insertError } = await supabase
        .from('patient_invitations')
        .insert({
          doctor_id: profile.id,
          patient_email: patientEmail,
          invitation_code: invitationCode,
          status: 'pending'
        })

      if (insertError) throw insertError

      await get().loadInvitations()
      
      return { success: true, invitationCode }
    } catch (error) {
      console.error('Create invitation error:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  // Load assigned doctor for patients
  loadAssignedDoctor: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'patient') return

    try {
      const { data: assignment } = await supabase
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

      if (assignment?.profiles) {
        set({ assignedDoctor: assignment.profiles })
      }
    } catch (error) {
      console.error('Load assigned doctor error:', error)
    }
  },

  // Load assigned patients for doctors
  loadAssignedPatients: async () => {
    const { profile } = get()
    if (!profile || profile.role !== 'doctor') return

    try {
      const { data: assignments } = await supabase
        .from('doctor_patients')
        .select(`
          patient_id,
          profiles!doctor_patients_patient_id_fkey (
            id, name, email, role
          ),
          patients (
            id, current_tray, total_trays, target_hours_per_day
          )
        `)
        .eq('doctor_id', profile.id)
        .eq('status', 'active')

      if (assignments) {
        const patients = assignments.map(assignment => ({
          ...assignment.profiles,
          patientData: assignment.patients?.[0] || null
        }))
        set({ assignedPatients: patients })
      }
    } catch (error) {
      console.error('Load assigned patients error:', error)
    }
  },

  // Load invitations for doctors
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

  // Send message to doctor (for patients)
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

  // Send message to patient (for doctors)
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

      if (error) {
        set({ loading: false })
        return { error }
      }

      if (data.user) {
        // Wait for profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Update profile with role
        await supabase
          .from('profiles')
          .update({ role })
          .eq('id', data.user.id)

        // If patient with invitation code, accept invitation
        if (role === 'patient' && invitationCode) {
          await get().acceptInvitation(invitationCode)
        }

        const profile = { 
          id: data.user.id, 
          email: email, 
          name: name,
          role: role 
        }
        
        set({ 
          profile,
          userRole: role as 'patient' | 'doctor'
        })

        if (role === 'patient') {
          await get().loadPatientData()
          await get().loadAssignedDoctor()
        } else if (role === 'doctor') {
          await get().loadAssignedPatients()
          await get().loadInvitations()
        }
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
    await supabase.auth.signOut()
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
    })
  },

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
          sender: msg.sender_id === profile.id ? 'patient' : 'doctor',
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

// Set up auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    usePatientStore.getState().initialize()
  } else if (event === 'SIGNED_OUT') {
    usePatientStore.getState().signOut()
  }
})