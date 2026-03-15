import { API_BASE_URL } from './auth0';

// ── Token state ────────────────────────────────────────
let accessToken: string | null = null;
let tokenExpiresAt: number = 0;
let refreshCallback: (() => Promise<string | null>) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setTokenExpiresAt = (expiresAt: number) => {
  tokenExpiresAt = expiresAt;
};

export const getAccessToken = () => accessToken;

/**
 * Register a callback that api.ts will invoke when a 401 is received
 * or the token is near expiry. The callback should refresh the token,
 * call setAccessToken with the new value, and return it.
 */
export const registerTokenRefresh = (callback: () => Promise<string | null>) => {
  refreshCallback = callback;
};

/**
 * Refresh the token, deduplicating concurrent requests so only one
 * refresh is in-flight at a time.
 */
async function refreshTokenIfNeeded(): Promise<string | null> {
  if (!refreshCallback) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = refreshCallback().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// ── API request ────────────────────────────────────────

interface ApiResponse<T> {
  data?: T;
  error?: { message: string; code: string };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const makeRequest = async (token: string | null) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  try {
    let response = await makeRequest(accessToken);

    // On 401, try refreshing the token and retry once
    if (response.status === 401 && refreshCallback) {
      const newToken = await refreshTokenIfNeeded();
      if (newToken) {
        response = await makeRequest(newToken);
      }
    }

    const json = await response.json();

    if (!response.ok) {
      return { error: json.error || { message: 'Request failed', code: 'REQUEST_FAILED' } };
    }

    return json;
  } catch (error) {
    if (__DEV__) console.error('API request error:', error);
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

  // Manually log wear hours for a date
  logWearForDate: (date: string, wearMinutes: number) =>
    apiRequest<{ id: number; date: string; wearMinutes: number; targetMinutes: number; trayNumber: number }>(
      '/api/v1/patient/wear-log',
      {
        method: 'POST',
        body: JSON.stringify({ date, wearMinutes }),
      }
    ),
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

  // Manually log wear hours for a date
  logWearForDate: (date: string, wearMinutes: number) =>
    apiRequest<{ id: number; date: string; wearMinutes: number; wearSeconds: number; targetMinutes: number; trayNumber: number }>(
      '/api/v1/patient/standalone/wear-log',
      {
        method: 'POST',
        body: JSON.stringify({ date, wearMinutes }),
      }
    ),

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

// =====================================================
// PMS PATIENT MESSAGING API (for patients linked to clinics)
// =====================================================
// =====================================================
// STANDALONE MESSAGE ACTIONS (edit/delete for standalone)
// =====================================================
export const standaloneMessageApi = {
  editMessage: (userType: 'doctor' | 'patient', conversationId: number, messageId: number, content: string) => {
    const base = userType === 'doctor'
      ? '/api/v1/doctor/standalone/messages'
      : '/api/v1/patient/standalone/messages';
    return apiRequest<{ id: number; content: string }>(`${base}/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  deleteMessage: (userType: 'doctor' | 'patient', conversationId: number, messageId: number) => {
    const base = userType === 'doctor'
      ? '/api/v1/doctor/standalone/messages'
      : '/api/v1/patient/standalone/messages';
    return apiRequest<{ success: boolean }>(`${base}/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
};

// =====================================================
// PMS PATIENT MESSAGING API (for patients linked to clinics)
// =====================================================
export const pmsPatientMessageApi = {
  getConversations: () =>
    apiRequest<any[]>('/api/v1/patient/pms-messages/conversations'),

  getMessages: (conversationId: number, limit = 50, before?: number) => {
    let query = `?limit=${limit}`;
    if (before) query += `&before=${before}`;
    return apiRequest<{ messages: any[]; hasMore: boolean; cursor: number | null }>(
      `/api/v1/patient/pms-messages/conversations/${conversationId}${query}`
    );
  },

  sendMessage: (conversationId: number, content: string) =>
    apiRequest<any>(`/api/v1/patient/pms-messages/conversations/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  markRead: (conversationId: number) =>
    apiRequest<any>(`/api/v1/patient/pms-messages/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }),

  getUnreadCount: () =>
    apiRequest<{ unreadCount: number }>('/api/v1/patient/pms-messages/unread-count'),

  editMessage: (conversationId: number, messageId: number, content: string) =>
    apiRequest<{ id: number; content: string }>(`/api/v1/patient/pms-messages/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  deleteMessage: (conversationId: number, messageId: number) =>
    apiRequest<{ success: boolean }>(`/api/v1/patient/pms-messages/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    }),
};

// Legacy export for backwards compatibility
export const patientApi = linkedPatientApi;
