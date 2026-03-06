import { API_BASE_URL } from './auth0';

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

interface ApiResponse<T> {
  data?: T;
  error?: { message: string; code: string };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const json = await response.json();

    if (!response.ok) {
      return { error: json.error || { message: 'Request failed', code: 'REQUEST_FAILED' } };
    }

    return json;
  } catch (error) {
    console.error('API request error:', error);
    return { error: { message: 'Network error', code: 'NETWORK_ERROR' } };
  }
}

// Check user type (linked to PMS, standalone, or new)
export const whoami = () =>
  apiRequest<{
    type: 'linked' | 'standalone_patient' | 'standalone_doctor' | 'none';
    patient?: any;
    corporate?: any;
    standalonePatient?: any;
    standaloneDoctor?: any;
  }>('/api/v1/patient/whoami');

// =====================================================
// PMS-LINKED PATIENT API (for patients linked to clinics)
// =====================================================
export const linkedPatientApi = {
  // Link patient account with PMS invite code
  link: (inviteCode: string) =>
    apiRequest<{ message: string; patient: any; corporate: any }>('/api/v1/patient/link', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }),

  // Get current patient profile and treatment
  getMe: () =>
    apiRequest<{
      patient: any;
      corporate: any;
      patientProfileId: number;
      treatment: any;
    }>('/api/v1/patient/me'),

  // Get appointments
  getAppointments: () =>
    apiRequest<{ upcoming: any[]; past: any[] }>('/api/v1/patient/appointments'),

  // Get available appointment slots
  getAvailableSlots: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{
      slots: Array<{
        slotId: number;
        scheduleId: number;
        date: string;
        startTime: string;
        endTime: string;
        appointmentType: {
          id: number;
          name: string;
          duration: number | null;
        } | null;
      }>;
      practiceId: number;
    }>(`/api/v1/patient/appointments/available-slots${query}`);
  },

  // Book an appointment
  bookAppointment: (slotId: number, notes?: string) =>
    apiRequest<{
      id: number;
      startTime: string;
      endTime: string;
      status: string;
      type: string | null;
      practice: string;
      notes: string | null;
    }>('/api/v1/patient/appointments/book', {
      method: 'POST',
      body: JSON.stringify({ slotId, notes }),
    }),

  // Cancel an appointment
  cancelAppointment: (appointmentId: number) =>
    apiRequest<{ message: string }>(`/api/v1/patient/appointments/${appointmentId}`, {
      method: 'DELETE',
    }),

  // Get payments
  getPayments: () =>
    apiRequest<{ summary: any; payments: any[] }>('/api/v1/patient/payments'),

  // Start wear session
  startWearSession: () =>
    apiRequest<{ sessionId: number; startTime: string }>('/api/v1/patient/wear-session/start', {
      method: 'POST',
    }),

  // Stop wear session
  stopWearSession: () =>
    apiRequest<{ sessionId: number; startTime: string; endTime: string; durationMinutes: number }>(
      '/api/v1/patient/wear-session/stop',
      { method: 'POST' }
    ),

  // Change tray
  changeTray: (toTray: number, fitStatus?: string, notes?: string) =>
    apiRequest<{ trayChange: any; newCurrentTray: number }>('/api/v1/patient/tray/change', {
      method: 'POST',
      body: JSON.stringify({ toTray, fitStatus, notes }),
    }),

  // Get wear logs
  getWearLogs: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ logs: any[] }>(`/api/v1/patient/wear-logs${query}`);
  },
};

// =====================================================
// STANDALONE PATIENT API (for app-only patients)
// =====================================================
export const standalonePatientApi = {
  // Register as standalone patient
  register: (data: { name?: string; email?: string; totalTrays?: number; daysPerTray?: number }) =>
    apiRequest<{
      id: number;
      email: string;
      name: string;
      totalTrays: number;
      currentTray: number;
      daysPerTray: number;
      dailyWearTarget: number;
    }>('/api/v1/patient/standalone/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get current standalone patient profile
  getMe: () =>
    apiRequest<{
      id: number;
      email: string;
      name: string;
      totalTrays: number;
      currentTray: number;
      daysPerTray: number;
      dailyWearTarget: number;
      startDate: string | null;
      doctor: {
        id: number;
        name: string;
        email: string;
        practiceName: string;
        practicePhone: string;
        practiceAddress: string;
        calendlyUrl: string;
        officeHours: string;
      } | null;
      todayWearMinutes: number;
      activeSession: { id: number; startTime: string } | null;
    }>('/api/v1/patient/standalone/me'),

  // Update profile
  updateProfile: (data: { name?: string; totalTrays?: number; currentTray?: number; daysPerTray?: number; dailyWearTarget?: number }) =>
    apiRequest<any>('/api/v1/patient/standalone/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Join a doctor by code
  joinDoctor: (doctorCode: string) =>
    apiRequest<{ message: string; doctor: any }>('/api/v1/patient/standalone/join-doctor', {
      method: 'POST',
      body: JSON.stringify({ doctorCode }),
    }),

  // Get assigned doctor info
  getDoctor: () =>
    apiRequest<{
      doctor: {
        id: number;
        name: string;
        email: string;
        practiceName: string;
        practicePhone: string;
        practiceAddress: string;
        calendlyUrl: string;
        officeHours: string;
      } | null;
    }>('/api/v1/patient/standalone/doctor'),

  // Start wear session
  startWearSession: () =>
    apiRequest<{ sessionId: number; startTime: string }>('/api/v1/patient/standalone/wear-session/start', {
      method: 'POST',
    }),

  // Stop wear session
  stopWearSession: () =>
    apiRequest<{
      sessionId: number;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      todayTotalMinutes: number;
    }>('/api/v1/patient/standalone/wear-session/stop', {
      method: 'POST',
    }),

  // Change tray
  changeTray: (toTray: number, fitStatus?: string, notes?: string) =>
    apiRequest<{ trayChange: any; newCurrentTray: number }>('/api/v1/patient/standalone/tray/change', {
      method: 'POST',
      body: JSON.stringify({ toTray, fitStatus, notes }),
    }),

  // Get wear logs
  getWearLogs: (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiRequest<{
      logs: Array<{
        id: number;
        date: string;
        wearMinutes: number;
        wearSeconds: number;
        targetMinutes: number;
        trayNumber: number;
      }>;
    }>(`/api/v1/patient/standalone/wear-logs${query}`);
  },

  // Get tray changes
  getTrayChanges: () =>
    apiRequest<{
      trayChanges: Array<{
        id: number;
        fromTray: number;
        toTray: number;
        changeDate: string;
        fitStatus: string;
        notes: string;
      }>;
    }>('/api/v1/patient/standalone/tray-changes'),
};

// =====================================================
// STANDALONE DOCTOR API (for app-only doctors)
// =====================================================
export const standaloneDoctorApi = {
  // Register as standalone doctor
  register: (data: { name?: string; practiceName?: string; practicePhone?: string; practiceAddress?: string }) =>
    apiRequest<{
      id: number;
      email: string;
      name: string;
      doctorCode: string;
      practiceName: string;
      practicePhone: string;
      practiceAddress: string;
    }>('/api/v1/doctor/standalone/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get current standalone doctor profile
  getMe: () =>
    apiRequest<{
      id: number;
      email: string;
      name: string;
      doctorCode: string;
      practiceName: string;
      practicePhone: string;
      practiceAddress: string;
      calendlyUrl: string;
      officeHours: string;
      patients: Array<{
        id: number;
        name: string;
        email: string;
        currentTray: number;
        totalTrays: number;
        assignedDate: string;
      }>;
      pendingInvitations: Array<{
        id: number;
        patientEmail: string;
        status: string;
        createdAt: string;
        expiresAt: string;
      }>;
    }>('/api/v1/doctor/standalone/me'),

  // Update profile
  updateProfile: (data: {
    name?: string;
    practiceName?: string;
    practicePhone?: string;
    practiceAddress?: string;
    calendlyUrl?: string;
    officeHours?: string;
  }) =>
    apiRequest<any>('/api/v1/doctor/standalone/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Get all patients
  getPatients: () =>
    apiRequest<{
      patients: Array<{
        id: number;
        name: string;
        email: string;
        currentTray: number;
        totalTrays: number;
        assignedDate: string;
        weeklyCompliance: number;
      }>;
    }>('/api/v1/doctor/standalone/patients'),

  // Get single patient details
  getPatient: (patientId: number) =>
    apiRequest<{
      id: number;
      name: string;
      email: string;
      currentTray: number;
      totalTrays: number;
      daysPerTray: number;
      dailyWearTarget: number;
      startDate: string;
      assignedDate: string;
      wearLogs: Array<{
        id: number;
        date: string;
        wearMinutes: number;
        targetMinutes: number;
        trayNumber: number;
        compliancePercent: number;
      }>;
      trayChanges: Array<{
        id: number;
        fromTray: number;
        toTray: number;
        changeDate: string;
        fitStatus: string;
        notes: string;
      }>;
    }>(`/api/v1/doctor/standalone/patients/${patientId}`),

  // Create patient invitation
  invite: (patientEmail: string) =>
    apiRequest<{
      id: number;
      doctorCode: string;
      patientEmail: string;
      expiresAt: string;
      message: string;
    }>('/api/v1/doctor/standalone/invite', {
      method: 'POST',
      body: JSON.stringify({ patientEmail }),
    }),
};

// Legacy export for backwards compatibility
export const patientApi = linkedPatientApi;
