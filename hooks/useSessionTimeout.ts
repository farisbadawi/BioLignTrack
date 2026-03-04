// hooks/useSessionTimeout.ts
// HIPAA Requirement: Automatic session timeout after inactivity

import { useEffect, useRef, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { usePatientStore } from '@/stores/patient-store'
import { router } from 'expo-router'

// Session timeout in milliseconds (15 minutes for HIPAA compliance)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes warning

interface UseSessionTimeoutOptions {
  onTimeout?: () => void
  onWarning?: (remainingMs: number) => void
  enabled?: boolean
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const { onTimeout, onWarning, enabled = true } = options
  const { profile, signOut } = usePatientStore()

  const lastActivityRef = useRef<number>(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  // Reset activity timer
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)

    if (!enabled || !profile) return

    // Set warning timer
    warningRef.current = setTimeout(() => {
      const remaining = SESSION_TIMEOUT_MS - (Date.now() - lastActivityRef.current)
      onWarning?.(remaining)
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS)

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout()
    }, SESSION_TIMEOUT_MS)
  }, [enabled, profile, onWarning])

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    if (onTimeout) {
      onTimeout()
    } else {
      // Default behavior: sign out and redirect to auth
      await signOut()
      router.replace('/auth')
    }
  }, [onTimeout, signOut])

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - check if session expired
        const elapsed = Date.now() - lastActivityRef.current
        if (elapsed >= SESSION_TIMEOUT_MS) {
          handleTimeout()
        } else {
          // Reset activity since user is back
          resetActivity()
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - timestamp is already set
        // Session will be checked when app returns
      }
      appStateRef.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [handleTimeout, resetActivity])

  // Initialize on mount
  useEffect(() => {
    if (enabled && profile) {
      resetActivity()
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [enabled, profile, resetActivity])

  return {
    resetActivity,
    lastActivity: lastActivityRef.current,
  }
}
