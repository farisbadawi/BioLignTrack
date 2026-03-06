// services/notifications.ts
// Push notification service for wear reminders, tray changes, and messages

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Storage keys
const STORAGE_KEYS = {
  PUSH_TOKEN: 'push_token',
  WEAR_REMINDERS_SCHEDULED: 'wear_reminders_scheduled',
  TRAY_CHANGE_SCHEDULED: 'tray_change_scheduled',
}

// Notification identifiers
export const NOTIFICATION_IDS = {
  WEAR_REMINDER_PREFIX: 'wear-reminder-',
  TRAY_CHANGE: 'tray-change-reminder',
  MESSAGE: 'new-message-',
}

export interface NotificationService {
  initialize: () => Promise<boolean>
  requestPermissions: () => Promise<boolean>
  scheduleWearReminders: (times: string[], enabled: boolean) => Promise<void>
  scheduleTrayChangeReminder: (changeDate: Date, trayNumber: number, enabled: boolean) => Promise<void>
  sendMessageNotification: (senderName: string, messagePreview: string) => Promise<void>
  cancelAllWearReminders: () => Promise<void>
  cancelTrayChangeReminder: () => Promise<void>
  cancelAllNotifications: () => Promise<void>
  getPermissionStatus: () => Promise<boolean>
}

class NotificationServiceImpl implements NotificationService {
  private isInitialized = false

  /**
   * Initialize the notification service
   * Returns true if notifications are available
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    // Check if this is a physical device (notifications don't work on simulator)
    if (!Device.isDevice) {
      console.log('Notifications: Running on simulator, notifications will be limited')
    }

    // Set up notification categories for actions
    await Notifications.setNotificationCategoryAsync('wear_reminder', [
      {
        identifier: 'done',
        buttonTitle: 'Done',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'snooze',
        buttonTitle: 'Snooze 30min',
        options: { opensAppToForeground: false },
      },
    ])

    this.isInitialized = true
    return true
  }

  /**
   * Request notification permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()

      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted')
        return false
      }

      // Get push token for remote notifications (future use)
      if (Device.isDevice) {
        const token = (await Notifications.getExpoPushTokenAsync()).data
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token)
      }

      return true
    } catch (error) {
      console.error('Error requesting notification permissions:', error)
      return false
    }
  }

  /**
   * Check current permission status
   */
  async getPermissionStatus(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync()
    return status === 'granted'
  }

  /**
   * Schedule daily wear reminders at specified times
   * @param times Array of times in "HH:MM" format (24-hour)
   * @param enabled Whether reminders are enabled
   */
  async scheduleWearReminders(times: string[], enabled: boolean): Promise<void> {
    // Cancel existing wear reminders first
    await this.cancelAllWearReminders()

    if (!enabled || times.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.WEAR_REMINDERS_SCHEDULED, 'false')
      return
    }

    const hasPermission = await this.getPermissionStatus()
    if (!hasPermission) {
      console.log('No notification permission for wear reminders')
      return
    }

    const messages = [
      "Time to check your aligners! Are they in? 😬",
      "Aligner check! Remember, 22 hours a day for best results.",
      "Quick reminder: Pop those aligners back in!",
      "Your smile is counting on you! Aligners in?",
      "Aligner time! Every hour counts toward your perfect smile.",
    ]

    for (let i = 0; i < times.length; i++) {
      const time = times[i]
      const [hours, minutes] = time.split(':').map(Number)

      // Schedule a daily repeating notification
      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIFICATION_IDS.WEAR_REMINDER_PREFIX}${i}`,
        content: {
          title: 'Wear Reminder',
          body: messages[i % messages.length],
          sound: true,
          categoryIdentifier: 'wear_reminder',
          data: { type: 'wear_reminder', time },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      })
    }

    await AsyncStorage.setItem(STORAGE_KEYS.WEAR_REMINDERS_SCHEDULED, 'true')
    console.log(`Scheduled ${times.length} daily wear reminders`)
  }

  /**
   * Schedule a reminder for tray change day
   * @param changeDate Date when tray should be changed
   * @param trayNumber The tray number they'll be switching to
   * @param enabled Whether tray change reminders are enabled
   */
  async scheduleTrayChangeReminder(changeDate: Date, trayNumber: number, enabled: boolean): Promise<void> {
    // Cancel existing tray change reminder
    await this.cancelTrayChangeReminder()

    if (!enabled) {
      await AsyncStorage.setItem(STORAGE_KEYS.TRAY_CHANGE_SCHEDULED, 'false')
      return
    }

    const hasPermission = await this.getPermissionStatus()
    if (!hasPermission) {
      console.log('No notification permission for tray change reminder')
      return
    }

    // Only schedule if the change date is in the future
    const now = new Date()
    if (changeDate <= now) {
      console.log('Tray change date is in the past, not scheduling')
      return
    }

    // Schedule notification for 9 AM on the change date
    const triggerDate = new Date(changeDate)
    triggerDate.setHours(9, 0, 0, 0)

    // If 9 AM has already passed today, and changeDate is today, schedule immediately
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1)
    }

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.TRAY_CHANGE,
      content: {
        title: 'Time for a New Tray! 🎉',
        body: `Today's the day! Switch to Tray #${trayNumber} for continued progress.`,
        sound: true,
        data: { type: 'tray_change', trayNumber },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    })

    await AsyncStorage.setItem(STORAGE_KEYS.TRAY_CHANGE_SCHEDULED, 'true')
    console.log(`Scheduled tray change reminder for ${triggerDate.toLocaleDateString()}`)
  }

  /**
   * Send an immediate notification for a new message
   * @param senderName Name of the person who sent the message
   * @param messagePreview Preview of the message content
   */
  async sendMessageNotification(senderName: string, messagePreview: string): Promise<void> {
    const hasPermission = await this.getPermissionStatus()
    if (!hasPermission) {
      console.log('No notification permission for message notification')
      return
    }

    // Truncate message preview if too long
    const truncatedPreview = messagePreview.length > 100
      ? messagePreview.substring(0, 97) + '...'
      : messagePreview

    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIFICATION_IDS.MESSAGE}${Date.now()}`,
      content: {
        title: `New message from ${senderName}`,
        body: truncatedPreview,
        sound: true,
        data: { type: 'message', senderName },
      },
      trigger: null, // Immediate notification
    })
  }

  /**
   * Cancel all scheduled wear reminders
   */
  async cancelAllWearReminders(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()

    for (const notification of scheduled) {
      if (notification.identifier.startsWith(NOTIFICATION_IDS.WEAR_REMINDER_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier)
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.WEAR_REMINDERS_SCHEDULED, 'false')
  }

  /**
   * Cancel tray change reminder
   */
  async cancelTrayChangeReminder(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.TRAY_CHANGE)
    await AsyncStorage.setItem(STORAGE_KEYS.TRAY_CHANGE_SCHEDULED, 'false')
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()
    await AsyncStorage.removeItem(STORAGE_KEYS.WEAR_REMINDERS_SCHEDULED)
    await AsyncStorage.removeItem(STORAGE_KEYS.TRAY_CHANGE_SCHEDULED)
  }
}

// Export singleton instance
export const notificationService = new NotificationServiceImpl()

// Helper hook for listening to notifications
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(callback)
}

export const addNotificationResponseReceivedListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback)
}
