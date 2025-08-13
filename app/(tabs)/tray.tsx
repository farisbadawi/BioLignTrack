import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function TrayScreen() {
  const { patient, trayChanges, logTrayChange } = usePatientStore();
  const [selectedFit, setSelectedFit] = useState<'ok' | 'watch' | 'not_seated' | null>(null);

  if (!patient) return null;

  const currentTrayChange = trayChanges.find(change => change.trayNumber === patient.currentTray);
  const daysOnCurrentTray = currentTrayChange 
    ? Math.floor((Date.now() - new Date(currentTrayChange.dateChanged).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const recommendedDays = 14; // 2 weeks per tray
  const daysLeft = Math.max(0, recommendedDays - daysOnCurrentTray);
  const isReadyForChange = daysLeft === 0;

  const handleTrayChange = () => {
    if (!selectedFit) {
      Alert.alert('Fit Check Required', 'Please select how your current tray fits before changing.');
      return;
    }

    Alert.alert(
      'Confirm Tray Change',
      `Are you ready to move to tray ${patient.currentTray + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            logTrayChange(patient.currentTray + 1, selectedFit);
            setSelectedFit(null);
            Alert.alert('Success', 'Tray change recorded successfully!');
          },
        },
      ]
    );
  };

  const handleDelayTray = () => {
    Alert.alert(
      'Delay Tray Change',
      'This will extend your current tray by 1 day. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delay', onPress: () => Alert.alert('Delayed', 'Tray change delayed by 1 day.') },
      ]
    );
  };

  const fitOptions = [
    { value: 'ok', label: 'Fits Well', icon: CheckCircle, color: Colors.success },
    { value: 'watch', label: 'Slightly Loose', icon: AlertCircle, color: Colors.warning },
    { value: 'not_seated', label: 'Not Seating', icon: AlertCircle, color: Colors.error },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Tray Status */}
        <Card style={styles.statusCard}>
          <View style={styles.trayHeader}>
            <View>
              <Text style={styles.trayNumber}>Tray {patient.currentTray}</Text>
              <Text style={styles.trayProgress}>of {patient.totalTrays} total</Text>
            </View>
            <View style={styles.progressIndicator}>
              <Text style={styles.progressPercentage}>
                {Math.round((patient.currentTray / patient.totalTrays) * 100)}%
              </Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(patient.currentTray / patient.totalTrays) * 100}%` }
              ]} 
            />
          </View>

          <View style={styles.timeInfo}>
            <View style={styles.timeItem}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.timeText}>
                {daysOnCurrentTray} days worn
              </Text>
            </View>
            <View style={styles.timeItem}>
              <Calendar size={16} color={isReadyForChange ? Colors.success : Colors.textSecondary} />
              <Text style={[styles.timeText, isReadyForChange && styles.readyText]}>
                {isReadyForChange ? 'Ready for change' : `${daysLeft} days left`}
              </Text>
            </View>
          </View>
        </Card>

        {/* Fit Check */}
        <Card style={styles.fitCard}>
          <Text style={styles.sectionTitle}>How does your current tray fit?</Text>
          <Text style={styles.sectionSubtitle}>
            This helps us track your progress and adjust your treatment plan.
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
                  <Text style={[
                    styles.fitOptionText,
                    isSelected && { color: option.color, fontWeight: '600' }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Tray Change Actions */}
        <Card style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Tray Change</Text>
          
          {isReadyForChange ? (
            <View style={styles.readySection}>
              <View style={styles.readyHeader}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.readyTitle}>Ready for next tray!</Text>
              </View>
              <Text style={styles.readyDescription}>
                You&apos;ve worn this tray for the recommended time. Ready to move to tray {patient.currentTray + 1}?
              </Text>
              
              <View style={styles.actionButtons}>
                <Button
                  title="Change Tray"
                  onPress={handleTrayChange}
                  style={styles.changeButton}
                />
                <Button
                  title="Delay 1 Day"
                  onPress={handleDelayTray}
                  variant="outline"
                  style={styles.delayButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.notReadySection}>
              <Text style={styles.notReadyText}>
                Continue wearing your current tray for {daysLeft} more days.
              </Text>
              <Text style={styles.notReadySubtext}>
                Changing too early may affect your treatment progress.
              </Text>
            </View>
          )}
        </Card>

        {/* Photo Check-in */}
        <Card style={styles.photoCard}>
          <View style={styles.photoHeader}>
            <Camera size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Photo Check-in</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Take photos to track your progress (optional)
          </Text>
          
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={() => Alert.alert('Photo', 'Front view photo feature coming soon!')}>
              <Text style={styles.photoButtonText}>Front View</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={() => Alert.alert('Photo', 'Right side photo feature coming soon!')}>
              <Text style={styles.photoButtonText}>Right Side</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={() => Alert.alert('Photo', 'Left side photo feature coming soon!')}>
              <Text style={styles.photoButtonText}>Left Side</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent Changes */}
        <Card style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Recent Changes</Text>
          {trayChanges.slice(-3).reverse().map((change) => (
            <View key={change.id} style={styles.historyItem}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTray}>Tray {change.trayNumber}</Text>
                <Text style={styles.historyDate}>
                  {new Date(change.dateChanged).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.historyStatus,
                { backgroundColor: change.fitStatus === 'ok' ? Colors.success : 
                  change.fitStatus === 'watch' ? Colors.warning : Colors.error }
              ]}>
                <Text style={styles.historyStatusText}>
                  {change.fitStatus === 'ok' ? 'Good Fit' : 
                   change.fitStatus === 'watch' ? 'Watch' : 'Poor Fit'}
                </Text>
              </View>
            </View>
          ))}
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
    paddingTop: Spacing.md,
  },
  statusCard: {
    marginBottom: Spacing.md,
  },
  trayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  trayNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  trayProgress: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressIndicator: {
    alignItems: 'flex-end',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressLabel: {
    fontSize: 12,
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
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  readyText: {
    color: Colors.success,
    fontWeight: '600',
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
    fontSize: 16,
    color: Colors.textPrimary,
  },
  actionsCard: {
    marginBottom: Spacing.md,
  },
  readySection: {
    alignItems: 'center',
  },
  readyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  readyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  readyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  changeButton: {
    flex: 1,
  },
  delayButton: {
    flex: 1,
  },
  notReadySection: {
    alignItems: 'center',
  },
  notReadyText: {
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  notReadySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  historyCard: {
    marginBottom: Spacing.xl,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyInfo: {
    flex: 1,
  },
  historyTray: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  historyStatusText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
  },
});