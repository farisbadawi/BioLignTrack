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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Building2, Phone, MapPin, Calendar, Clock, ArrowLeft, Save } from 'lucide-react-native'
import { Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { router } from 'expo-router'
import { useCustomAlert } from '@/components/CustomAlert'
import { useTheme } from '@/contexts/ThemeContext'
import { Card } from '@/components/Card'

export default function EditPracticeScreen() {
  const { practiceInfo, savePracticeInfo, loadPracticeInfo } = usePatientStore()
  const { showAlert, AlertComponent } = useCustomAlert()
  const { colors } = useTheme()

  const [practiceName, setPracticeName] = useState('')
  const [practicePhone, setPracticePhone] = useState('')
  const [practiceAddress, setPracticeAddress] = useState('')
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [officeHours, setOfficeHours] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

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
      setOfficeHours(practiceInfo.office_hours || '')
    }
  }, [practiceInfo])

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
        office_hours: officeHours.trim(),
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

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Practice Info</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Save size={24} color={colors.primary} />
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
              placeholder="e.g., (555) 123-4567"
              placeholderTextColor={colors.textSecondary}
              value={practicePhone}
              onChangeText={setPracticePhone}
              keyboardType="phone-pad"
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

          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.label, { color: colors.textPrimary }]}>Office Hours</Text>
            </View>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="e.g., Mon-Fri 9am-5pm"
              placeholderTextColor={colors.textSecondary}
              value={officeHours}
              onChangeText={setOfficeHours}
            />
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
  saveButton: {
    padding: Spacing.xs,
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
})
