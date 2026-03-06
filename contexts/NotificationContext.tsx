// contexts/NotificationContext.tsx
// Notification provider that handles push notifications and reminders

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { router } from 'expo-router'
import {
  notificationService,
  addNotificationResponseReceivedListener,
} from '@/services/notifications'
import { usePatientStore } from '@/stores/patient-store'

interface NotificationContextType {
  requestPermission: () => Promise<boolean>
  checkPermission: () => Promise<boolean>
  cancelAll: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile, patient, userType } = usePatientStore()
  const isInitializedRef = useRef(false)

  // Local notification settings (would come from API in production)
  const [notificationSettings] = useState({
    wear_reminders: true,
    wear_reminder_times: ['09:00', '14:00', '21:00'],
    tray_change_reminders: true,
    message_notifications: true,
  })

  // Initialize notification service
  useEffect(() => {
    if (!profile || isInitializedRef.current) return

    const init = async () => {
      await notificationService.initialize()
      isInitializedRef.current = true

      // Request permissions if user has any notifications enabled
      if (
        notificationSettings.wear_reminders ||
        notificationSettings.tray_change_reminders
      ) {
        await notificationService.requestPermissions()
      }
    }

    init()
  }, [profile, notificationSettings])

  // Schedule wear reminders when settings change (patients only)
  useEffect(() => {
    if (!profile || userType !== 'standalone_patient') return

    notificationService.scheduleWearReminders(
      notificationSettings.wear_reminder_times,
      notificationSettings.wear_reminders
    )
  }, [profile, userType, notificationSettings.wear_reminders, notificationSettings.wear_reminder_times])

  // Schedule tray change reminder when patient data changes
  useEffect(() => {
    if (!profile || !patient || userType !== 'standalone_patient') return

    const currentTray = patient.currentTray || 1
    const totalTrays = patient.totalTrays || 20
    const changeFrequencyDays = patient.daysPerTray || 14

    // Only schedule if not on last tray
    if (currentTray < totalTrays) {
      const nextChangeDate = new Date()
      nextChangeDate.setDate(nextChangeDate.getDate() + changeFrequencyDays)

      notificationService.scheduleTrayChangeReminder(
        nextChangeDate,
        currentTray + 1,
        notificationSettings.tray_change_reminders
      )
    }
  }, [profile, userType, notificationSettings.tray_change_reminders, patient?.currentTray])

  // Listen for notification taps
  useEffect(() => {
    // When user taps on a notification
    const responseSubscription = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data

      // Navigate based on notification type
      switch (data?.type) {
        case 'wear_reminder':
          // Go to home/tray tracking
          router.push('/(tabs)')
          break
        case 'tray_change':
          // Go to tray screen
          router.push('/(tabs)/tray')
          break
        case 'message':
          // Go to messages
          router.push('/(tabs)/messages')
          break
      }
    })

    return () => {
      responseSubscription.remove()
    }
  }, [])

  // Context value
  const requestPermission = async (): Promise<boolean> => {
    return await notificationService.requestPermissions()
  }

  const checkPermission = async (): Promise<boolean> => {
    return await notificationService.getPermissionStatus()
  }

  const cancelAll = async () => {
    await notificationService.cancelAllNotifications()
  }

  return (
    <NotificationContext.Provider value={{ requestPermission, checkPermission, cancelAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    // Return no-op functions if used outside provider (during initial load)
    return {
      requestPermission: async () => false,
      checkPermission: async () => false,
      cancelAll: async () => {},
    }
  }
  return context
}
