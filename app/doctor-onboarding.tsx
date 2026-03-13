// app/doctor-onboarding.tsx - Practice Setup for Doctors
import React, { useState } from 'react'
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
import { Building2, Phone, MapPin, Calendar, Clock, ChevronRight } from 'lucide-react-native'
import { Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { router } from 'expo-router'
import { useCustomAlert } from '@/components/CustomAlert'
import { useTheme } from '@/contexts/ThemeContext'
import { Card } from '@/components/Card'

export default function DoctorOnboardingScreen() {
  const [practiceName, setPracticeName] = useState('')
  const [practicePhone, setPracticePhone] = useState('')
  const [practiceAddress, setPracticeAddress] = useState('')
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [officeHours, setOfficeHours] = useState('')
  const [loading, setLoading] = useState(false)

  const { savePracticeInfo, profile } = usePatientStore()
  const { showAlert, AlertComponent } = useCustomAlert()
  const { colors } = useTheme()

  const handleContinue = async () => {
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
        router.replace('/(doctor)')
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

  const handleSkip = () => {
    showAlert({
      title: 'Skip Setup?',
      message: 'You can add your practice info later in Profile settings. Your patients won\'t see your clinic details until you add them.',
      type: 'warning',
      buttons: [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip for Now',
          onPress: () => router.replace('/(doctor)'),
        },
      ],
    })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right', 'bottom']}>
      <AlertComponent />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Building2 size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Set Up Your Practice</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Add your clinic information so patients can find and contact you
          </Text>
        </View>

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
              placeholder="e.g., 123 Main St, Suite 100&#10;City, State 12345"
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
              Patients will use this to book appointments
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
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Text style={[styles.continueButtonText, { color: colors.background }]}>Continue</Text>
              <ChevronRight size={20} color={colors.background} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Skip for Now</Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          * Required fields. You can update this information anytime in your profile settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
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
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  skipButtonText: {
    fontSize: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
})
