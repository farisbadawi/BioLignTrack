// app/edit-practice.tsx - Edit Practice Info for Doctors
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Building2, Phone, MapPin, Calendar, Clock, ArrowLeft, Save, Check } from 'lucide-react-native'
import { Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { router } from 'expo-router'
import { useCustomAlert } from '@/components/CustomAlert'
import { useTheme } from '@/contexts/ThemeContext'
import { Card } from '@/components/Card'
import DateTimePicker from '@react-native-community/datetimepicker'

// Office hours structured type
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

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const DEFAULT_SCHEDULE: OfficeHoursSchedule = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { isOpen: false, openTime: '09:00', closeTime: '13:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '13:00' },
}

const formatTime12h = (time24: string): string => {
  const [hours, minutes] = time24.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

// Convert time string to Date object
const timeStringToDate = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Convert Date to time string
const dateToTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// Parse office hours from string (legacy) or JSON
const parseOfficeHours = (officeHoursStr: string): OfficeHoursSchedule => {
  if (!officeHoursStr) return DEFAULT_SCHEDULE

  try {
    const parsed = JSON.parse(officeHoursStr)
    // Validate it has the expected structure
    if (parsed.monday && typeof parsed.monday.isOpen === 'boolean') {
      return parsed as OfficeHoursSchedule
    }
  } catch {
    // Not JSON, likely legacy free-text format - return default
  }

  return DEFAULT_SCHEDULE
}

// Stringify office hours schedule to JSON
const stringifyOfficeHours = (schedule: OfficeHoursSchedule): string => {
  return JSON.stringify(schedule)
}

// Format phone number as user types (e.g., (555) 123-4567)
const formatPhoneNumber = (text: string): string => {
  const cleaned = text.replace(/\D/g, '')
  const limited = cleaned.slice(0, 10)

  if (limited.length === 0) return ''
  if (limited.length <= 3) return `(${limited}`
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
}

// Native Time Picker Modal with scroll wheel
const TimePickerModal = ({
  visible,
  onClose,
  onSelect,
  currentTime,
  title,
  colors,
}: {
  visible: boolean
  onClose: () => void
  onSelect: (time: string) => void
  currentTime: string
  title: string
  colors: any
}) => {
  const [selectedTime, setSelectedTime] = useState(timeStringToDate(currentTime))

  useEffect(() => {
    if (visible) {
      setSelectedTime(timeStringToDate(currentTime))
    }
  }, [visible, currentTime])

  const handleConfirm = () => {
    onSelect(dateToTimeString(selectedTime))
    onClose()
  }

  if (Platform.OS === 'android' && visible) {
    return (
      <DateTimePicker
        value={selectedTime}
        mode="time"
        is24Hour={false}
        display="spinner"
        onChange={(event, date) => {
          if (event.type === 'dismissed') {
            onClose()
          } else if (date) {
            onSelect(dateToTimeString(date))
            onClose()
          }
        }}
      />
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: colors.background }]}>
          <View style={[modalStyles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={modalStyles.headerButton}>
              <Text style={[modalStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[modalStyles.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm} style={modalStyles.headerButton}>
              <Text style={[modalStyles.confirmText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={modalStyles.pickerContainer}>
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={(event, date) => {
                if (date) {
                  setSelectedTime(date)
                }
              }}
              style={modalStyles.picker}
              textColor={colors.textPrimary}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 17,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
  },
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  picker: {
    width: '100%',
    height: 200,
  },
})

export default function EditPracticeScreen() {
  const { practiceInfo, savePracticeInfo, loadPracticeInfo } = usePatientStore()
  const { showAlert, AlertComponent } = useCustomAlert()
  const { colors } = useTheme()

  const [practiceName, setPracticeName] = useState('')
  const [practicePhone, setPracticePhone] = useState('')
  const [practiceAddress, setPracticeAddress] = useState('')
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [officeHoursSchedule, setOfficeHoursSchedule] = useState<OfficeHoursSchedule>(DEFAULT_SCHEDULE)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [timePickerVisible, setTimePickerVisible] = useState(false)
  const [selectedDay, setSelectedDay] = useState<keyof OfficeHoursSchedule | null>(null)
  const [selectedTimeType, setSelectedTimeType] = useState<'open' | 'close'>('open')

  useEffect(() => {
    const loadData = async () => {
      await loadPracticeInfo()
      setInitialLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (practiceInfo) {
      setPracticeName(practiceInfo.practice_name || '')
      setPracticePhone(practiceInfo.practice_phone || '')
      setPracticeAddress(practiceInfo.practice_address || '')
      setCalendlyUrl(practiceInfo.calendly_url || '')
      setOfficeHoursSchedule(parseOfficeHours(practiceInfo.office_hours || ''))
    }
  }, [practiceInfo])

  const updateDaySchedule = (day: keyof OfficeHoursSchedule, updates: Partial<DaySchedule>) => {
    setOfficeHoursSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }))
  }

  const openTimePicker = (day: keyof OfficeHoursSchedule, timeType: 'open' | 'close') => {
    setSelectedDay(day)
    setSelectedTimeType(timeType)
    setTimePickerVisible(true)
  }

  const handleTimeSelect = (time: string) => {
    if (selectedDay) {
      if (selectedTimeType === 'open') {
        updateDaySchedule(selectedDay, { openTime: time })
      } else {
        updateDaySchedule(selectedDay, { closeTime: time })
      }
    }
  }

  const handleSave = async () => {
    if (!practiceName.trim() || !practicePhone.trim()) {
      showAlert({
        title: 'Required Fields',
        message: 'Please enter your practice name and phone number.',
        type: 'error',
      })
      return
    }

    setLoading(true)

    try {
      const result = await savePracticeInfo({
        practice_name: practiceName.trim(),
        practice_phone: practicePhone.trim(),
        practice_address: practiceAddress.trim(),
        calendly_url: calendlyUrl.trim(),
        office_hours: stringifyOfficeHours(officeHoursSchedule),
      })

      if (result.success) {
        showAlert({
          title: 'Saved!',
          message: 'Your practice information has been updated.',
          type: 'success',
          buttons: [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ],
        })
      } else {
        showAlert({
          title: 'Error',
          message: result.error || 'Failed to save practice info',
          type: 'error',
        })
      }
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      <AlertComponent />

      <TimePickerModal
        visible={timePickerVisible}
        onClose={() => setTimePickerVisible(false)}
        onSelect={handleTimeSelect}
        currentTime={selectedDay ? officeHoursSchedule[selectedDay][selectedTimeType === 'open' ? 'openTime' : 'closeTime'] : '09:00'}
        title={`Select ${selectedTimeType === 'open' ? 'Opening' : 'Closing'} Time`}
        colors={colors}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Practice Info</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveHeaderButton}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveHeaderText, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Building2 size={18} color={colors.primary} />
              <Text style={[styles.label, { color: colors.textPrimary }]}>Practice Name *</Text>
            </View>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="e.g., BioLign Orthodontics"
              placeholderTextColor={colors.textSecondary}
              value={practiceName}
              onChangeText={setPracticeName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Phone size={18} color={colors.primary} />
              <Text style={[styles.label, { color: colors.textPrimary }]}>Phone Number *</Text>
            </View>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.textSecondary}
              value={practicePhone}
              onChangeText={(text) => setPracticePhone(formatPhoneNumber(text))}
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <MapPin size={18} color={colors.primary} />
              <Text style={[styles.label, { color: colors.textPrimary }]}>Address</Text>
            </View>
            <TextInput
              style={[styles.input, styles.multilineInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="e.g., 123 Main St, Suite 100, City, State 12345"
              placeholderTextColor={colors.textSecondary}
              value={practiceAddress}
              onChangeText={setPracticeAddress}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Calendar size={18} color={colors.primary} />
              <Text style={[styles.label, { color: colors.textPrimary }]}>Calendly Link</Text>
            </View>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="e.g., https://calendly.com/your-name"
              placeholderTextColor={colors.textSecondary}
              value={calendlyUrl}
              onChangeText={setCalendlyUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Patients will use this link to book appointments with you
            </Text>
          </View>

        </Card>

        {/* Office Hours Section */}
        <Card style={styles.formCard}>
          <View style={styles.inputHeader}>
            <Clock size={18} color={colors.primary} />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Office Hours</Text>
          </View>
          <Text style={[styles.helpText, { color: colors.textSecondary, marginBottom: Spacing.md }]}>
            Set your practice hours for each day of the week
          </Text>

          {/* Office Hours Table */}
          <View style={[styles.scheduleTable, { borderColor: colors.border }]}>
            {/* Table Rows - Stacked Layout */}
            {DAYS_OF_WEEK.map((day, index) => {
              const schedule = officeHoursSchedule[day]
              const isLast = index === DAYS_OF_WEEK.length - 1

              return (
                <View
                  key={day}
                  style={[
                    styles.scheduleRow,
                    { borderBottomColor: colors.border },
                    isLast && { borderBottomWidth: 0 },
                  ]}
                >
                  {/* Top row: Day name and switch */}
                  <View style={styles.scheduleRowTop}>
                    <Text style={[styles.dayLabel, { color: colors.textPrimary }]}>
                      {DAY_LABELS[day]}
                    </Text>
                    <View style={styles.switchContainer}>
                      <Text style={[styles.switchLabel, { color: schedule.isOpen ? colors.primary : colors.textSecondary }]}>
                        {schedule.isOpen ? 'Open' : 'Closed'}
                      </Text>
                      <Switch
                        value={schedule.isOpen}
                        onValueChange={(value) => updateDaySchedule(day, { isOpen: value })}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.background}
                      />
                    </View>
                  </View>

                  {/* Bottom row: Hours (only when open) */}
                  {schedule.isOpen && (
                    <View style={styles.scheduleRowBottom}>
                      <TouchableOpacity
                        style={[styles.timeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => openTimePicker(day, 'open')}
                      >
                        <Text style={[styles.timeButtonText, { color: colors.textPrimary }]}>
                          {formatTime12h(schedule.openTime)}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>to</Text>
                      <TouchableOpacity
                        style={[styles.timeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => openTimePicker(day, 'close')}
                      >
                        <Text style={[styles.timeButtonText, { color: colors.textPrimary }]}>
                          {formatTime12h(schedule.closeTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </Card>

        <TouchableOpacity
          style={[styles.saveButtonLarge, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          * Required fields. This information will be visible to your patients.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveHeaderButton: {
    padding: Spacing.xs,
  },
  saveHeaderText: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,

  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  saveButtonLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Office Hours Table Styles
  scheduleTable: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  scheduleRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  scheduleRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  timeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: 14,
    marginHorizontal: Spacing.sm,
  },
})
