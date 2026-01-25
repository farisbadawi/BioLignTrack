import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CheckCircle, Clock, AlertCircle, Calendar, Play, ChevronRight, Settings, RefreshCw, Package, History, Award } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useCustomAlert } from '@/components/CustomAlert';
import { useTheme } from '@/contexts/ThemeContext';

export default function TrayScreen() {
  const { patient, trayChanges, logTrayChange, updateTreatmentInfo, startNewTreatmentBout, currentBout, treatmentBouts, loadPatientData } = usePatientStore();
  const [selectedFit, setSelectedFit] = useState<'ok' | 'watch' | 'not_seated' | null>(null);
  const { showAlert, AlertComponent } = useCustomAlert();
  const { colors: themeColors } = useTheme();

  // Setup form state
  const [showSetup, setShowSetup] = useState(false);
  const [totalAlignersInput, setTotalAlignersInput] = useState('');
  const [currentAlignerInput, setCurrentAlignerInput] = useState('1');
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle treatment setup
  const handleSetupTreatment = async () => {
    const total = parseInt(totalAlignersInput, 10);
    const current = parseInt(currentAlignerInput, 10);

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

    setIsUpdating(true);
    try {
      const result = await updateTreatmentInfo(total, current);
      if (result.success) {
        await loadPatientData();
        setShowSetup(false);
        setTotalAlignersInput('');
        setCurrentAlignerInput('1');
        showAlert({
          title: 'Treatment Setup Complete!',
          message: `You're now tracking ${total} aligners, starting at #${current}.`,
          type: 'success',
        });
      } else {
        showAlert({
          title: 'Error',
          message: result.error || 'Failed to save treatment information',
          type: 'error',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle starting a new treatment bout
  const handleStartNewBout = () => {
    showAlert({
      title: 'Start New Bout?',
      message: 'This will begin a new set of aligners. Your previous bout history will be preserved. Enter your new aligner count to continue.',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => setShowSetup(true),
        },
      ],
    });
  };

  const handleConfirmNewBout = async () => {
    const total = parseInt(totalAlignersInput, 10);

    if (!total || total < 1 || total > 100) {
      showAlert({
        title: 'Invalid Input',
        message: 'Please enter a valid number of aligners (1-100)',
        type: 'error',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const result = await startNewTreatmentBout(total);
      if (result.success) {
        await loadPatientData();
        setShowSetup(false);
        setTotalAlignersInput('');
        showAlert({
          title: 'New Bout Started!',
          message: `Bout ${(currentBout?.bout_number || 0) + 1} has begun with ${total} aligners.`,
          type: 'success',
        });
      } else {
        showAlert({
          title: 'Error',
          message: result.error || 'Failed to start new treatment',
          type: 'error',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Show setup screen if no treatment configured
  const needsSetup = !patient || !patient.total_trays || patient.total_trays === 0;

  if (needsSetup || showSetup) {
    const isNewBout = patient && patient.total_trays && patient.total_trays > 0;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.surface }]} edges={['top', 'left', 'right']}>
        <AlertComponent />
        <ScrollView style={[styles.scrollView, { backgroundColor: themeColors.surface }]} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>{isNewBout ? 'New Bout' : 'Treatment Setup'}</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              {isNewBout
                ? 'Configure your new set of aligners'
                : 'Tell us about your aligner treatment to get started'
              }
            </Text>
          </View>

          <Card style={styles.setupCard}>
            <View style={styles.setupIconContainer}>
              <Package size={40} color={themeColors.primary} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Total Number of Aligners</Text>
              <Text style={styles.inputHelp}>How many aligners are in your treatment plan?</Text>
              <TextInput
                style={styles.setupInput}
                placeholder="e.g., 24"
                placeholderTextColor={Colors.textSecondary}
                value={totalAlignersInput}
                onChangeText={setTotalAlignersInput}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            {!isNewBout && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Aligner Number</Text>
                <Text style={styles.inputHelp}>Which aligner are you currently wearing?</Text>
                <TextInput
                  style={styles.setupInput}
                  placeholder="e.g., 1"
                  placeholderTextColor={Colors.textSecondary}
                  value={currentAlignerInput}
                  onChangeText={setCurrentAlignerInput}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            )}

            {/* Preview */}
            {totalAlignersInput && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Preview</Text>
                <View style={styles.previewProgress}>
                  <View
                    style={[
                      styles.previewProgressFill,
                      {
                        width: `${Math.min(
                          ((parseInt(isNewBout ? '1' : currentAlignerInput, 10) || 1) / (parseInt(totalAlignersInput, 10) || 1)) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.previewText}>
                  Aligner {isNewBout ? 1 : currentAlignerInput || 1} of {totalAlignersInput}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.setupButton, isUpdating && styles.setupButtonDisabled]}
              onPress={isNewBout ? handleConfirmNewBout : handleSetupTreatment}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <>
                  <Text style={styles.setupButtonText}>
                    {isNewBout ? 'Start New Bout' : 'Start Tracking'}
                  </Text>
                  <ChevronRight size={20} color={Colors.background} />
                </>
              )}
            </TouchableOpacity>

            {isNewBout && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowSetup(false);
                  setTotalAlignersInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </Card>

          <View style={styles.setupInfoSection}>
            <Text style={styles.setupInfoText}>
              You can update this information later in your profile settings.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!patient) return null;

  const currentTrayChange = trayChanges.find(change => change.tray_number === patient.current_tray);
  const daysOnCurrentTray = currentTrayChange
    ? Math.floor((Date.now() - new Date(currentTrayChange.date_changed).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const recommendedDays = 14; // 2 weeks per tray
  const daysLeft = Math.max(0, recommendedDays - daysOnCurrentTray);
  const isReadyForChange = daysLeft === 0;
  const isLastTray = patient.current_tray >= patient.total_trays;

  const handleStartNewAligner = () => {
    if (!selectedFit) {
      showAlert({
        title: 'Fit Check Required',
        message: 'Please select how your current tray fits before changing to a new one.',
        type: 'warning',
      });
      return;
    }

    if (isLastTray) {
      showAlert({
        title: 'Final Aligner',
        message: "You're already on your last aligner! Contact your orthodontist for next steps.",
        type: 'info',
      });
      return;
    }

    const nextTray = patient.current_tray + 1;

    // Show different messages based on timing
    if (!isReadyForChange) {
      showAlert({
        title: 'Start New Aligner Early?',
        message: `You've only worn your current aligner for ${daysOnCurrentTray} days (recommended: 14 days). Starting aligner #${nextTray} early may affect your treatment. Are you sure?`,
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Anyway',
            onPress: () => {
              logTrayChange(nextTray, selectedFit);
              setSelectedFit(null);
              showAlert({
                title: 'New Aligner Started!',
                message: `You're now on aligner #${nextTray}. Remember to wear it 22 hours daily for best results.`,
                type: 'success',
              });
            },
          },
        ],
      });
    } else {
      showAlert({
        title: `Start Aligner #${nextTray}?`,
        message: `Great timing! You've worn your current aligner for the recommended ${recommendedDays} days. Ready to switch to aligner #${nextTray}?`,
        type: 'info',
        buttons: [
          { text: 'Not Yet', style: 'cancel' },
          {
            text: 'Start Now',
            onPress: () => {
              logTrayChange(nextTray, selectedFit);
              setSelectedFit(null);
              showAlert({
                title: 'New Aligner Started!',
                message: `You're now on aligner #${nextTray}. Keep up the great work!`,
                type: 'success',
              });
            },
          },
        ],
      });
    }
  };

  const fitOptions = [
    { value: 'ok', label: 'Fits Well', description: 'Snug and comfortable', icon: CheckCircle, color: Colors.success },
    { value: 'watch', label: 'Slightly Loose', description: 'Small gaps present', icon: AlertCircle, color: Colors.warning },
    { value: 'not_seated', label: 'Not Seating', description: 'Significant gaps', icon: AlertCircle, color: Colors.error },
  ] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.surface }]} edges={['top', 'left', 'right']}>
      <AlertComponent />
      <ScrollView style={[styles.scrollView, { backgroundColor: themeColors.surface }]} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Aligner Tracking</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Monitor your treatment progress</Text>
        </View>

        {/* Current Aligner Status */}
        <Card style={styles.statusCard}>
          <View style={styles.currentAlignerHeader}>
            <View style={styles.alignerBadge}>
              <Text style={styles.alignerBadgeText}>#{patient.current_tray}</Text>
            </View>
            <View style={styles.currentAlignerInfo}>
              <Text style={styles.currentAlignerTitle}>Current Aligner</Text>
              <Text style={styles.currentAlignerProgress}>
                {patient.current_tray} of {patient.total_trays} ({Math.round((patient.current_tray / patient.total_trays) * 100)}% complete)
              </Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(patient.current_tray / patient.total_trays) * 100}%` }
              ]}
            />
          </View>

          <View style={styles.timeStats}>
            <View style={styles.timeStat}>
              <Clock size={18} color={Colors.textSecondary} />
              <View>
                <Text style={styles.timeStatValue}>{daysOnCurrentTray}</Text>
                <Text style={styles.timeStatLabel}>days worn</Text>
              </View>
            </View>
            <View style={styles.timeStatDivider} />
            <View style={styles.timeStat}>
              <Calendar size={18} color={isReadyForChange ? Colors.success : Colors.primary} />
              <View>
                <Text style={[styles.timeStatValue, isReadyForChange && styles.readyValue]}>
                  {isReadyForChange ? 'Ready!' : daysLeft}
                </Text>
                <Text style={styles.timeStatLabel}>
                  {isReadyForChange ? 'to switch' : 'days left'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Start New Aligner Section */}
        <Card style={styles.newAlignerCard}>
          <View style={styles.newAlignerHeader}>
            <Play size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Ready to Switch?</Text>
          </View>

          <Text style={styles.newAlignerDescription}>
            {isLastTray
              ? "You're on your final aligner! Contact your orthodontist to discuss next steps."
              : isReadyForChange
                ? `Great timing! You're ready to move to aligner #${patient.current_tray + 1}.`
                : `First, tell us how your current aligner fits, then tap the button below to start aligner #${patient.current_tray + 1}.`
            }
          </Text>

          {!isLastTray && (
            <TouchableOpacity
              style={[
                styles.startNewButton,
                !selectedFit && styles.startNewButtonDisabled
              ]}
              onPress={handleStartNewAligner}
            >
              <Text style={styles.startNewButtonText}>
                Start Aligner #{patient.current_tray + 1}
              </Text>
              <ChevronRight size={20} color={Colors.background} />
            </TouchableOpacity>
          )}

          {!selectedFit && !isLastTray && (
            <Text style={styles.fitRequiredNote}>
              Please complete the fit check below first
            </Text>
          )}
        </Card>

        {/* Fit Check */}
        <Card style={styles.fitCard}>
          <Text style={styles.sectionTitle}>Current Aligner Fit Check</Text>
          <Text style={styles.sectionSubtitle}>
            How does your current aligner feel?
          </Text>

          <View style={styles.fitOptions}>
            {fitOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedFit === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.fitOption,
                    isSelected && { borderColor: option.color, backgroundColor: `${option.color}10` }
                  ]}
                  onPress={() => setSelectedFit(option.value)}
                >
                  <Icon
                    size={24}
                    color={isSelected ? option.color : Colors.textSecondary}
                  />
                  <View style={styles.fitOptionText}>
                    <Text style={[
                      styles.fitOptionLabel,
                      isSelected && { color: option.color, fontWeight: '600' }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.fitOptionDescription}>{option.description}</Text>
                  </View>
                  {isSelected && (
                    <CheckCircle size={20} color={option.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Photo Check-in */}
        <Card style={styles.photoCard}>
          <View style={styles.photoHeader}>
            <Camera size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Photo Check-in</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Track your smile transformation (optional)
          </Text>

          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => showAlert({
                title: 'Coming Soon',
                message: 'Photo tracking will be available in a future update.',
                type: 'info',
              })}
            >
              <Camera size={20} color={Colors.primary} />
              <Text style={styles.photoButtonText}>Front</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => showAlert({
                title: 'Coming Soon',
                message: 'Photo tracking will be available in a future update.',
                type: 'info',
              })}
            >
              <Camera size={20} color={Colors.primary} />
              <Text style={styles.photoButtonText}>Right</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => showAlert({
                title: 'Coming Soon',
                message: 'Photo tracking will be available in a future update.',
                type: 'info',
              })}
            >
              <Camera size={20} color={Colors.primary} />
              <Text style={styles.photoButtonText}>Left</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Treatment Settings */}
        <Card style={styles.treatmentSettingsCard}>
          <View style={styles.treatmentSettingsHeader}>
            <Settings size={20} color={Colors.textSecondary} />
            <Text style={styles.sectionTitle}>Treatment Settings</Text>
          </View>

          <View style={styles.treatmentInfoRow}>
            <Text style={styles.treatmentInfoLabel}>Total Aligners</Text>
            <Text style={styles.treatmentInfoValue}>{patient.total_trays}</Text>
          </View>

          <View style={styles.treatmentInfoRow}>
            <Text style={styles.treatmentInfoLabel}>Current Aligner</Text>
            <Text style={styles.treatmentInfoValue}>#{patient.current_tray}</Text>
          </View>

          {currentBout && (
            <View style={styles.treatmentInfoRow}>
              <Text style={styles.treatmentInfoLabel}>Current Bout</Text>
              <Text style={styles.treatmentInfoValue}>Bout {currentBout.bout_number}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.newBoutButton}
            onPress={handleStartNewBout}
          >
            <RefreshCw size={18} color={Colors.primary} />
            <Text style={styles.newBoutButtonText}>Start New Bout</Text>
          </TouchableOpacity>

          <Text style={styles.newBoutHelp}>
            Starting a new bout? This is for when you begin a completely new set of aligners.
          </Text>
        </Card>

        {/* Past Bouts */}
        {treatmentBouts.length > 0 && (
          <Card style={styles.boutsCard}>
            <View style={styles.boutsHeader}>
              <History size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Treatment Bouts</Text>
            </View>

            {treatmentBouts.map((bout, index) => (
              <View key={bout.id} style={styles.boutItem}>
                <View style={styles.boutLeft}>
                  <View style={[
                    styles.boutBadge,
                    bout.status === 'active' && styles.boutBadgeActive
                  ]}>
                    <Award size={16} color={bout.status === 'active' ? Colors.background : Colors.primary} />
                  </View>
                  <View style={styles.boutInfo}>
                    <Text style={styles.boutTitle}>Bout {bout.bout_number}</Text>
                    <Text style={styles.boutDetails}>
                      {bout.total_trays} aligners • Started {new Date(bout.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                    {bout.end_date && (
                      <Text style={styles.boutDetails}>
                        Completed {new Date(bout.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[
                  styles.boutStatus,
                  { backgroundColor: bout.status === 'active' ? Colors.success :
                    bout.status === 'completed' ? Colors.primary : Colors.warning }
                ]}>
                  <Text style={styles.boutStatusText}>
                    {bout.status === 'active' ? 'Active' :
                     bout.status === 'completed' ? 'Done' : 'Paused'}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Recent Changes */}
        <Card style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Aligner History</Text>
          {trayChanges.length > 0 ? (
            trayChanges.slice(0, 5).map((change) => (
              <View key={change.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <View style={styles.historyNumber}>
                    <Text style={styles.historyNumberText}>#{change.tray_number}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTray}>Aligner {change.tray_number}</Text>
                    <Text style={styles.historyDate}>
                      Started {new Date(change.date_changed).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.historyStatus,
                  { backgroundColor: change.fit_status === 'ok' || change.fit_status === 'good' ? Colors.success :
                    change.fit_status === 'watch' ? Colors.warning : Colors.error }
                ]}>
                  <Text style={styles.historyStatusText}>
                    {change.fit_status === 'ok' || change.fit_status === 'good' ? 'Good' :
                     change.fit_status === 'watch' ? 'Fair' : 'Poor'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>
                Your aligner history will appear here as you progress through your treatment.
              </Text>
            </View>
          )}
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
  statusCard: {
    marginBottom: Spacing.md,
  },
  currentAlignerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  alignerBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  alignerBadgeText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.background,
  },
  currentAlignerInfo: {
    flex: 1,
  },
  currentAlignerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  currentAlignerProgress: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  timeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  timeStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  readyValue: {
    color: Colors.success,
  },
  timeStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  newAlignerCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary + '08',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  newAlignerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  newAlignerDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  startNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  startNewButtonDisabled: {
    backgroundColor: Colors.border,
  },
  startNewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  fitRequiredNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  fitCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  fitOptions: {
    gap: Spacing.sm,
  },
  fitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  fitOptionText: {
    flex: 1,
  },
  fitOptionLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  fitOptionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  photoCard: {
    marginBottom: Spacing.md,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photoButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoButtonText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  historyCard: {
    marginBottom: Spacing.xl,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginRight: Spacing.sm,
  },
  historyNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 0,
  },
  historyNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  historyInfo: {
    flex: 1,
    minWidth: 0,
  },
  historyTray: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyStatus: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    flexShrink: 0,
  },
  historyStatusText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
  },
  // Setup screen styles
  setupCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  setupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputHelp: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  setupInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  previewCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.lg,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  previewProgress: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  previewProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  previewText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  setupButtonDisabled: {
    opacity: 0.6,
  },
  setupButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.background,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  setupInfoSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  setupInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Treatment settings styles
  treatmentSettingsCard: {
    marginBottom: Spacing.md,
  },
  treatmentSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  treatmentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  treatmentInfoLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  treatmentInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  newBoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '08',
  },
  newBoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  newBoutHelp: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  emptyHistory: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Bouts styles
  boutsCard: {
    marginBottom: Spacing.md,
  },
  boutsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  boutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  boutLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginRight: Spacing.sm,
  },
  boutBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    flexShrink: 0,
  },
  boutBadgeActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  boutInfo: {
    flex: 1,
    minWidth: 0,
  },
  boutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  boutDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  boutStatus: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    flexShrink: 0,
  },
  boutStatusText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
  },
});
