import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { X, Calendar, AlertCircle, Clock } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'
import { Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { Card } from '@/components/Card'

// Office hours types and helpers
interface DaySchedule {
  isOpen: boolean
  openTime: string
  closeTime: string
}

interface OfficeHoursSchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const formatTime12h = (time24: string): string => {
  const [hours, minutes] = time24.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return minutes === '00' ? `${h12}${ampm}` : `${h12}:${minutes}${ampm}`
}

const parseOfficeHours = (officeHoursStr: string): OfficeHoursSchedule | null => {
  if (!officeHoursStr) return null

  try {
    const parsed = JSON.parse(officeHoursStr)
    if (parsed.monday && typeof parsed.monday.isOpen === 'boolean') {
      return parsed as OfficeHoursSchedule
    }
  } catch {
    // Legacy free-text format - return null
  }

  return null
}

// Office Hours Display Component
const OfficeHoursDisplay = ({ officeHours, colors }: { officeHours: string, colors: any }) => {
  const schedule = parseOfficeHours(officeHours)

  // If it's not structured JSON, show the raw text
  if (!schedule) {
    if (officeHours) {
      return (
        <View style={displayStyles.container}>
          <View style={displayStyles.header}>
            <Clock size={16} color={colors.primary} />
            <Text style={[displayStyles.title, { color: colors.textPrimary }]}>Office Hours</Text>
          </View>
          <Text style={[displayStyles.legacyText, { color: colors.textSecondary }]}>{officeHours}</Text>
        </View>
      )
    }
    return null
  }

  // Group consecutive days with same hours
  const groupedHours: { days: string[], hours: string }[] = []
  let currentGroup: { days: string[], hours: string } | null = null

  DAYS_ORDER.forEach((day) => {
    const daySchedule = schedule[day]
    const hoursStr = daySchedule.isOpen
      ? `${formatTime12h(daySchedule.openTime)} - ${formatTime12h(daySchedule.closeTime)}`
      : 'Closed'

    if (currentGroup && currentGroup.hours === hoursStr) {
      currentGroup.days.push(DAY_LABELS[day])
    } else {
      if (currentGroup) groupedHours.push(currentGroup)
      currentGroup = { days: [DAY_LABELS[day]], hours: hoursStr }
    }
  })
  if (currentGroup) groupedHours.push(currentGroup)

  return (
    <View style={displayStyles.container}>
      <View style={displayStyles.header}>
        <Clock size={16} color={colors.primary} />
        <Text style={[displayStyles.title, { color: colors.textPrimary }]}>Office Hours</Text>
      </View>
      <View style={[displayStyles.table, { borderColor: colors.border }]}>
        {groupedHours.map((group, index) => {
          const daysText = group.days.length > 2
            ? `${group.days[0]} - ${group.days[group.days.length - 1]}`
            : group.days.join(', ')

          return (
            <View
              key={index}
              style={[
                displayStyles.row,
                { borderBottomColor: colors.border },
                index === groupedHours.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={[displayStyles.days, { color: colors.textPrimary }]}>{daysText}</Text>
              <Text
                style={[
                  displayStyles.hours,
                  { color: group.hours === 'Closed' ? colors.textSecondary : colors.primary },
                ]}
              >
                {group.hours}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const displayStyles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  legacyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  table: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  days: {
    fontSize: 14,
    fontWeight: '500',
  },
  hours: {
    fontSize: 14,
  },
})

export default function BookAppointmentScreen() {
  const { colors } = useTheme()
  const { assignedDoctor } = usePatientStore()
  const [loading, setLoading] = React.useState(true)

  // Get Calendly URL from assigned doctor
  const calendlyUrl = assignedDoctor?.calendly_url || null
  const doctorName = assignedDoctor?.name || 'your orthodontist'
  const practicePhone = assignedDoctor?.practice_phone || null
  const officeHours = assignedDoctor?.office_hours || null

  // If no Calendly URL, show a message
  if (!calendlyUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Book Appointment</Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.noCalendlyContainer}>
          <Card style={styles.noCalendlyCard}>
            <AlertCircle size={48} color={colors.warning} />
            <Text style={[styles.noCalendlyTitle, { color: colors.textPrimary }]}>
              Online Booking Not Available
            </Text>
            <Text style={[styles.noCalendlyText, { color: colors.textSecondary }]}>
              {assignedDoctor
                ? `${doctorName} hasn't set up online booking yet.`
                : "You haven't linked to a doctor yet."
              }
            </Text>
            {practicePhone && (
              <Text style={[styles.noCalendlyText, { color: colors.textSecondary }]}>
                Please call {practicePhone} to schedule an appointment.
              </Text>
            )}
            {!assignedDoctor && (
              <Text style={[styles.noCalendlyText, { color: colors.textSecondary }]}>
                Add your doctor in Profile settings to enable booking.
              </Text>
            )}
            {officeHours && <OfficeHoursDisplay officeHours={officeHours} colors={colors} />}
          </Card>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Book Appointment</Text>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
        >
          <X size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        {loading && (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading scheduler...
            </Text>
          </View>
        )}
        <WebView
          source={{ uri: calendlyUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  noCalendlyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  noCalendlyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  noCalendlyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  noCalendlyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
})
