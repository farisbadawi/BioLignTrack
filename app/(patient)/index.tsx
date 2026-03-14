// app/(patient)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MessageCircle, Calendar, TrendingUp, AlertCircle, Clock,
  Activity, Target, Award, Timer, Package, ChevronRight, Edit3, Flame
} from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { useChatStore } from '@/stores/chat-store';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { LogHoursModal } from '@/components/LogHoursModal';
import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

// Patient Dashboard Component
export default function PatientDashboard() {
  const {
    patient,
    profile,
    userType,
    todayWearMinutes,
    todayWearSeconds,
    currentSession,
    getWeeklyProgress,
    startWearSession,
    stopWearSession,
    assignedDoctor,
    trayChanges,
    dailyLogs,
    hasTreatment
  } = usePatientStore();
  const unreadMessages = useChatStore((s) => s.totalUnread);
  const { colors } = useTheme();
  const [showLogHoursModal, setShowLogHoursModal] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Live timer effect - updates every second when session is active
  useEffect(() => {
    if (!currentSession?.startTime) {
      setSessionSeconds(0);
      return;
    }

    // Calculate elapsed time for current session
    const calculateElapsed = () => {
      const now = new Date().getTime();
      const start = new Date(currentSession.startTime).getTime();
      return Math.floor((now - start) / 1000);
    };

    setSessionSeconds(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setSessionSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession?.startTime]);

  // Format seconds as HH:MM:SS
  const formatLiveTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!patient || !profile) return null;

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  // Check if treatment has started (linked via PMS with active treatment, or standalone with doctor)
  const treatmentStarted = (userType === 'linked' && hasTreatment) || (!!assignedDoctor && !!patient.startDate);

  const weeklyData = getWeeklyProgress();
  const targetHours = (patient.dailyWearTarget || 1320) / 60; // Convert minutes to hours

  // Calculate total today's time including current session
  // todayWearSeconds comes from database, sessionSeconds is current active session
  const displayTotalSeconds = (todayWearSeconds || 0) + sessionSeconds;
  const totalTodayHours = displayTotalSeconds / 3600;
  const progress = Math.min(totalTodayHours / targetHours, 1);

  // Calculate qualifying days worn (days with at least 50% of target wear time)
  const currentTrayChange = trayChanges.find(change => change.toTray === patient.currentTray);
  const trayStartDate = currentTrayChange ? new Date(currentTrayChange.changeDate).toISOString().split('T')[0] : null;
  const targetSeconds = (patient.dailyWearTarget || 1320) * 60; // dailyWearTarget is in minutes
  const minimumSecondsForDay = targetSeconds * 0.5; // 50% of target = ~11 hours
  const recommendedDays = 14;

  // Helper to get seconds from log (uses wearSeconds if available, otherwise wearMinutes * 60)
  const getLogSeconds = (log: any) => {
    if (log.wearSeconds != null) return log.wearSeconds;
    return (log.wearMinutes || 0) * 60;
  };

  const qualifyingDaysWorn = trayStartDate
    ? dailyLogs.filter(log => {
        if (log.date < trayStartDate) return false;
        return getLogSeconds(log) >= minimumSecondsForDay;
      }).length
    : 0;

  // Calculate streak - check each CALENDAR day going backwards from yesterday
  // (today isn't over yet, so we start from yesterday)
  let currentStreak = 0;
  const today = new Date();
  const checkDate = new Date(today);
  checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const log = dailyLogs.find(l => l.date === dateStr);

    if (log && getLogSeconds(log) >= minimumSecondsForDay) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1); // Go back one more day
    } else {
      break; // No qualifying log for this day - streak ends
    }
  }

  // Calculate incremental progress based on completed aligners + qualifying days on current
  const completedAligners = patient.currentTray - 1;
  const currentAlignerProgress = Math.min(qualifyingDaysWorn / recommendedDays, 1);
  const progressPercentage = Math.round(((completedAligners + currentAlignerProgress) / patient.totalTrays) * 100);

  // Calculate weekly average - based on days since first log (not always 7)
  const sortedLogs = [...dailyLogs].sort((a, b) => a.date.localeCompare(b.date));
  const firstLogDate = sortedLogs.length > 0 ? sortedLogs[0].date : null;
  const todayStr = today.toISOString().split('T')[0];

  let weeklyAverage = 0;
  if (firstLogDate) {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // -6 to include today = 7 days
    const weekStartDate = firstLogDate > sevenDaysAgo.toISOString().split('T')[0] ? firstLogDate : sevenDaysAgo.toISOString().split('T')[0];
    const weekStartDateObj = new Date(weekStartDate);
    const daysInPeriod = Math.max(1, Math.floor((today.getTime() - weekStartDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const weeklyLogs = dailyLogs.filter(log => log.date >= weekStartDate && log.date <= todayStr);
    const weeklyTotalSeconds = weeklyLogs.reduce((sum, log) => sum + getLogSeconds(log), 0);
    weeklyAverage = weeklyTotalSeconds / daysInPeriod / 3600;
  }

  const QuickStatCard = ({ icon: Icon, title, value, subtitle, color = colors.primary, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.statCardWrapper}>
      <Card style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Icon size={20} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.statSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
            <Text style={[styles.patientName, { color: colors.textPrimary }]}>{patient.name}</Text>
            <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 8 }} />
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/messages')}
          >
            <MessageCircle size={24} color={colors.textSecondary} />
            {unreadMessages > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={[styles.badgeText, { color: colors.background }]}>{unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Treatment Not Started Banner */}
        {!treatmentStarted && (
          userType === 'linked' && !hasTreatment ? (
            <View
              style={[styles.treatmentBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
            >
              <Clock size={20} color={colors.primary} />
              <View style={styles.treatmentBannerText}>
                <Text style={[styles.treatmentBannerTitle, { color: colors.textPrimary }]}>
                  Waiting for Treatment Plan
                </Text>
                <Text style={[styles.treatmentBannerSubtitle, { color: colors.textSecondary }]}>
                  Your doctor hasn't set up your treatment yet. Once they do, you'll be able to track your aligners here.
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/(patient)/profile')}
              style={[styles.treatmentBanner, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}
            >
              <AlertCircle size={20} color={colors.warning} />
              <View style={styles.treatmentBannerText}>
                <Text style={[styles.treatmentBannerTitle, { color: colors.textPrimary }]}>
                  Link to Your Doctor
                </Text>
                <Text style={[styles.treatmentBannerSubtitle, { color: colors.textSecondary }]}>
                  Enter your doctor's code in Profile to start tracking compliance
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )
        )}

        {hasTreatment ? (<>
        {/* Today's Progress Ring */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>Wear Tracker</Text>
            {currentSession && (
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveText, { color: colors.success }]}>Active</Text>
              </View>
            )}
          </View>

          <View style={styles.progressRingContainer}>
            <ProgressRing progress={progress} size={140} strokeWidth={12}>
              {currentSession ? (
                <>
                  <Text style={[styles.sessionTimerLabel, { color: colors.textSecondary }]}>Session</Text>
                  <Text style={[styles.sessionTimer, { color: colors.primary }]}>
                    {formatLiveTime(sessionSeconds)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.notWearingText, { color: colors.textSecondary }]}>
                  Not wearing
                </Text>
              )}
            </ProgressRing>
          </View>

          <View style={styles.todayTotalContainer}>
            <Text style={[styles.todayTotalLabel, { color: colors.textSecondary }]}>Today's total</Text>
            <Text style={[styles.todayTotalValue, { color: colors.textPrimary }]}>
              {formatLiveTime(displayTotalSeconds)}
            </Text>
            <Text style={[styles.todayTotalGoal, { color: colors.textSecondary }]}>
              of {targetHours}h goal
            </Text>
          </View>

          <View style={styles.progressActions}>
            {currentSession ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={stopWearSession}
              >
                <Text style={[styles.stopButtonText, { color: colors.background }]}>Stop Session</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={startWearSession}
              >
                <Text style={[styles.startButtonText, { color: colors.background }]}>Start Wearing</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.logHoursButton, { borderColor: colors.primary }]}
              onPress={() => setShowLogHoursModal(true)}
            >
              <Edit3 size={16} color={colors.primary} />
              <Text style={[styles.logHoursText, { color: colors.primary }]}>Log Hours</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Log Hours Modal */}
        <LogHoursModal
          visible={showLogHoursModal}
          onClose={() => setShowLogHoursModal(false)}
        />

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <QuickStatCard
            icon={Package}
            title="Current Tray"
            value={`${patient.currentTray}/${patient.totalTrays}`}
            subtitle={`${progressPercentage}% complete`}
            onPress={() => router.push('/tray')}
          />

          <QuickStatCard
            icon={Target}
            title="7-Day Avg"
            value={`${weeklyAverage.toFixed(1)}h`}
            subtitle="daily hours"
            color={colors.success}
            onPress={() => router.push('/progress')}
          />

          <QuickStatCard
            icon={Flame}
            title="Streak"
            value={`${currentStreak}`}
            subtitle="days"
            color={currentStreak > 0 ? colors.warning : colors.textSecondary}
            onPress={() => router.push('/progress')}
          />
        </View>

        {/* Current Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Activity size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Current Status</Text>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={[styles.statusLabel, { color: colors.textPrimary }]}>Treatment Progress</Text>
              <View style={[styles.statusBar, { backgroundColor: colors.border }]}>
                <View style={[styles.statusFill, { width: `${progressPercentage}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>{progressPercentage}% Complete</Text>
            </View>

            <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statusItem}>
              <Text style={[styles.statusLabel, { color: colors.textPrimary }]}>Today's Compliance</Text>
              <Text style={[
                styles.statusValue,
                { color: progress >= 0.9 ? colors.success : progress >= 0.7 ? colors.warning : colors.error }
              ]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={[styles.section, { marginTop: Spacing.xl }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: Spacing.md }]}>Quick Actions</Text>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => router.push('/tray')}
            >
              <Package size={24} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Check Tray</Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => router.push('/messages')}
            >
              <MessageCircle size={24} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Message Doctor</Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => router.push('/book-appointment')}
            >
              <Calendar size={24} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Book Appointment</Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => router.push('/progress')}
            >
              <TrendingUp size={24} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>View Progress</Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>This Week</Text>
          </View>

          <View style={styles.weeklyChart}>
            {weeklyData.map((day, index) => {
              const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
              const height = Math.max((day.hours / targetHours) * 60, 4);
              const today = new Date().toISOString().split('T')[0];
              const isToday = day.date === today;

              return (
                <View key={day.date} style={styles.chartDay}>
                  <View style={[styles.chartBar, { backgroundColor: colors.surface }]}>
                    <View
                      style={[
                        styles.chartBarFill,
                        {
                          height: height,
                          backgroundColor: day.hours >= targetHours * 0.9 ? colors.success :
                                         day.hours >= targetHours * 0.7 ? colors.warning : colors.error
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartDayText, { color: isToday ? colors.primary : colors.textSecondary }, isToday && styles.chartTodayText]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.chartHoursText, { color: colors.textSecondary }]}>
                    {day.hours.toFixed(1)}h
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
        </>) : (
          <Card style={styles.statusCard}>
            <View style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
              <Clock size={48} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: Spacing.md }]}>
                No Treatment Plan Yet
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, fontSize: 14 }}>
                Your doctor will set up your aligner treatment plan. Once active, you'll see your wear tracker, tray progress, and compliance stats here.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
    fontWeight: '400',
  },
  patientName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  treatmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  treatmentBannerText: {
    flex: 1,
  },
  treatmentBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  treatmentBannerSubtitle: {
    fontSize: 12,
  },
  progressCard: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressRingContainer: {
    marginBottom: Spacing.md,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressValueLive: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sessionTimerLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  sessionTimer: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  notWearingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  todayTotalContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  todayTotalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  todayTotalValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  todayTotalGoal: {
    fontSize: 12,
    marginTop: 2,
  },
  progressTarget: {
    fontSize: 12,
    marginTop: 2,
  },
  progressActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logHoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  logHoursText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCardWrapper: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  statusCard: {
    marginBottom: Spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusGrid: {
    gap: Spacing.md,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  statusBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  statusFill: {
    height: '100%',
  },
  statusText: {
    fontSize: 12,
  },
  statusDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  quickActions: {
    gap: Spacing.xs,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  chartDay: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chartBar: {
    width: 20,
    height: 60,
    borderRadius: 2,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 2,
    minHeight: 4,
  },
  chartDayText: {
    fontSize: 12,
  },
  chartTodayText: {
    fontWeight: '600',
  },
  chartHoursText: {
    fontSize: 10,
  },
  scheduleCard: {
    marginBottom: Spacing.xl,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  scheduleSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  viewBookingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  viewBookingsText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
