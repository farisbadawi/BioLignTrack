// app/auth.tsx - FIXED VERSION WITHOUT INFINITE LOOPS
import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { Colors, Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { router, useLocalSearchParams } from 'expo-router'

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signIn, signUp, clearAuth } = usePatientStore()
  const params = useLocalSearchParams()
  
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
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    
    try {
      let result
      if (isSignUp) {
        console.log('Attempting signUp...')
        result = await signUp(email, password, name, role, invitationCode)
        
        if (!result.error) {
          console.log('SignUp successful')
          Alert.alert(
            'Success!', 
            role === 'doctor' ? 
              'Doctor account created successfully!' : 
              'Account created successfully!',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Navigating to tabs...')
                  router.replace('/(tabs)')
                }
              }
            ]
          )
        } else {
          console.log('SignUp error:', result.error)
          Alert.alert('Error', result.error.message)
        }
      } else {
        console.log('Attempting signIn...')
        result = await signIn(email, password)
        
        if (!result.error) {
          console.log('SignIn successful, navigating...')
          router.replace('/(tabs)')
        } else {
          console.log('SignIn error:', result.error)
          Alert.alert('Error', result.error.message)
        }
      }
    } catch (error) {
      console.error('Auth exception:', error)
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [email, password, name, isSignUp, role, invitationCode, signUp, signIn])

  const handleToggleMode = useCallback(() => {
    setIsSignUp(!isSignUp)
  }, [isSignUp])

  const handleDemoLogin = useCallback(async (demoType: 'patient' | 'doctor') => {
    setLoading(true)
    try {
      const demoCredentials = {
        patient: { email: 'demo.patient@biolign.com', password: 'demo123', name: 'Demo Patient' },
        doctor: { email: 'demo.doctor@biolign.com', password: 'demo123', name: 'Dr. Demo' }
      }
      
      const creds = demoCredentials[demoType]
      
      // Try to sign in first
      const result = await signIn(creds.email, creds.password)
      
      if (result.error) {
        // If sign in fails, try to create account
        console.log('Sign in failed, creating demo account...')
        const signUpResult = await signUp(creds.email, creds.password, creds.name, demoType)
        if (!signUpResult.error) {
          router.replace('/(tabs)')
        } else {
          Alert.alert('Error', signUpResult.error?.message || 'Could not create demo account')
        }
      } else {
        router.replace('/(tabs)')
      }
    } catch (error) {
      Alert.alert('Error', 'Could not access demo account')
    } finally {
      setLoading(false)
    }
  }, [signIn, signUp])

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>{role === 'doctor' ? '👨‍⚕️' : '🦷'}</Text>
          <Text style={styles.title}>{getRoleTitle()}</Text>
          <Text style={styles.subtitle}>
            {getRoleSubtitle()}
          </Text>
          {invitationCode && (
            <View style={styles.invitationBadge}>
              <Text style={styles.invitationText}>Invitation: {invitationCode}</Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder={role === 'doctor' ? 'Enter your full name (Dr. ...)' : 'Enter your full name'}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            {isSignUp && (
              <Text style={styles.helpText}>Must be at least 6 characters</Text>
            )}
          </View>

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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Try Demo Accounts</Text>
            <View style={styles.demoButtons}>
              <Button
                title="Demo Patient"
                onPress={() => handleDemoLogin('patient')}
                variant="secondary"
                disabled={loading}
                style={styles.demoButton}
              />
              <Button
                title="Demo Doctor"
                onPress={() => handleDemoLogin('doctor')}
                variant="secondary"
                disabled={loading}
                style={styles.demoButton}
              />
            </View>
          </View>

          {!params.role && (
            <Button
              title="← Back to Role Selection"
              onPress={() => router.replace('/role-selection')}
              variant="outline"
              style={styles.backButton}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
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
  logo: {
    fontSize: 48,
    marginBottom: Spacing.sm,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  demoSection: {
    marginBottom: Spacing.lg,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  demoButton: {
    flex: 1,
  },
  backButton: {
    marginBottom: Spacing.lg,
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