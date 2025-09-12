// app/role-selection.tsx - FINAL WORKING VERSION
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Stethoscope } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Link } from 'expo-router';

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | null>(null);
  const [invitationCode, setInvitationCode] = useState('');

  const getAuthUrl = () => {
    if (!selectedRole) return '';
    
    if (selectedRole === 'patient') {
      const code = invitationCode.trim();
      return code ? `/auth?role=patient&invitationCode=${code}` : '/auth?role=patient';
    } else {
      return '/auth?role=doctor';
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
            <View style={[
              styles.roleIcon,
              selectedRole === 'patient' && styles.selectedRoleIcon
            ]}>
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
            <View style={[
              styles.roleIcon,
              selectedRole === 'doctor' && styles.selectedRoleIcon
            ]}>
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

        {/* Invitation Code for Patients */}
        {selectedRole === 'patient' && (
          <Card style={styles.invitationCard}>
            <Text style={styles.invitationTitle}>Invitation Code (Optional)</Text>
            <Text style={styles.invitationSubtitle}>
              Enter the invitation code provided by your orthodontist
            </Text>
            <TextInput
              style={styles.invitationInput}
              placeholder="Enter invitation code"
              value={invitationCode}
              onChangeText={(text) => setInvitationCode(text.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
            />
            <Text style={styles.invitationNote}>
              You can skip this for now and add it later
            </Text>
          </Card>
        )}

        {/* Doctor Info */}
        {selectedRole === 'doctor' && (
          <Card style={styles.doctorCard}>
            <Text style={styles.doctorTitle}>Doctor Registration</Text>
            <Text style={styles.doctorSubtitle}>
              Create your doctor account to start managing patient treatments and send invitations.
            </Text>
          </Card>
        )}

        {/* Continue Button using Link */}
        <View style={styles.actions}>
          {selectedRole ? (
            <Link href={getAuthUrl()} asChild>
              <TouchableOpacity style={styles.continueButton}>
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </Link>
          ) : (
            <TouchableOpacity style={[styles.continueButton, styles.continueButtonDisabled]} disabled>
              <Text style={[styles.continueButtonText, styles.continueButtonTextDisabled]}>
                Select a role to continue
              </Text>
            </TouchableOpacity>
          )}
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
    marginBottom: Spacing.lg,
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
  selectedRoleIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.sm,
  },
  invitationNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  doctorCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  doctorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  doctorSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    marginBottom: Spacing.xl,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  continueButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: Colors.textSecondary,
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