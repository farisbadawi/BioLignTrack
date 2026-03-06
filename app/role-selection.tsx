// app/role-selection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Stethoscope, ArrowRight, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | null>(null);
  const { colors } = useTheme();

  const getAuthUrl = (): `/auth?${string}` => {
    if (!selectedRole) return '/auth?' as `/auth?${string}`;
    return `/auth?role=${selectedRole}`;
  };

  const isSelected = (role: 'patient' | 'doctor') => selectedRole === role;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/biolign-logo-transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            <View style={styles.welcomeContainer}>
              <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
                Welcome to
              </Text>
              <Text style={[styles.headline, { color: colors.textPrimary }]}>
                BioLign
              </Text>
            </View>

            <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
              Your journey to a perfect smile starts here
            </Text>
          </View>

          {/* Role Selection Label */}
          <View style={styles.sectionLabel}>
            <View style={[styles.labelLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.labelText, { color: colors.textSecondary }]}>
              I am a...
            </Text>
            <View style={[styles.labelLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Role Cards */}
          <View style={styles.roleSelection}>
            {/* Patient Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.roleCard,
                {
                  backgroundColor: colors.background,
                  borderColor: isSelected('patient') ? colors.primary : colors.border,
                  borderWidth: isSelected('patient') ? 2 : 1,
                },
                isSelected('patient') && styles.roleCardSelected,
              ]}
              onPress={() => setSelectedRole('patient')}
            >
              <View style={[
                styles.roleIconCircle,
                {
                  backgroundColor: isSelected('patient') ? colors.primary : colors.primary + '15',
                },
              ]}>
                <User size={28} color={isSelected('patient') ? '#ffffff' : colors.primary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>
                  Patient
                </Text>
                <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                  Track your aligner progress and stay on schedule
                </Text>
              </View>
              <View style={[
                styles.radioOuter,
                {
                  borderColor: isSelected('patient') ? colors.primary : colors.border,
                  backgroundColor: isSelected('patient') ? colors.primary : 'transparent',
                },
              ]}>
                {isSelected('patient') && (
                  <View style={styles.radioCheck}>
                    <ArrowRight size={14} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Doctor Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.roleCard,
                {
                  backgroundColor: colors.background,
                  borderColor: isSelected('doctor') ? colors.primary : colors.border,
                  borderWidth: isSelected('doctor') ? 2 : 1,
                },
                isSelected('doctor') && styles.roleCardSelected,
              ]}
              onPress={() => setSelectedRole('doctor')}
            >
              <View style={[
                styles.roleIconCircle,
                {
                  backgroundColor: isSelected('doctor') ? colors.primary : colors.primary + '15',
                },
              ]}>
                <Stethoscope size={28} color={isSelected('doctor') ? '#ffffff' : colors.primary} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>
                  Doctor
                </Text>
                <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                  Manage patients and monitor their treatments
                </Text>
              </View>
              <View style={[
                styles.radioOuter,
                {
                  borderColor: isSelected('doctor') ? colors.primary : colors.border,
                  backgroundColor: isSelected('doctor') ? colors.primary : 'transparent',
                },
              ]}>
                {isSelected('doctor') && (
                  <View style={styles.radioCheck}>
                    <ArrowRight size={14} color="#ffffff" strokeWidth={3} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Info Cards */}
          {selectedRole === 'patient' && (
            <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={[styles.infoCardText, { color: colors.textPrimary }]}>
                Track wear time, log progress photos, and never miss a tray change!
              </Text>
            </View>
          )}

          {selectedRole === 'doctor' && (
            <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={[styles.infoCardText, { color: colors.textPrimary }]}>
                Invite patients, track their compliance, and communicate easily.
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
              <Text style={styles.ctaButtonText}>
                Continue as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
              </Text>
              <ArrowRight size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <View style={[styles.ctaButton, styles.ctaButtonDisabled, { backgroundColor: colors.border }]}>
              <Text style={[styles.ctaButtonTextDisabled, { color: colors.textSecondary }]}>
                Select how you'll use BioLign
              </Text>
            </View>
          )}
          <Text style={[styles.legalText, { color: colors.textSecondary }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 200,
    height: 110,
    marginBottom: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  headline: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Section label
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  labelLine: {
    flex: 1,
    height: 1,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Role cards
  roleSelection: {
    gap: 16,
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  roleCardSelected: {
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  roleIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioCheck: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  // Bottom area
  bottomArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  ctaButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  ctaButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '500',
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 14,
  },
});
