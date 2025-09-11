// stores/patient-store.ts - SIMPLIFIED VERSION
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface PatientState {
  // Data
  patient: any | null
  profile: any | null
  loading: boolean
  error: string | null
  
  // Computed
  todayWearMinutes: number
  unreadMessages: number
  
  // Mock data for testing
  dailyLogs: any[]
  trayChanges: any[]
  appointments: any[]
  messages: any[]
  currentSession: any | null
  
  // Actions
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  
  // Mock functions to keep existing UI working
  startWearSession: () => void
  stopWearSession: () => void
  addWearMinutes: (minutes: number) => void
  logTrayChange: (trayNumber: number, fitStatus: string) => void
  sendMessage: (recipientId: string, content: string) => void
  markMessagesRead: () => void
  getTodayLog: () => any
  getWeeklyProgress: () => { date: string; hours: number }[]
}

export const usePatientStore = create<PatientState>((set, get) => ({
  // Initial state
  patient: {
    id: '1',
    name: 'Demo Patient',
    email: 'demo@biolign.com',
    targetHoursPerDay: 22,
    totalTrays: 24,
    currentTray: 8,
    createdAt: new Date('2024-01-15'),
  },
  profile: null,
  loading: false,
  error: null,
  todayWearMinutes: 18 * 60 + 45, // 18 hours 45 minutes
  unreadMessages: 1,
  
  // Mock data to keep existing UI working
  dailyLogs: [],
  trayChanges: [
    {
      id: '1',
      patientId: '1',
      trayNumber: 7,
      dateChanged: '2024-12-01',
      fitStatus: 'ok',
      createdAt: new Date('2024-12-01'),
    },
    {
      id: '2',
      patientId: '1',
      trayNumber: 8,
      dateChanged: '2024-12-15',
      fitStatus: 'ok',
      createdAt: new Date('2024-12-15'),
    },
  ],
  appointments: [
    {
      id: '1',
      patientId: '1',
      startsAt: new Date('2025-01-20T10:00:00'),
      endsAt: new Date('2025-01-20T10:30:00'),
      purpose: 'Aligner Check',
      location: 'BioLign Orthodontics, 123 Main St',
      provider: 'Dr. Smith',
      status: 'scheduled',
    },
  ],
  messages: [
    {
      id: '1',
      patientId: '1',
      sender: 'doctor',
      content: 'Great progress on your current tray! Keep up the excellent wear time.',
      createdAt: new Date('2024-12-10T09:00:00'),
      read: true,
    },
    {
      id: '2',
      patientId: '1',
      sender: 'doctor',
      content: 'Your next appointment is scheduled for January 20th.',
      createdAt: new Date('2024-12-11T08:15:00'),
      read: false,
    },
  ],
  currentSession: null,

  // Initialize - simplified
  initialize: async () => {
    try {
      set({ loading: true, error: null })
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        set({ 
          profile: { 
            id: user.id, 
            email: user.email, 
            name: user.user_metadata?.name || 'User',
            role: 'patient' 
          } 
        })
      }
      
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  // Simplified auth functions
  signUp: async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      })

      if (error) return { error }

      // Set profile immediately without database
      if (data.user) {
        set({ 
          profile: { 
            id: data.user.id, 
            email: data.user.email, 
            name: name,
            role: 'patient' 
          } 
        })
      }

      return {}
    } catch (error) {
      return { error }
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) return { error }

      if (data.user) {
        const profile = { 
          id: data.user.id, 
          email: data.user.email, 
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          role: 'patient' 
        }
        
        const patient = {
          id: data.user.id,
          name: profile.name,
          email: data.user.email || '',
          targetHoursPerDay: 22,
          totalTrays: 24,
          currentTray: 8,
          createdAt: new Date(),
        }
        
        set({ profile, patient })
      }

      return {}
    } catch (error) {
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
    })
  },

  // Mock functions to keep existing UI working
  startWearSession: () => {
    const session = {
      id: Date.now().toString(),
      startTime: new Date(),
      isActive: true,
    }
    set({ currentSession: session })
  },

  stopWearSession: () => {
    const { currentSession } = get()
    if (currentSession) {
      const endTime = new Date()
      const sessionMinutes = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / (1000 * 60))
      
      set((state) => ({
        currentSession: null,
        todayWearMinutes: state.todayWearMinutes + sessionMinutes,
      }))
    }
  },

  addWearMinutes: (minutes) => {
    set((state) => ({
      todayWearMinutes: state.todayWearMinutes + minutes,
    }))
  },

  logTrayChange: (trayNumber, fitStatus) => {
    console.log(`Logged tray change: ${trayNumber}, ${fitStatus}`)
    // Update current tray in patient object
    set((state) => ({
      patient: state.patient ? { ...state.patient, currentTray: trayNumber } : null,
    }))
  },

  sendMessage: (recipientId, content) => {
    console.log(`Message sent to ${recipientId}: ${content}`)
  },

  markMessagesRead: () => {
    set({ unreadMessages: 0 })
  },

  getTodayLog: () => {
    const today = new Date().toISOString().split('T')[0]
    return { date: today, wearMinutes: get().todayWearMinutes }
  },

  getWeeklyProgress: () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Mock data for demonstration
      const baseHours = 20 + Math.random() * 4
      const hours = i === 0 ? get().todayWearMinutes / 60 : baseHours
      
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