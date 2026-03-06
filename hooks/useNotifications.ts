// hooks/useNotifications.ts
// Hook for accessing notification functionality
// The actual logic is in NotificationContext - this hook provides a simple interface

import { useNotificationContext } from '@/contexts/NotificationContext'
import { notificationService } from '@/services/notifications'

export function useNotifications() {
  return useNotificationContext()
}

// Function to send a message notification directly (used by store)
export async function sendMessageNotification(senderName: string, messagePreview: string) {
  await notificationService.sendMessageNotification(senderName, messagePreview)
}
