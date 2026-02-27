// app/(tabs)/invite.tsx - Simplified: Just doctor code sharing
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Key, Copy, Share as ShareIcon, Users } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { useCustomAlert } from '@/components/CustomAlert';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/contexts/ThemeContext';

export default function InviteScreen() {
  const { userRole, getDoctorCode, assignedPatients } = usePatientStore();
  const [doctorCode, setDoctorCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);
  const { showAlert, AlertComponent } = useCustomAlert();
  const { colors } = useTheme();

  useEffect(() => {
    const fetchDoctorCode = async () => {
      if (userRole === 'doctor') {
        setLoadingCode(true);
        const code = await getDoctorCode?.();
        setDoctorCode(code || null);
        setLoadingCode(false);
      }
    };
    fetchDoctorCode();
  }, [userRole, getDoctorCode]);

  // Only show this screen for doctors
  if (userRole !== 'doctor') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>Access denied. This page is for doctors only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const copyToClipboard = async () => {
    if (!doctorCode) return;
    try {
      await Clipboard.setStringAsync(doctorCode);
      showAlert({
        title: 'Copied!',
        message: 'Your doctor code has been copied to clipboard',
        type: 'success',
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to copy to clipboard',
        type: 'error',
      });
    }
  };

  const shareCode = async () => {
    if (!doctorCode) return;
    const message = `Join me on BioLignTrack to track your orthodontic treatment!\n\nUse this code when signing up:\n\n${doctorCode}\n\nDownload the app and enter this code to link your account with mine.`;

    try {
      await Share.share({
        message: message,
        title: 'BioLignTrack - Doctor Code'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      <AlertComponent />
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Invite Patients</Text>
          <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Share your code with patients to link their accounts
          </Text>
        </View>

        {/* Doctor Code Card */}
        <Card style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <Key size={28} color={colors.primary} />
            <Text style={[styles.codeTitle, { color: colors.textPrimary }]}>Your Doctor Code</Text>
          </View>

          {loadingCode ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : doctorCode ? (
            <>
              <View style={[styles.codeDisplay, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                <Text style={[styles.codeText, { color: colors.primary }]}>{doctorCode}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={copyToClipboard}>
                  <Copy size={20} color={colors.background} />
                  <Text style={[styles.actionButtonText, { color: colors.background }]}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, styles.shareButton, { backgroundColor: colors.background, borderColor: colors.primary }]} onPress={shareCode}>
                  <ShareIcon size={20} color={colors.primary} />
                  <Text style={[styles.actionButtonText, styles.shareButtonText, { color: colors.primary }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={[styles.errorText, { color: colors.error }]}>Could not load code. Please try again.</Text>
          )}
        </Card>

        {/* Instructions */}
        <Card style={styles.instructionsCard}>
          <Text style={[styles.instructionsTitle, { color: colors.textPrimary }]}>How it works</Text>

          <View style={[styles.step, { borderBottomColor: colors.border }]}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={[styles.stepNumberText, { color: colors.background }]}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Share your code</Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                Give your code to patients verbally, via text, or use the share button
              </Text>
            </View>
          </View>

          <View style={[styles.step, { borderBottomColor: colors.border }]}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={[styles.stepNumberText, { color: colors.background }]}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Patient signs up</Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                Patient downloads the app and creates an account
              </Text>
            </View>
          </View>

          <View style={[styles.step, { borderBottomColor: colors.border }]}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={[styles.stepNumberText, { color: colors.background }]}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Patient enters code</Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                During sign-up or in Profile settings, patient enters your code
              </Text>
            </View>
          </View>

          <View style={[styles.step, { borderBottomWidth: 0 }, { borderBottomColor: colors.border }]}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={[styles.stepNumberText, { color: colors.background }]}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>You're connected!</Text>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                Patient appears in your Patients tab and you can track their progress
              </Text>
            </View>
          </View>
        </Card>

        {/* Patient Count */}
        <Card style={styles.statsCard}>
          <Users size={24} color={colors.primary} />
          <View style={styles.statsContent}>
            <Text style={[styles.statsValue, { color: colors.textPrimary }]}>{assignedPatients?.length || 0}</Text>
            <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Linked Patients</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  header: {
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  codeCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  codeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  codeDisplay: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 6,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  shareButton: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  shareButtonText: {
    color: Colors.primary,
  },
  instructionsCard: {
    marginBottom: Spacing.lg,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  step: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statsLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
