// app/auth.tsx - NEW FILE
import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { Colors, Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { router } from 'expo-router'

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signIn, signUp } = usePatientStore()

  const handleAuth = async () => {
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
        result = await signUp(email, password, name, 'patient')
        if (!result.error) {
          Alert.alert(
            'Success!', 
            'Account created successfully. You can now start tracking your orthodontic journey!'
          )
        }
      } else {
        result = await signIn(email, password)
      }

      if (result.error) {
        Alert.alert('Error', result.error.message)
      } else {
        router.replace('/(tabs)')
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    try {
      const result = await signIn('demo@biolign.com', 'demo123')
      if (result.error) {
        // Create demo account if it doesn't exist
        const signUpResult = await signUp('demo@biolign.com', 'demo123', 'Demo Patient', 'patient')
        if (!signUpResult.error) {
          router.replace('/(tabs)')
        }
      } else {
        router.replace('/(tabs)')
      }
    } catch (error) {
      Alert.alert('Error', 'Could not create demo account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>🦷</Text>
          <Text style={styles.title}>BioLign Progress</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Start tracking your orthodontic journey' : 'Welcome back to your treatment tracker'}
          </Text>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
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
            onPress={() => setIsSignUp(!isSignUp)}
            variant="outline"
            style={styles.secondaryButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Try Demo Account"
            onPress={handleDemoLogin}
            variant="secondary"
            disabled={loading}
            style={styles.demoButton}
          />
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
  demoButton: {
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