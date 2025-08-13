import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, MessageCircle, Calendar, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { ProgressRing } from '@/components/ProgressRing';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { router } from 'expo-router';

export default function HomeScreen() {
  const {
    patient,
    currentSession,
    todayWearMinutes,
    unreadMessages,
    startWearSession,
    stopWearSession,
    addWearMinutes,
  } = usePatientStore();

  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentSession) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - currentSession.startTime.getTime()) / 1000);
        setSessionTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentSession]);

  if (!patient) return null;

  const targetMinutes = patient.targetHoursPerDay * 60;
  const progress = Math.min(todayWearMinutes / targetMinutes, 1);
  const hoursWorn = Math.floor(todayWearMinutes / 60);
  const minutesWorn = todayWearMinutes % 60;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuickLog = () => {
    addWearMinutes(60); // Add 1 hour
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>{patient.name}</Text>
          </View>
          <TouchableOpacity style={styles.messageButton} onPress={() => router.push('/messages')}>
            <MessageCircle size={24} color={Colors.textSecondary} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Progress Ring */}
        <Card style={styles.progressCard}>
          <View style={styles.progressContainer}>
            <ProgressRing progress={progress} size={200} strokeWidth={12}>
              <View style={styles.progressContent}>
                <Text style={styles.hoursText}>{hoursWorn}h {minutesWorn}m</Text>
                <Text style={styles.targetText}>of {patient.targetHoursPerDay}h goal</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
            </ProgressRing>
          </View>
        </Card>

        {/* Timer Section */}
        <Card style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.timerTitle}>Wear Timer</Text>
          </View>
          
          {currentSession ? (
            <View style={styles.activeTimer}>
              <Text style={styles.sessionTime}>{formatTime(sessionTime)}</Text>
              <Text style={styles.sessionLabel}>Current session</Text>
              <Button
                title="Stop Wearing"
                onPress={stopWearSession}
                variant="outline"
                style={styles.timerButton}
              />
            </View>
          ) : (
            <View style={styles.inactiveTimer}>
              <Text style={styles.timerDescription}>Start tracking your aligner wear time</Text>
              <Button
                title="Start Wearing"
                onPress={startWearSession}
                style={styles.timerButton}
              />
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionItem} onPress={handleQuickLog}>
              <View style={styles.actionIcon}>
                <TrendingUp size={24} color={Colors.primary} />
              </View>
              <Text style={styles.actionText}>Log Hours</Text>
              <Text style={styles.actionSubtext}>Manually add time</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/tray')}>
              <View style={styles.actionIcon}>
                <Calendar size={24} color={Colors.primary} />
              </View>
              <Text style={styles.actionText}>Tray Change</Text>
              <Text style={styles.actionSubtext}>Record new tray</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Today&apos;s Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Math.round(progress * 100)}%</Text>
              <Text style={styles.summaryLabel}>Goal Progress</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>Tray {patient.currentTray}</Text>
              <Text style={styles.summaryLabel}>Current Tray</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{patient.totalTrays - patient.currentTray}</Text>
              <Text style={styles.summaryLabel}>Trays Left</Text>
            </View>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  name: {
    fontSize: 24,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  messageButton: {
    position: 'relative',
    padding: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  progressCard: {
    marginBottom: Spacing.md,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  progressContent: {
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  targetText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    width: 80,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  timerCard: {
    marginBottom: Spacing.md,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  activeTimer: {
    alignItems: 'center',
  },
  sessionTime: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  sessionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  inactiveTimer: {
    alignItems: 'center',
  },
  timerDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  timerButton: {
    minWidth: 160,
  },
  quickActions: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});