// app/auth.tsx - FIXED VERSION WITHOUT INFINITE LOOPS
import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stethoscope, User, ArrowLeft } from 'lucide-react-native'
import { Button } from '@/components/Button'
import { Colors, Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { router, useLocalSearchParams } from 'expo-router'
import { useCustomAlert } from '@/components/CustomAlert'
import { useTheme } from '@/contexts/ThemeContext'

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [doctorCode, setDoctorCode] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp, clearAuth, joinDoctorByCode } = usePatientStore()
  const params = useLocalSearchParams()
  const { showAlert, AlertComponent } = useCustomAlert()
  const { colors } = useTheme()

  // Get role and invitation code from params
  const role = (params.role as string) || 'patient'
  const invitationCode = params.invitationCode as string

  // Clear auth state once when component mounts
  useEffect(() => {
    clearAuth()

    // Set default to sign up if coming from role selection
    if (params.role) {
      setIsSignUp(true)
    }
  }, []) // Empty dependency array to run only once

  const handleAuth = useCallback(async () => {
    if (!email || !password || (isSignUp && !name)) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please fill in all fields',
        type: 'error',
      })
      return
    }

    if (password.length < 8) {
      showAlert({
        title: 'Password Too Short',
        message: 'Password must be at least 8 characters',
        type: 'error',
      })
      return
    }

    setLoading(true)

    // Helper to add timeout to async operations
    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), ms)
        )
      ])
    }

    try {
      let result
      if (isSignUp) {
        result = await withTimeout(signUp(email, password, name, role, invitationCode), 15000)

        if (!result.error) {
          // If patient entered a doctor code, join that doctor
          if (role === 'patient' && doctorCode.trim()) {
            const joinResult = await joinDoctorByCode(doctorCode.trim())
            if (!joinResult.success) {
              showAlert({
                title: 'Account Created',
                message: `Your account was created but we couldn't link to the doctor: ${joinResult.error}. You can add your doctor later in Settings.`,
                type: 'warning',
                buttons: [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(tabs)')
                  }
                ]
              })
              return
            }
          }

          showAlert({
            title: 'Success!',
            message: role === 'doctor'
              ? 'Doctor account created successfully!'
              : doctorCode.trim()
                ? 'Account created and linked to your doctor!'
                : 'Account created successfully!',
            type: 'success',
            buttons: [
              {
                text: 'OK',
                onPress: () => {
                  // Patients go to patient onboarding, doctors go to practice setup
                  if (role === 'patient') {
                    router.replace('/onboarding')
                  } else {
                    router.replace('/doctor-onboarding')
                  }
                }
              }
            ]
          })
        } else {
          showAlert({
            title: 'Error',
            message: result.error.message,
            type: 'error',
          })
        }
      } else {
        result = await withTimeout(signIn(email, password), 15000)

        if (!result.error) {
          router.replace('/(tabs)')
        } else {
          showAlert({
            title: 'Error',
            message: result.error.message,
            type: 'error',
          })
        }
      }
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error?.message || 'Something went wrong. Please check your connection and try again.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [email, password, name, isSignUp, role, invitationCode, signUp, signIn, showAlert, doctorCode, joinDoctorByCode])

  const handleToggleMode = useCallback(() => {
    setIsSignUp(!isSignUp)
  }, [isSignUp])

  const getRoleTitle = () => {
    return role === 'doctor' ? 'Doctor Portal' : 'Patient Portal'
  }

  const getRoleSubtitle = () => {
    if (role === 'doctor') {
      return isSignUp ? 'Create your doctor account to manage patients' : 'Sign in to your doctor account'
    }
    return isSignUp ? 'Start tracking your orthodontic journey' : 'Welcome back to your treatment tracker'
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
          {invitationCode && (
            <View style={[styles.invitationBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.invitationText, { color: colors.background }]}>Invitation: {invitationCode}</Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                placeholder={role === 'doctor' ? 'Enter your full name (Dr. ...)' : 'Enter your full name'}
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            {isSignUp && (
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>Must be at least 8 characters</Text>
            )}
          </View>

          {isSignUp && role === 'patient' && !invitationCode && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Doctor Code (Optional)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary }]}
                placeholder="Enter your doctor's code"
                placeholderTextColor={colors.textSecondary}
                value={doctorCode}
                onChangeText={(text) => setDoctorCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Ask your orthodontist for their code to link your account
              </Text>
            </View>
          )}

          <Button
            title={loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            onPress={handleAuth}
            disabled={loading}
            style={styles.primaryButton}
          />

          <Button
            title={isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            onPress={handleToggleMode}
            variant="outline"
            style={styles.secondaryButton}
          />

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
  invitationBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  invitationText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
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
  primaryButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    marginBottom: Spacing.lg,
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
