export interface Patient {
  id: string;
  name: string;
  email: string;
  targetHoursPerDay: number;
  totalTrays: number;
  currentTray: number;
  createdAt: Date;
}

export interface DailyLog {
  id: string;
  patientId: string;
  date: string;
  wearMinutes: number;
  comfort: number; // 0-10
  fitOk: boolean;
  soreSpots: boolean;
  brokenTray: boolean;
  missedReason?: string;
  createdAt: Date;
}

export interface TrayChange {
  id: string;
  patientId: string;
  trayNumber: number;
  dateChanged: string;
  photoUrls?: string[];
  fitStatus: 'ok' | 'watch' | 'not_seated';
  createdAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  purpose: string;
  location?: string;
  provider?: string;
  status: 'scheduled' | 'cancelled' | 'completed';
}

export interface Message {
  id: string;
  patientId: string;
  sender: 'doctor' | 'patient';
  content: string;
  attachments?: string[];
  createdAt: Date;
  read: boolean;
}

export interface WearSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}