import { create } from 'zustand';
import { Patient, DailyLog, TrayChange, Appointment, Message, WearSession } from '@/types';

interface PatientState {
  // Patient data
  patient: Patient | null;
  dailyLogs: DailyLog[];
  trayChanges: TrayChange[];
  appointments: Appointment[];
  messages: Message[];
  
  // Current session
  currentSession: WearSession | null;
  todayWearMinutes: number;
  
  // UI state
  unreadMessages: number;
  
  // Actions
  setPatient: (patient: Patient) => void;
  startWearSession: () => void;
  stopWearSession: () => void;
  addWearMinutes: (minutes: number) => void;
  logTrayChange: (trayNumber: number, fitStatus: 'ok' | 'watch' | 'not_seated') => void;
  addMessage: (content: string, sender: 'doctor' | 'patient') => void;
  markMessagesRead: () => void;
  getTodayLog: () => DailyLog | undefined;
  getWeeklyProgress: () => { date: string; hours: number }[];
}

export const usePatientStore = create<PatientState>((set, get) => ({
  // Initial state
  patient: {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    targetHoursPerDay: 22,
    totalTrays: 24,
    currentTray: 8,
    createdAt: new Date('2024-01-15'),
  },
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
    {
      id: '2',
      patientId: '1',
      startsAt: new Date('2025-02-17T14:00:00'),
      endsAt: new Date('2025-02-17T14:30:00'),
      purpose: 'Progress Review',
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
      sender: 'patient',
      content: 'Thank you! I have a question about the next tray change.',
      createdAt: new Date('2024-12-10T14:30:00'),
      read: true,
    },
    {
      id: '3',
      patientId: '1',
      sender: 'doctor',
      content: 'Of course! What would you like to know about your next tray?',
      createdAt: new Date('2024-12-11T08:15:00'),
      read: false,
    },
  ],
  currentSession: null,
  todayWearMinutes: 18 * 60 + 45, // 18 hours 45 minutes
  unreadMessages: 1,

  // Actions
  setPatient: (patient) => set({ patient }),

  startWearSession: () => {
    const session: WearSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      isActive: true,
    };
    set({ currentSession: session });
  },

  stopWearSession: () => {
    const { currentSession } = get();
    if (currentSession) {
      const endTime = new Date();
      const sessionMinutes = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / (1000 * 60));
      
      set((state) => ({
        currentSession: null,
        todayWearMinutes: state.todayWearMinutes + sessionMinutes,
      }));
    }
  },

  addWearMinutes: (minutes) => {
    set((state) => ({
      todayWearMinutes: state.todayWearMinutes + minutes,
    }));
  },

  logTrayChange: (trayNumber, fitStatus) => {
    const newChange: TrayChange = {
      id: Date.now().toString(),
      patientId: '1',
      trayNumber,
      dateChanged: new Date().toISOString().split('T')[0],
      fitStatus,
      createdAt: new Date(),
    };

    set((state) => ({
      trayChanges: [...state.trayChanges, newChange],
      patient: state.patient ? { ...state.patient, currentTray: trayNumber } : null,
    }));
  },

  addMessage: (content, sender) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      patientId: '1',
      sender,
      content,
      createdAt: new Date(),
      read: sender === 'patient',
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
      unreadMessages: sender === 'doctor' ? state.unreadMessages + 1 : state.unreadMessages,
    }));
  },

  markMessagesRead: () => {
    set((state) => ({
      messages: state.messages.map(msg => ({ ...msg, read: true })),
      unreadMessages: 0,
    }));
  },

  getTodayLog: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().dailyLogs.find(log => log.date === today);
  },

  getWeeklyProgress: () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Mock data for demonstration
      const baseHours = 20 + Math.random() * 4;
      const hours = i === 0 ? get().todayWearMinutes / 60 : baseHours;
      
      days.push({
        date: dateStr,
        hours: Math.round(hours * 10) / 10,
      });
    }
    return days;
  },
}));