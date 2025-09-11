// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'patient' | 'doctor' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: 'patient' | 'doctor' | 'admin'
        }
        Update: {
          name?: string
          email?: string
          role?: 'patient' | 'doctor' | 'admin'
        }
      }
      patients: {
        Row: {
          id: string
          user_id: string
          target_hours_per_day: number
          total_trays: number
          current_tray: number
          treatment_start_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          target_hours_per_day?: number
          total_trays?: number
          current_tray?: number
          treatment_start_date?: string
        }
        Update: {
          target_hours_per_day?: number
          total_trays?: number
          current_tray?: number
          treatment_start_date?: string
        }
      }
      daily_logs: {
        Row: {
          id: string
          patient_id: string
          date: string
          wear_minutes: number
          comfort_level: number
          fit_ok: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          patient_id: string
          date?: string
          wear_minutes: number
          comfort_level?: number
          fit_ok?: boolean
          notes?: string
        }
        Update: {
          wear_minutes?: number
          comfort_level?: number
          fit_ok?: boolean
          notes?: string
        }
      }
      tray_changes: {
        Row: {
          id: string
          patient_id: string
          tray_number: number
          date_changed: string
          fit_status: 'ok' | 'watch' | 'not_seated'
          photo_urls: string[]
          notes: string | null
          created_at: string
        }
        Insert: {
          patient_id: string
          tray_number: number
          date_changed?: string
          fit_status: 'ok' | 'watch' | 'not_seated'
          photo_urls?: string[]
          notes?: string
        }
        Update: {
          fit_status?: 'ok' | 'watch' | 'not_seated'
          photo_urls?: string[]
          notes?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          content: string
          read: boolean
          created_at: string
        }
        Insert: {
          sender_id: string
          recipient_id: string
          content: string
        }
        Update: {
          read?: boolean
        }
      }
      appointments: {
        Row: {
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
        }
        Insert: {
          patient_id: string
          doctor_id: string
          starts_at: string
          ends_at: string
          purpose: string
          location?: string
          provider?: string
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
        }
        Update: {
          starts_at?: string
          ends_at?: string
          purpose?: string
          location?: string
          provider?: string
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
        }
      }
      wear_sessions: {
        Row: {
          id: string
          patient_id: string
          start_time: string
          end_time: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          patient_id: string
          start_time?: string
          end_time?: string
          is_active?: boolean
        }
        Update: {
          end_time?: string
          is_active?: boolean
        }
      }
    }
  }
}

// Helper functions
export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getCurrentPatient() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return patient
}