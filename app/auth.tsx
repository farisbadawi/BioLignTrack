// app/auth.tsx - Auth0 Version
import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stethoscope, User, ArrowLeft } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { CodeInput } from '@/components/CodeInput'
import { Colors, Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { useAuth0 } from '@/contexts/Auth0Context'
import { router, useLocalSearchParams } from 'expo-router'
import { useCustomAlert } from '@/components/CustomAlert'
import { useTheme } from '@/contexts/ThemeContext'

// Format phone number as user types (e.g., (555) 123-4567)
const formatPhoneNumber = (text: string): string => {
  const cleaned = text.replace(/\D/g, '')
  const limited = cleaned.slice(0, 10)
  if (limited.length === 0) return ''
  if (limited.length <= 3) return `(${limited}`
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [doctorCode, setDoctorCode] = useState('')
  // Store role selection for after Auth0 login
  const [pendingRole, setPendingRole] = useState<string | null>(null)
  // Optional practice info for doctors (collected after login)
  const [showPracticeForm, setShowPracticeForm] = useState(false)
  const [practiceName, setPracticeName] = useState('')
  const [practicePhone, setPracticePhone] = useState('')
  const [practiceAddress, setPracticeAddress] = useState('')

  const { login, isAuthenticated, user, isLoading: auth0Loading } = useAuth0()
  const { initialize, registerStandalonePatient, registerStandaloneDoctor, joinDoctorByCode, profile } = usePatientStore()
  const params = useLocalSearchParams()
  const { showAlert, AlertComponent } = useCustomAlert()
  const { colors } = useTheme()

  // Get role from params
  const role = (params.role as string) || 'patient'

  // Handle successful Auth0 login - register user in backend
  useEffect(() => {
    if (isAuthenticated && user && pendingRole) {
      handlePostLoginRegistration()
    }
  }, [isAuthenticated, user, pendingRole])

  const handlePostLoginRegistration = async () => {
    if (!pendingRole) return

    setLoading(true)
    try {
      // Initialize will call whoami and either find existing user or return none
      await initialize()

      // Check if user is already registered
      const { profile: existingProfile, userType } = usePatientStore.getState()

      if (existingProfile) {
        // User already exists, go to main app
        const route = userType === 'standalone_doctor' ? '/(doctor)' : '/(patient)';
        showAlert({
          title: 'Welcome Back!',
          message: 'You are already registered.',
          type: 'success',
          buttons: [{ text: 'OK', onPress: () => router.replace(route) }]
        })
        return
      }

      // New user - register based on role
      if (pendingRole === 'doctor') {
        // Show practice form for doctors
        setShowPracticeForm(true)
        setLoading(false)
        return
      }

      // If patient entered a code, try PMS link first (before registering as standalone)
      if (doctorCode.trim()) {
        const joinResult = await joinDoctorByCode(doctorCode.trim())
        if (joinResult.success) {
          const message = joinResult.type === 'pms'
            ? 'Account linked to your clinic!'
            : 'Account created and linked to your doctor!'
          showAlert({
            title: 'Success!',
            message,
            type: 'success',
            buttons: [{ text: 'OK', onPress: () => router.replace('/(patient)') }]
          })
          return
        }
        // If code failed, show error and don't continue
        showAlert({
          title: 'Invalid Code',
          message: joinResult.error || 'The code you entered is invalid. Please check and try again.',
          type: 'error',
        })
        setLoading(false)
        return
      }

      // No code entered - register as standalone patient
      const result = await registerStandalonePatient({
        name: user?.name,
        email: user?.email,
      })

      if (result.error) {
        showAlert({
          title: 'Registration Error',
          message: result.error,
          type: 'error',
        })
        setLoading(false)
        return
      }

      showAlert({
        title: 'Success!',
        message: 'Account created successfully!',
        type: 'success',
        buttons: [{ text: 'OK', onPress: () => router.replace('/onboarding') }]
      })
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error?.message || 'Something went wrong.',
        type: 'error',
      })
    } finally {
      setLoading(false)
      setPendingRole(null)
    }
  }

  const handleDoctorRegistration = async () => {
    setLoading(true)
    try {
      const result = await registerStandaloneDoctor({
        name: user?.name,
        practiceName: practiceName.trim() || undefined,
        practicePhone: practicePhone.trim() || undefined,
        practiceAddress: practiceAddress.trim() || undefined,
      })

      if (result.error) {
        showAlert({
          title: 'Registration Error',
          message: result.error,
          type: 'error',
        })
        return
      }

      showAlert({
        title: 'Success!',
        message: 'Doctor account created successfully!',
        type: 'success',
        buttons: [{ text: 'OK', onPress: () => router.replace('/doctor-onboarding') }]
      })
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error?.message || 'Something went wrong.',
        type: 'error',
      })
    } finally {
      setLoading(false)
      setShowPracticeForm(false)
    }
  }

  const handleAuth0Login = useCallback(async () => {
    setLoading(true)
    setPendingRole(role)
    try {
      await login()
      // After login, the useEffect will handle registration
    } catch (error: any) {
      // User cancelled or error occurred
      if (!error?.message?.includes('cancelled')) {
        showAlert({
          title: 'Login Error',
          message: error?.message || 'Failed to login. Please try again.',
          type: 'error',
        })
      }
      setPendingRole(null)
    } finally {
      setLoading(false)
    }
  }, [login, role, showAlert])

  const getRoleTitle = () => {
    return role === 'doctor' ? 'Doctor Portal' : 'Patient Portal'
  }

  const getRoleSubtitle = () => {
    if (role === 'doctor') {
      return 'Sign in or create your doctor account to manage patients'
    }
    return 'Sign in or create your account to track your treatment'
  }

  // Show practice info form for doctors after Auth0 login
  if (showPracticeForm) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right', 'bottom']}>
        <AlertComponent />
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/biolign-logo-transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={[styles.roleIconContainer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Stethoscope size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Practice Information</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Add your practice details (optional)
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Practice Name</Text>
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
              <Text style={[styles.label, { color: colors.textPrimary }]}>Practice Phone</Text>
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
              <Text style={[styles.label, { color: colors.textPrimary }]}>Practice Address</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                placeholder="e.g., 123 Main St, City, State"
                placeholderTextColor={colors.textSecondary}
                value={practiceAddress}
                onChangeText={setPracticeAddress}
                autoCapitalize="words"
              />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                You can add more details like office hours later in settings
              </Text>
            </View>

            <Button
              title={loading ? 'Creating Account...' : 'Complete Registration'}
              onPress={handleDoctorRegistration}
              disabled={loading}
              style={styles.primaryButton}
            />

            <Button
              title="Skip for now"
              onPress={() => handleDoctorRegistration()}
              variant="outline"
              disabled={loading}
              style={styles.secondaryButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right', 'bottom']}>
      <AlertComponent />
      <TouchableOpacity
        style={styles.topBackButton}
        onPress={() => router.replace('/role-selection')}
      >
        <ArrowLeft size={22} color={colors.primary} />
        <Text style={[styles.topBackText, { color: colors.primary }]}>Change Role</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/biolign-logo-transparent.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={[styles.roleIconContainer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            {role === 'doctor'
              ? <Stethoscope size={32} color={colors.primary} />
              : <User size={32} color={colors.primary} />
            }
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{getRoleTitle()}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {getRoleSubtitle()}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Invite/Doctor code input for patients */}
          {role === 'patient' && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Invite Code (Optional)</Text>
              <View style={styles.codeInputWrapper}>
                <CodeInput
                  value={doctorCode}
                  onChange={setDoctorCode}
                  length={6}
                />
              </View>
              <Text style={[styles.helpText, { color: colors.textSecondary, textAlign: 'center' }]}>
                Enter the code from your clinic's email or your doctor
              </Text>
            </View>
          )}

          <Button
            title={loading || auth0Loading ? 'Loading...' : 'Continue with Auth0'}
            onPress={handleAuth0Login}
            disabled={loading || auth0Loading}
            style={styles.primaryButton}
          />

          <Text style={[styles.orText, { color: colors.textSecondary }]}>
            You'll be redirected to sign in or create an account
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 200,
    height: 112,
    marginBottom: Spacing.sm,
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  codeInputWrapper: {
    marginVertical: Spacing.sm,
  },
  primaryButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    marginBottom: Spacing.lg,
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  topBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  topBackText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  footer: {
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
})
