// app/role-selection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Stethoscope } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { router } from 'expo-router';

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | null>(null);
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert('Please select your role', 'Choose whether you are a patient or doctor');
      return;
    }

    setLoading(true);

    try {
      if (selectedRole === 'patient') {
        if (!invitationCode.trim()) {
          Alert.alert('Invitation Required', 'Please enter the invitation code provided by your doctor');
          setLoading(false);
          return;
        }
        router.replace(`/auth?role=patient&invitationCode=${invitationCode.trim().toUpperCase()}`);
      } else {
        router.replace('/auth?role=doctor');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>🦷</Text>
          <Text style={styles.title}>BioLign Progress</Text>
          <Text style={styles.subtitle}>
            Choose your role to get started with orthodontic treatment tracking
          </Text>
        </View>

        <View style={styles.roleSelection}>
          <Text style={styles.sectionTitle}>I am a...</Text>
          
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'patient' && styles.selectedRoleCard
            ]}
            onPress={() => setSelectedRole('patient')}
          >
            <View style={styles.roleIcon}>
              <Users size={32} color={selectedRole === 'patient' ? Colors.background : Colors.primary} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={[
                styles.roleTitle,
                selectedRole === 'patient' && styles.selectedRoleTitle
              ]}>
                Patient
              </Text>
              <Text style={[
                styles.roleDescription,
                selectedRole === 'patient' && styles.selectedRoleDescription
              ]}>
                I'm receiving orthodontic treatment and want to track my progress
              </Text>
            </View>
            {selectedRole === 'patient' && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'doctor' && styles.selectedRoleCard
            ]}
            onPress={() => setSelectedRole('doctor')}
          >
            <View style={styles.roleIcon}>
              <Stethoscope size={32} color={selectedRole === 'doctor' ? Colors.background : Colors.primary} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={[
                styles.roleTitle,
                selectedRole === 'doctor' && styles.selectedRoleTitle
              ]}>
                Doctor
              </Text>
              <Text style={[
                styles.roleDescription,
                selectedRole === 'doctor' && styles.selectedRoleDescription
              ]}>
                I'm an orthodontist managing patient treatments and progress
              </Text>
            </View>
            {selectedRole === 'doctor' && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {selectedRole === 'patient' && (
          <Card style={styles.invitationCard}>
            <Text style={styles.invitationTitle}>Invitation Code</Text>
            <Text style={styles.invitationSubtitle}>
              Enter the code provided by your orthodontist
            </Text>
            <TextInput
              style={styles.invitationInput}
              placeholder="Enter invitation code"
              value={invitationCode}
              onChangeText={(text) => setInvitationCode(text.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            title={loading ? 'Loading...' : 'Continue'}
            onPress={handleContinue}
            disabled={!selectedRole || loading || (selectedRole === 'patient' && !invitationCode.trim())}
            style={styles.continueButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
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
  roleSelection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  selectedRoleCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  roleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  selectedRoleTitle: {
    color: Colors.background,
  },
  roleDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  selectedRoleDescription: {
    color: Colors.background,
    opacity: 0.9,
  },
  checkmark: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  invitationCard: {
    marginBottom: Spacing.xl,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  invitationSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  invitationInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 2,
  },
  actions: {
    marginBottom: Spacing.xl,
  },
  continueButton: {
    minHeight: 52,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});