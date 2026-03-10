// stores/patient-store.ts - PMS API Version
import { create } from 'zustand'
import { whoami, standalonePatientApi, standaloneDoctorApi, linkedPatientApi } from '@/lib/api'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

type UserType = 'linked' | 'standalone_patient' | 'standalone_doctor' | 'none'

interface TrayChange {
  id: number
  fromTray: number
  toTray: number
  changeDate: string
  fitStatus: string
  notes: string
}

interface WearLog {
  id: number
  date: string
  wearMinutes: number
  wearSeconds?: number
  targetMinutes: number
  trayNumber: number
  compliancePercent?: number
}

interface Doctor {
  id: number
  name: string
  email: string
  practiceName: string
  practicePhone: string
  practiceAddress: string
  calendlyUrl: string
  officeHours: string
  doctorCode?: string
}

interface Patient {
  id: number
  name: string
  email: string
  currentTray: number
  totalTrays: number
  daysPerTray?: number
  dailyWearTarget?: number
  startDate?: string
  assignedDate?: string
  weeklyCompliance?: number
}

interface PatientState {
  // User type
  userType: UserType

  // Core data
  profile: any | null
  patient: Patient | null
  loading: boolean
  error: string | null

  // Treatment tracking
  todayWearMinutes: number
  todayWearSeconds: number
  dailyLogs: WearLog[]
  trayChanges: TrayChange[]
  currentSession: { id: number; startTime: Date } | null

  // Doctor data (for standalone doctors)
  doctorCode: string | null
  assignedDoctor: Doctor | null
  assignedPatients: Patient[]
  invitations: any[]

  // Treatment state
  hasTreatment: boolean

  // Linked patient practice
  linkedPracticeName: string | null

  // Settings
  userSettings: any | null
  notificationSettings: any | null
  practiceInfo: any | null

  // Auth state
  isAuthenticated: boolean

  // =====================================================
  // AUTH ACTIONS
  // =====================================================
  initialize: () => Promise<void>
  clearAuth: () => void
  signOut: () => Promise<void>

  // =====================================================
  // REGISTRATION ACTIONS
  // =====================================================
  registerStandalonePatient: (data: { name?: string; email?: string }) => Promise<{ error?: string }>
  registerStandaloneDoctor: (data: { name?: string; practiceName?: string; practicePhone?: string; practiceAddress?: string }) => Promise<{ error?: string }>

  // =====================================================
  // PATIENT DATA ACTIONS
  // =====================================================
  loadPatientData: () => Promise<void>
  loadDailyLogs: () => Promise<void>
  loadTrayChanges: () => Promise<void>

  // =====================================================
  // WEAR TRACKING ACTIONS
  // =====================================================
  startWearSession: () => Promise<void>
  stopWearSession: () => Promise<void>
  loadTodayWearTime: () => Promise<void>

  // =====================================================
  // TRAY MANAGEMENT ACTIONS
  // =====================================================
  logTrayChange: (trayNumber: number, fitStatus: string, notes?: string) => Promise<void>

  // =====================================================
  // DOCTOR-PATIENT RELATIONSHIP ACTIONS
  // =====================================================
  loadAssignedDoctor: () => Promise<void>
  loadAssignedPatients: () => Promise<void>
  loadInvitations: () => Promise<void>
  getDoctorCode: () => Promise<string | null>
  joinDoctorByCode: (code: string) => Promise<{ success: boolean; error?: string }>
  createPatientInvitation: (patientEmail: string) => Promise<{ success: boolean; invitationCode?: string; error?: string }>
  getPatientById: (patientId: number) => Promise<any | null>

  // =====================================================
  // SETTINGS ACTIONS
  // =====================================================
  loadPracticeInfo: () => Promise<void>
  savePracticeInfo: (info: any) => Promise<{ success: boolean; error?: string }>
  hasPracticeInfo: () => boolean
  updateProfile: (data: any) => Promise<{ success: boolean; error?: string }>

  // =====================================================
  // APPOINTMENT ACTIONS (PMS-linked patients only)
  // =====================================================
  appointments: { upcoming: any[]; past: any[] }
  availableSlots: any[]
  loadAppointments: () => Promise<void>
  loadAvailableSlots: (startDate?: string, endDate?: string) => Promise<void>
  bookAppointment: (slotId: number, notes?: string) => Promise<{ success: boolean; error?: string }>
  cancelAppointment: (appointmentId: number) => Promise<{ success: boolean; error?: string }>

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================
  getTodayLog: () => { date: string; wearMinutes: number }
  getWeeklyProgress: () => { date: string; hours: number }[]
  getComplianceStats: () => { weeklyAverage: number; monthlyAverage: number; streak: number; treatmentStarted: boolean }
  getLogForDate: (dateStr: string) => { hours: number } | null
  logHoursForDate: (dateStr: string, hours: number) => Promise<{ success: boolean; error?: string }>
}

// =====================================================
// STORE IMPLEMENTATION
// =====================================================

export const usePatientStore = create<PatientState>((set, get) => ({
  // Initial state
  userType: 'none',
  profile: null,
  patient: null,
  loading: false,
  error: null,
  todayWearMinutes: 0,
  todayWearSeconds: 0,
  dailyLogs: [],
  trayChanges: [],
  currentSession: null,
  doctorCode: null,
  assignedDoctor: null,
  assignedPatients: [],
  invitations: [],
  hasTreatment: false,
  linkedPracticeName: null,
  userSettings: null,
  notificationSettings: null,
  practiceInfo: null,
  isAuthenticated: false,
  appointments: { upcoming: [], past: [] },
  availableSlots: [],

  // =====================================================
  // AUTH METHODS
  // =====================================================

  clearAuth: () => {
    set({
      userType: 'none',
      profile: null,
      patient: null,
      todayWearMinutes: 0,
      todayWearSeconds: 0,
      dailyLogs: [],
      trayChanges: [],
      currentSession: null,
      doctorCode: null,
      assignedDoctor: null,
      assignedPatients: [],
      invitations: [],
      hasTreatment: false,
      linkedPracticeName: null,
      userSettings: null,
      notificationSettings: null,
      practiceInfo: null,
      isAuthenticated: false,
      appointments: { upcoming: [], past: [] },
      availableSlots: [],
      loading: false,
      error: null,
    })
  },

  initialize: async () => {
    try {
      set({ loading: true, error: null })

      // Call whoami to determine user type
      const response = await whoami()

      if (response.error) {
        console.error('Whoami error:', response.error)
        get().clearAuth()
        return
      }

      const { data } = response
      if (!data) {
        get().clearAuth()
        return
      }

      const userType = data.type

      if (userType === 'none') {
        // User is authenticated but not registered in backend
        set({ userType: 'none', isAuthenticated: true, loading: false })
        return
      }

      set({ userType, isAuthenticated: true })

      // Load role-specific data
      if (userType === 'standalone_patient') {
        await get().loadPatientData()
      } else if (userType === 'standalone_doctor') {
        await get().loadAssignedPatients()
        await get().loadInvitations()
        await get().loadPracticeInfo()
      } else if (userType === 'linked') {
        // PMS-linked patient
        await get().loadPatientData()
      }

      set({ loading: false })
    } catch (error) {
      console.error('Initialize error:', error)
      get().clearAuth()
      set({ error: (error as Error).message, loading: false })
    }
  },

  signOut: async () => {
    get().clearAuth()
  },

  // =====================================================
  // REGISTRATION METHODS
  // =====================================================

  registerStandalonePatient: async (data) => {
    try {
      const response = await standalonePatientApi.register(data)

      if (response.error) {
        return { error: response.error.message }
      }

      // Re-initialize to load the new profile
      await get().initialize()
      return {}
    } catch (error) {
      return { error: (error as Error).message }
    }
  },

  registerStandaloneDoctor: async (data) => {
    try {
      const response = await standaloneDoctorApi.register(data)

      if (response.error) {
        return { error: response.error.message }
      }

      // Re-initialize to load the new profile
      await get().initialize()
      return {}
    } catch (error) {
      return { error: (error as Error).message }
    }
  },

  // =====================================================
  // PATIENT DATA METHODS
  // =====================================================

  loadPatientData: async () => {
    const { userType } = get()

    try {
      if (userType === 'standalone_patient') {
        const response = await standalonePatientApi.getMe()

        if (response.error || !response.data) {
          console.error('Load patient data error:', response.error)
          return
        }

        const data = response.data

        set({
          profile: {
            id: data.id,
            email: data.email,
            name: data.name,
            role: 'patient',
          },
          patient: {
            id: data.id,
            name: data.name || '',
            email: data.email,
            currentTray: data.currentTray,
            totalTrays: data.totalTrays,
            daysPerTray: data.daysPerTray,
            dailyWearTarget: data.dailyWearTarget,
            startDate: data.startDate || undefined,
          },
          hasTreatment: true,
          todayWearMinutes: data.todayWearMinutes || 0,
          todayWearSeconds: (data.todayWearMinutes || 0) * 60,
          currentSession: data.activeSession
            ? { id: data.activeSession.id, startTime: new Date(data.activeSession.startTime) }
            : null,
          assignedDoctor: data.doctor || null,
        })

        // Load related data
        await Promise.all([
          get().loadDailyLogs(),
          get().loadTrayChanges(),
        ])
      } else if (userType === 'linked') {
        const response = await linkedPatientApi.getMe()

        if (response.error || !response.data) {
          console.error('Load patient data error:', response.error)
          return
        }

        const data = response.data

        const hasActiveTreatment = !!data.treatment

        // Normalize date strings from recentWearLogs
        const normalizeDateStr = (d: string) => typeof d === 'string' && d.length > 10 ? d.split('T')[0] : d

        set({
          profile: {
            id: data.patient?.id,
            email: data.patient?.email,
            name: `${data.patient?.firstName} ${data.patient?.lastName}`,
            role: 'patient',
          },
          patient: {
            id: data.patient?.id,
            name: `${data.patient?.firstName} ${data.patient?.lastName}`,
            email: data.patient?.email || '',
            currentTray: data.treatment?.currentTray || 0,
            totalTrays: data.treatment?.totalTrays || 0,
            dailyWearTarget: data.treatment?.dailyWearTarget || 0,
            startDate: data.treatment?.startDate ? normalizeDateStr(data.treatment.startDate) : undefined,
            daysPerTray: data.treatment?.daysPerTray || 14,
          },
          hasTreatment: hasActiveTreatment,
          linkedPracticeName: data.practice?.name || null,
          todayWearMinutes: data.todayWearMinutes || 0,
          todayWearSeconds: (data.todayWearMinutes || 0) * 60,
          currentSession: data.activeSession
            ? { id: data.activeSession.id, startTime: new Date(data.activeSession.startTime) }
            : null,
        })

        // Load full wear logs from dedicated endpoint (more than the 7 from /me)
        if (hasActiveTreatment) {
          await get().loadDailyLogs()
        }
      }
    } catch (error) {
      console.error('Load patient data error:', error)
    }
  },

  loadDailyLogs: async () => {
    const { userType } = get()

    // Normalize dates from API (could be ISO datetime) to YYYY-MM-DD
    const normalizeLogs = (logs: any[]) =>
      logs.map(l => ({
        ...l,
        date: typeof l.date === 'string' && l.date.length > 10 ? l.date.split('T')[0] : l.date,
      }))

    try {
      if (userType === 'standalone_patient') {
        const response = await standalonePatientApi.getWearLogs(90)

        if (response.error || !response.data) {
          console.error('Load daily logs error:', response.error)
          return
        }

        set({ dailyLogs: normalizeLogs(response.data.logs) })
      } else if (userType === 'linked') {
        // Get last 90 days of wear logs
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const response = await linkedPatientApi.getWearLogs(startDate, endDate)

        if (response.error || !response.data) {
          console.error('Load daily logs error:', response.error)
          return
        }

        set({ dailyLogs: normalizeLogs(response.data.logs) })
      }
    } catch (error) {
      console.error('Load daily logs error:', error)
    }
  },

  loadTrayChanges: async () => {
    const { userType } = get()

    try {
      if (userType === 'standalone_patient') {
        const response = await standalonePatientApi.getTrayChanges()

        if (response.error || !response.data) {
          console.error('Load tray changes error:', response.error)
          return
        }

        set({ trayChanges: response.data.trayChanges })
      }
    } catch (error) {
      console.error('Load tray changes error:', error)
    }
  },

  // =====================================================
  // WEAR TRACKING METHODS
  // =====================================================

  startWearSession: async () => {
    const { userType } = get()

    try {
      let response
      if (userType === 'standalone_patient') {
        response = await standalonePatientApi.startWearSession()
      } else if (userType === 'linked') {
        response = await linkedPatientApi.startWearSession()
      } else {
        return
      }

      if (response.error || !response.data) {
        console.error('Start session error:', response.error)
        return
      }

      set({
        currentSession: {
          id: response.data.sessionId,
          startTime: new Date(response.data.startTime),
        },
      })
    } catch (error) {
      console.error('Start session error:', error)
    }
  },

  stopWearSession: async () => {
    const { userType, currentSession } = get()
    if (!currentSession) return

    try {
      let response
      if (userType === 'standalone_patient') {
        response = await standalonePatientApi.stopWearSession()
      } else if (userType === 'linked') {
        response = await linkedPatientApi.stopWearSession()
      } else {
        return
      }

      if (response.error || !response.data) {
        console.error('Stop session error:', response.error)
        return
      }

      // Update today's wear time
      const todayMinutes = (response.data as any).todayTotalMinutes ?? get().todayWearMinutes + response.data.durationMinutes

      set({
        currentSession: null,
        todayWearMinutes: todayMinutes,
        todayWearSeconds: todayMinutes * 60,
      })

      // Reload logs
      await get().loadDailyLogs()
    } catch (error) {
      console.error('Stop session error:', error)
    }
  },

  loadTodayWearTime: async () => {
    // This is handled by loadPatientData for standalone patients
    await get().loadPatientData()
  },

  // =====================================================
  // TRAY MANAGEMENT METHODS
  // =====================================================

  logTrayChange: async (trayNumber: number, fitStatus: string, notes?: string) => {
    const { userType, patient } = get()
    if (!patient) return

    try {
      let response
      if (userType === 'standalone_patient') {
        response = await standalonePatientApi.changeTray(trayNumber, fitStatus, notes)
      } else if (userType === 'linked') {
        response = await linkedPatientApi.changeTray(trayNumber, fitStatus, notes)
      } else {
        return
      }

      if (response.error || !response.data) {
        console.error('Log tray change error:', response.error)
        return
      }

      // Update patient's current tray
      set((state) => ({
        patient: state.patient
          ? { ...state.patient, currentTray: response.data!.newCurrentTray }
          : null,
      }))

      // Reload tray changes
      await get().loadTrayChanges()
    } catch (error) {
      console.error('Log tray change error:', error)
    }
  },

  // =====================================================
  // DOCTOR-PATIENT RELATIONSHIP METHODS
  // =====================================================

  loadAssignedDoctor: async () => {
    const { userType } = get()

    try {
      if (userType === 'standalone_patient') {
        const response = await standalonePatientApi.getDoctor()

        if (response.error || !response.data) {
          set({ assignedDoctor: null })
          return
        }

        set({ assignedDoctor: response.data.doctor || null })
      }
    } catch (error) {
      console.error('Load assigned doctor error:', error)
      set({ assignedDoctor: null })
    }
  },

  loadAssignedPatients: async () => {
    const { userType } = get()

    try {
      if (userType === 'standalone_doctor') {
        const response = await standaloneDoctorApi.getPatients()

        if (response.error || !response.data) {
          set({ assignedPatients: [] })
          return
        }

        set({ assignedPatients: response.data.patients })
      }
    } catch (error) {
      console.error('Load assigned patients error:', error)
      set({ assignedPatients: [] })
    }
  },

  loadInvitations: async () => {
    const { userType } = get()

    try {
      if (userType === 'standalone_doctor') {
        const response = await standaloneDoctorApi.getMe()

        if (response.error || !response.data) {
          set({ invitations: [] })
          return
        }

        set({ invitations: response.data.pendingInvitations || [] })
      }
    } catch (error) {
      console.error('Load invitations error:', error)
      set({ invitations: [] })
    }
  },

  getDoctorCode: async () => {
    const { userType, doctorCode } = get()

    if (doctorCode) return doctorCode

    try {
      if (userType === 'standalone_doctor') {
        const response = await standaloneDoctorApi.getMe()

        if (response.error || !response.data) {
          return null
        }

        const code = response.data.doctorCode
        set({ doctorCode: code })
        return code
      }
    } catch (error) {
      console.error('Get doctor code error:', error)
    }

    return null
  },

  joinDoctorByCode: async (code: string) => {
    const { userType } = get()

    try {
      // For standalone patients, try PMS link first, then standalone doctor
      if (userType === 'standalone_patient') {
        // Try PMS invite code first - this converts standalone to PMS patient
        const pmsResponse = await linkedPatientApi.link(code)

        if (!pmsResponse.error && pmsResponse.data) {
          // Success - user is now a PMS-linked patient
          // Reinitialize to load the new user type (will change to 'linked')
          await get().initialize()
          return { success: true, type: 'pms' }
        }

        // PMS failed, try as standalone doctor code
        const standaloneResponse = await standalonePatientApi.joinDoctor(code)

        if (!standaloneResponse.error) {
          // Success - reload assigned doctor
          await get().loadAssignedDoctor()
          return { success: true, type: 'standalone' }
        }

        // Both failed
        return { success: false, error: 'Invalid code. Please check and try again.' }
      }

      // For new users (type === 'none'), try both code types
      if (userType === 'none') {
        // First try as PMS invite code
        const pmsResponse = await linkedPatientApi.link(code)

        if (!pmsResponse.error && pmsResponse.data) {
          // Success - user is now a PMS-linked patient
          // Reinitialize to load the new user type
          await get().initialize()
          return { success: true, type: 'pms' }
        }

        // If PMS failed, try as standalone doctor code
        // But first we need to register as standalone patient
        const registerResponse = await standalonePatientApi.register({})

        if (registerResponse.error) {
          return { success: false, error: 'Failed to create account' }
        }

        // Now try joining the doctor
        const standaloneResponse = await standalonePatientApi.joinDoctor(code)

        if (!standaloneResponse.error) {
          // Success - reinitialize to load data
          await get().initialize()
          return { success: true, type: 'standalone' }
        }

        // Both failed - invalid code
        return { success: false, error: 'Invalid code. Please check and try again.' }
      }

      return { success: false, error: 'Cannot link with this account type' }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  createPatientInvitation: async (patientEmail: string) => {
    const { userType } = get()

    try {
      if (userType !== 'standalone_doctor') {
        return { success: false, error: 'Only doctors can create invitations' }
      }

      const response = await standaloneDoctorApi.invite(patientEmail)

      if (response.error) {
        return { success: false, error: response.error.message }
      }

      // Reload invitations
      await get().loadInvitations()

      return { success: true, invitationCode: response.data?.doctorCode }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  getPatientById: async (patientId: number) => {
    const { userType } = get()

    try {
      if (userType !== 'standalone_doctor') {
        return null
      }

      const response = await standaloneDoctorApi.getPatient(patientId)

      if (response.error || !response.data) {
        return null
      }

      return response.data
    } catch (error) {
      console.error('Get patient by ID error:', error)
      return null
    }
  },

  // =====================================================
  // SETTINGS METHODS
  // =====================================================

  loadPracticeInfo: async () => {
    const { userType } = get()

    try {
      if (userType === 'standalone_doctor') {
        const response = await standaloneDoctorApi.getMe()

        if (response.error || !response.data) {
          return
        }

        const data = response.data

        set({
          profile: {
            id: data.id,
            email: data.email,
            name: data.name,
            role: 'doctor',
          },
          doctorCode: data.doctorCode,
          practiceInfo: {
            practice_name: data.practiceName || '',
            practice_phone: data.practicePhone || '',
            practice_address: data.practiceAddress || '',
            calendly_url: data.calendlyUrl || '',
            office_hours: data.officeHours || '',
          },
        })
      }
    } catch (error) {
      console.error('Load practice info error:', error)
    }
  },

  savePracticeInfo: async (info: any) => {
    const { userType } = get()

    try {
      if (userType !== 'standalone_doctor') {
        return { success: false, error: 'Not authorized' }
      }

      const response = await standaloneDoctorApi.updateProfile({
        practiceName: info.practice_name,
        practicePhone: info.practice_phone,
        practiceAddress: info.practice_address,
        calendlyUrl: info.calendly_url,
        officeHours: info.office_hours,
      })

      if (response.error) {
        return { success: false, error: response.error.message }
      }

      // Update local state
      set({
        practiceInfo: {
          practice_name: info.practice_name || '',
          practice_phone: info.practice_phone || '',
          practice_address: info.practice_address || '',
          calendly_url: info.calendly_url || '',
          office_hours: info.office_hours || '',
        },
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  hasPracticeInfo: () => {
    const { practiceInfo } = get()
    return !!(practiceInfo?.practice_name && practiceInfo?.practice_phone)
  },

  updateProfile: async (data: any) => {
    const { userType } = get()

    try {
      if (userType === 'standalone_patient') {
        const response = await standalonePatientApi.updateProfile(data)
        if (response.error) {
          return { success: false, error: response.error.message }
        }
        await get().loadPatientData()
        return { success: true }
      } else if (userType === 'standalone_doctor') {
        const response = await standaloneDoctorApi.updateProfile(data)
        if (response.error) {
          return { success: false, error: response.error.message }
        }
        await get().loadPracticeInfo()
        return { success: true }
      }
      return { success: false, error: 'Unknown user type' }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  // =====================================================
  // APPOINTMENT METHODS (PMS-linked patients only)
  // =====================================================

  loadAppointments: async () => {
    const { userType } = get()

    try {
      if (userType === 'linked') {
        const response = await linkedPatientApi.getAppointments()

        if (response.error || !response.data) {
          console.error('Load appointments error:', response.error)
          return
        }

        set({ appointments: response.data })
      }
    } catch (error) {
      console.error('Load appointments error:', error)
    }
  },

  loadAvailableSlots: async (startDate?: string, endDate?: string) => {
    const { userType } = get()

    try {
      if (userType === 'linked') {
        const response = await linkedPatientApi.getAvailableSlots(startDate, endDate)

        if (response.error || !response.data) {
          console.error('Load available slots error:', response.error)
          set({ availableSlots: [] })
          return
        }

        // Temporary debug logging - remove after fixing missing dates
        if (response.data._debug) {
          console.log('=== AVAILABLE SLOTS DEBUG ===')
          console.log('Practice source:', response.data._debug.practiceSource)
          console.log('Date range:', response.data._debug.requestedRange)
          console.log('All schedules in DB:', JSON.stringify(response.data._debug.allSchedulesInRange, null, 2))
          console.log('Matched (active + unbooked):', JSON.stringify(response.data._debug.matchedSchedules, null, 2))
          console.log('============================')
        }

        set({ availableSlots: response.data.slots })
      }
    } catch (error) {
      console.error('Load available slots error:', error)
      set({ availableSlots: [] })
    }
  },

  bookAppointment: async (slotId: number, notes?: string) => {
    const { userType } = get()

    try {
      if (userType !== 'linked') {
        return { success: false, error: 'Only PMS-linked patients can book appointments' }
      }

      const response = await linkedPatientApi.bookAppointment(slotId, notes)

      if (response.error) {
        return { success: false, error: response.error.message }
      }

      // Reload appointments and available slots
      await Promise.all([
        get().loadAppointments(),
        get().loadAvailableSlots(),
      ])

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  cancelAppointment: async (appointmentId: number) => {
    const { userType } = get()

    try {
      if (userType !== 'linked') {
        return { success: false, error: 'Only PMS-linked patients can cancel appointments' }
      }

      const response = await linkedPatientApi.cancelAppointment(appointmentId)

      if (response.error) {
        return { success: false, error: response.error.message }
      }

      // Reload appointments
      await get().loadAppointments()

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
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
    const { dailyLogs, todayWearSeconds, patient, currentSession } = get()
    const days: { date: string; hours: number }[] = []
    const now = new Date()
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`

    // Calculate current session elapsed time if timer is running
    let currentSessionSeconds = 0
    if (currentSession?.startTime) {
      currentSessionSeconds = Math.floor((now.getTime() - currentSession.startTime.getTime()) / 1000)
    }

    // Get Monday of current week (using UTC to avoid timezone-induced duplicate dates)
    const currentDayOfWeek = now.getUTCDay()
    const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
    const mondayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday)

    // Generate days Monday through Sunday
    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayMs + i * 86400000)
      const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`

      const log = dailyLogs.find(l => l.date === dateStr)
      let hours = 0

      if (dateStr === todayStr) {
        hours = ((todayWearSeconds || 0) + currentSessionSeconds) / 3600
      } else if (log) {
        const seconds = log.wearSeconds ?? log.wearMinutes * 60
        hours = seconds / 3600
      }

      days.push({
        date: dateStr,
        hours: Math.round(hours * 10) / 10,
      })
    }

    return days
  },

  getComplianceStats: () => {
    const { dailyLogs, patient, assignedDoctor, userType, hasTreatment } = get()
    const targetHours = (patient?.dailyWearTarget || 1320) / 60 // Convert minutes to hours
    const targetSeconds = targetHours * 3600

    // For standalone: need an assigned doctor. For linked: need an active treatment.
    const hasActiveTreatment = userType === 'linked' ? hasTreatment : !!assignedDoctor
    if (!hasActiveTreatment) {
      return {
        weeklyAverage: 0,
        monthlyAverage: 0,
        streak: 0,
        treatmentStarted: false,
      }
    }

    const getLogSeconds = (log: WearLog) => {
      return log.wearSeconds ?? log.wearMinutes * 60
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const treatmentStart = patient?.startDate || todayStr

    // Calculate weekly average (only count days since treatment started, max 7)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)
    const weekStartDate = sevenDaysAgo.toISOString().split('T')[0]
    const effectiveWeekStart = treatmentStart > weekStartDate ? treatmentStart : weekStartDate

    const weeklyLogs = dailyLogs.filter(log => log.date >= effectiveWeekStart && log.date <= todayStr)
    const weeklyTotalSeconds = weeklyLogs.reduce((sum, log) => sum + getLogSeconds(log), 0)
    // Days since treatment started within this week (at least 1 to avoid division by zero)
    const daysSinceTreatmentInWeek = Math.max(1, Math.min(7,
      Math.floor((today.getTime() - new Date(effectiveWeekStart).getTime()) / (24 * 60 * 60 * 1000)) + 1
    ))
    const weeklyAverage = weeklyTotalSeconds / daysSinceTreatmentInWeek / 3600

    // Calculate monthly average (only count days since treatment started, max 30)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 29)
    const monthStartDate = thirtyDaysAgo.toISOString().split('T')[0]
    const effectiveMonthStart = treatmentStart > monthStartDate ? treatmentStart : monthStartDate

    const monthlyLogs = dailyLogs.filter(log => log.date >= effectiveMonthStart && log.date <= todayStr)
    const monthlyTotalSeconds = monthlyLogs.reduce((sum, log) => sum + getLogSeconds(log), 0)
    const daysSinceTreatmentInMonth = Math.max(1, Math.min(30,
      Math.floor((today.getTime() - new Date(effectiveMonthStart).getTime()) / (24 * 60 * 60 * 1000)) + 1
    ))
    const monthlyAverage = monthlyTotalSeconds / daysSinceTreatmentInMonth / 3600

    // Calculate streak
    const minimumSecondsForDay = targetSeconds * 0.5
    let streak = 0
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - 1)

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const log = dailyLogs.find(l => l.date === dateStr)

      if (log && getLogSeconds(log) >= minimumSecondsForDay) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return {
      weeklyAverage: Math.round(weeklyAverage * 10) / 10,
      monthlyAverage: Math.round(monthlyAverage * 10) / 10,
      streak,
      treatmentStarted: true,
    }
  },

  getLogForDate: (dateStr: string) => {
    const { dailyLogs } = get()
    const log = dailyLogs.find(l => l.date === dateStr)
    if (log) {
      const hours = (log.wearSeconds ?? log.wearMinutes * 60) / 3600
      return { hours }
    }
    return null
  },

  logHoursForDate: async (dateStr: string, hours: number) => {
    const { dailyLogs, patient, userType } = get()
    const minutes = Math.round(hours * 60)
    const seconds = Math.round(hours * 3600)

    // Call the backend API to persist the wear log
    try {
      let response
      if (userType === 'standalone_patient') {
        response = await standalonePatientApi.logWearForDate(dateStr, minutes)
      } else if (userType === 'linked') {
        response = await linkedPatientApi.logWearForDate(dateStr, minutes)
      } else {
        return { success: false, error: 'Unknown user type' }
      }

      if (response.error || !response.data) {
        console.error('Log wear API error:', response.error)
        return { success: false, error: response.error?.message || 'Failed to save wear log' }
      }

      // Update local state with the persisted data
      const newLog: WearLog = {
        id: response.data.id,
        date: dateStr,
        wearMinutes: minutes,
        wearSeconds: seconds,
        targetMinutes: response.data.targetMinutes ?? patient?.dailyWearTarget ?? 1320,
        trayNumber: response.data.trayNumber ?? patient?.currentTray ?? 1,
      }

      const existingIndex = dailyLogs.findIndex(l => l.date === dateStr)
      if (existingIndex >= 0) {
        const updatedLogs = [...dailyLogs]
        updatedLogs[existingIndex] = newLog
        set({ dailyLogs: updatedLogs })
      } else {
        set({ dailyLogs: [...dailyLogs, newLog] })
      }

      // If logging for today, update todayWearMinutes too
      const todayStr = new Date().toISOString().split('T')[0]
      if (dateStr === todayStr) {
        set({ todayWearMinutes: minutes, todayWearSeconds: seconds })
      }

      return { success: true }
    } catch (error) {
      console.error('Log wear error:', error)
      return { success: false, error: 'Network error' }
    }
  },
}))
