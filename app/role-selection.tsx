// app/role-selection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Stethoscope, ArrowRight, Check } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { Card } from '@/components/Card';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | null>(null);
  const [invitationCode, setInvitationCode] = useState('');
  const { colors } = useTheme();

  const getAuthUrl = (): `/auth?${string}` => {
    if (!selectedRole) return '/auth?' as `/auth?${string}`;

    if (selectedRole === 'patient') {
      const code = invitationCode.trim();
      return code ? `/auth?role=patient&invitationCode=${code}` : '/auth?role=patient';
    } else {
      return '/auth?role=doctor';
    }
  };

  const isSelected = (role: 'patient' | 'doctor') => selectedRole === role;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/biolign-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.headline, { color: colors.textPrimary }]}>
            Welcome to BioLign
          </Text>
          <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
            Choose how you'd like to get started
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.roleSelection}>
          {/* Patient Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.roleCard,
              { backgroundColor: colors.background, borderColor: colors.border },
              isSelected('patient') && { borderColor: colors.primary, borderWidth: 2 },
            ]}
            onPress={() => setSelectedRole('patient')}
          >
            <View style={[
              styles.roleIconCircle,
              { backgroundColor: isSelected('patient') ? colors.primary : colors.surface },
            ]}>
              <Users size={24} color={isSelected('patient') ? '#ffffff' : colors.primary} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>
                I'm a Patient
              </Text>
              <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                Track your orthodontic treatment progress
              </Text>
            </View>
            <View style={[
              styles.radioOuter,
              { borderColor: isSelected('patient') ? colors.primary : colors.border },
            ]}>
              {isSelected('patient') && (
                <View style={[styles.radioInner, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="#ffffff" strokeWidth={3} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Doctor Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.roleCard,
              { backgroundColor: colors.background, borderColor: colors.border },
              isSelected('doctor') && { borderColor: colors.primary, borderWidth: 2 },
            ]}
            onPress={() => setSelectedRole('doctor')}
          >
            <View style={[
              styles.roleIconCircle,
              { backgroundColor: isSelected('doctor') ? colors.primary : colors.surface },
            ]}>
              <Stethoscope size={24} color={isSelected('doctor') ? '#ffffff' : colors.primary} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>
                I'm a Doctor
              </Text>
              <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                Manage patients and track their treatments
              </Text>
            </View>
            <View style={[
              styles.radioOuter,
              { borderColor: isSelected('doctor') ? colors.primary : colors.border },
            ]}>
              {isSelected('doctor') && (
                <View style={[styles.radioInner, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="#ffffff" strokeWidth={3} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Invitation Code for Patients */}
        {selectedRole === 'patient' && (
          <View style={[styles.optionalSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.optionalTitle, { color: colors.textPrimary }]}>
              Have an invitation code?
            </Text>
            <Text style={[styles.optionalSubtitle, { color: colors.textSecondary }]}>
              Enter the code from your orthodontist, or skip for now
            </Text>
            <TextInput
              style={[styles.codeInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary }]}
              placeholder="e.g. ABC123"
              placeholderTextColor={colors.textSecondary}
              value={invitationCode}
              onChangeText={(text) => setInvitationCode(text.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
            />
          </View>
        )}

        {/* Doctor Info */}
        {selectedRole === 'doctor' && (
          <View style={[styles.optionalSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.optionalTitle, { color: colors.textPrimary }]}>
              Doctor Registration
            </Text>
            <Text style={[styles.optionalSubtitle, { color: colors.textSecondary }]}>
              Create your account to manage patient treatments and send invitations.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom area */}
      <View style={[styles.bottomArea, { backgroundColor: colors.surface }]}>
        {selectedRole ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(getAuthUrl())}
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.ctaButtonText, { color: '#0f172a' }]}>
              Continue as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
            </Text>
            <ArrowRight size={18} color="#0f172a" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.ctaButton, styles.ctaButtonDisabled, { backgroundColor: colors.border }]}>
            <Text style={[styles.ctaButtonText, { opacity: 0.5 }]}>
              Select a role to continue
            </Text>
          </View>
        )}
        <Text style={[styles.legalText, { color: colors.textSecondary }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 180,
    height: 100,
    marginBottom: 24,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.1,
  },

  // Role cards
  roleSelection: {
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  roleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  roleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Optional sections
  optionalSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  optionalTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  optionalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 3,
  },

  // Bottom area
  bottomArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
  },
});
