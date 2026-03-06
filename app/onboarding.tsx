// app/onboarding.tsx - Patient onboarding screen for setting up treatment
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, ChevronRight, Sparkles, User } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { router } from 'expo-router';
import { useCustomAlert } from '@/components/CustomAlert';

export default function OnboardingScreen() {
  const { updateProfile, loadPatientData, logTrayChange } = usePatientStore();
  const [name, setName] = useState('');
  const [totalTrays, setTotalTrays] = useState('');
  const [currentTray, setCurrentTray] = useState('1');
  const [loading, setLoading] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const total = parseInt(totalTrays, 10);
    const current = parseInt(currentTray, 10);

    if (!trimmedName || trimmedName.length < 2) {
      showAlert({
        title: 'Name Required',
        message: 'Please enter your name (at least 2 characters)',
        type: 'error',
      });
      return;
    }

    if (!total || total < 1 || total > 100) {
      showAlert({
        title: 'Invalid Input',
        message: 'Please enter a valid number of aligners (1-100)',
        type: 'error',
      });
      return;
    }

    if (!current || current < 1 || current > total) {
      showAlert({
        title: 'Invalid Input',
        message: `Current aligner must be between 1 and ${total}`,
        type: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      // Update the patient record with the treatment info
      const result = await updateProfile({
        name: trimmedName,
        totalTrays: total,
        currentTray: current,
      });

      if (!result.success) {
        showAlert({
          title: 'Error',
          message: result.error || 'Failed to save your treatment information. Please try again.',
          type: 'error',
        });
        return;
      }

      // Log the initial tray change
      await logTrayChange(current, 'good');

      // Reload patient data to get the updated info
      await loadPatientData();

      // Navigate to the main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding error:', error);
      showAlert({
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <AlertComponent />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Sparkles size={40} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Let's Get Started!</Text>
            <Text style={styles.subtitle}>
              Tell us about your aligner treatment so we can help you track your progress.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <Text style={styles.helpText}>
                How should we address you?
              </Text>
              <View style={styles.inputRow}>
                <User size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., John Smith"
                  placeholderTextColor={Colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Number of Aligners</Text>
              <Text style={styles.helpText}>
                How many aligners are in your treatment plan?
              </Text>
              <View style={styles.inputRow}>
                <Package size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 24"
                  placeholderTextColor={Colors.textSecondary}
                  value={totalTrays}
                  onChangeText={setTotalTrays}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Aligner Number</Text>
              <Text style={styles.helpText}>
                Which aligner are you currently wearing?
              </Text>
              <View style={styles.inputRow}>
                <Package size={20} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 1"
                  placeholderTextColor={Colors.textSecondary}
                  value={currentTray}
                  onChangeText={setCurrentTray}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            {/* Progress Preview */}
            {totalTrays && currentTray && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Your Progress</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          (parseInt(currentTray, 10) / parseInt(totalTrays, 10)) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.previewText}>
                  Aligner {currentTray} of {totalTrays} (
                  {Math.round(
                    (parseInt(currentTray, 10) / parseInt(totalTrays, 10)) * 100
                  ) || 0}
                  % complete)
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Saving...' : 'Start Tracking'}
              </Text>
              {!loading && <ChevronRight size={20} color={Colors.background} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              You can always update this information later in your profile settings.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
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
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  helpText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,

  },
  previewCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  previewText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actions: {
    marginBottom: Spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.background,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  infoSection: {
    marginTop: 'auto',
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
