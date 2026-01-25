// app/(tabs)/index.tsx - COMPLETE REPLACEMENT
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, MessageCircle, Calendar, TrendingUp, AlertCircle, Clock,
  Activity, Target, Award, Timer, Package, ChevronRight 
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

// Patient Dashboard Component
function PatientDashboard() {
  const {
    patient,
    profile,
    todayWearMinutes,
    unreadMessages,
    currentSession,
    getWeeklyProgress,
    startWearSession,
    stopWearSession
  } = usePatientStore();
  const { colors: themeColors } = useTheme();

  if (!patient || !profile) return null;

  const weeklyData = getWeeklyProgress();
  const todayHours = todayWearMinutes / 60;
  const targetHours = patient.target_hours_per_day;
  const progress = Math.min(todayHours / targetHours, 1);
  const progressPercentage = Math.round((patient.current_tray / patient.total_trays) * 100);

  const QuickStatCard = ({ icon: Icon, title, value, subtitle, color = Colors.primary, onPress }: any) => (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Icon size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.surface }]}>
      <ScrollView style={[styles.scrollView, { backgroundColor: themeColors.surface }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: themeColors.textSecondary }]}>Good morning,</Text>
            <Text style={[styles.patientName, { color: themeColors.textPrimary }]}>{patient.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/messages')}
          >
            <MessageCircle size={24} color={themeColors.textSecondary} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Today's Progress Ring */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Wear Time</Text>
            {currentSession && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Active</Text>
              </View>
            )}
          </View>
          
          <View style={styles.progressRingContainer}>
            <ProgressRing progress={progress} size={140} strokeWidth={12}>
              <Text style={styles.progressValue}>
                {todayHours.toFixed(1)}h
              </Text>
              <Text style={styles.progressTarget}>
                of {targetHours}h goal
              </Text>
            </ProgressRing>
          </View>
          
          <View style={styles.progressActions}>
            {currentSession ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.stopButton]}
                onPress={stopWearSession}
              >
                <Text style={styles.stopButtonText}>Stop Session</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={startWearSession}
              >
                <Text style={styles.startButtonText}>Start Wearing</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <QuickStatCard
            icon={Package}
            title="Current Tray"
            value={`${patient.current_tray}/${patient.total_trays}`}
            subtitle={`${progressPercentage}% complete`}
            onPress={() => router.push('/tray')}
          />
          
          <QuickStatCard
            icon={Target}
            title="Weekly Avg"
            value={`${(weeklyData.reduce((sum, day) => sum + day.hours, 0) / 7).toFixed(1)}h`}
            subtitle="this week"
            color={Colors.success}
            onPress={() => router.push('/progress')}
          />
        </View>

        {/* Current Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Activity size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Current Status</Text>
          </View>
          
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Treatment Progress</Text>
              <View style={styles.statusBar}>
                <View style={[styles.statusFill, { width: `${progressPercentage}%` }]} />
              </View>
              <Text style={styles.statusText}>{progressPercentage}% Complete</Text>
            </View>
            
            <View style={styles.statusDivider} />
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Today's Compliance</Text>
              <Text style={[
                styles.statusValue,
                { color: progress >= 0.9 ? Colors.success : progress >= 0.7 ? Colors.warning : Colors.error }
              ]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/tray')}
            >
              <Package size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>Check Tray</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/messages')}
            >
              <MessageCircle size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>Message Doctor</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/appointments')}
            >
              <Calendar size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>Appointments</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/progress')}
            >
              <TrendingUp size={24} color={Colors.primary} />
              <Text style={styles.quickActionText}>View Progress</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>
          
          <View style={styles.weeklyChart}>
            {weeklyData.map((day, index) => {
              const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
              const height = Math.max((day.hours / targetHours) * 60, 4);
              const today = new Date().toISOString().split('T')[0];
              const isToday = day.date === today;
              
              return (
                <View key={day.date} style={styles.chartDay}>
                  <View style={styles.chartBar}>
                    <View 
                      style={[
                        styles.chartBarFill, 
                        { 
                          height: height,
                          backgroundColor: day.hours >= targetHours * 0.9 ? Colors.success :
                                         day.hours >= targetHours * 0.7 ? Colors.warning : Colors.error
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.chartDayText, isToday && styles.chartTodayText]}>
                    {dayName}
                  </Text>
                  <Text style={styles.chartHoursText}>
                    {day.hours.toFixed(1)}h
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// Doctor Dashboard Component (from your existing code)
function DoctorDashboard() {
  const {
    profile,
    assignedPatients,
    unreadMessages,
    invitations
  } = usePatientStore();
  const { colors: themeColors } = useTheme();

  if (!profile) return null;

  const activePatients = assignedPatients.length;
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending').length;

  // Calculate urgent patients based on actual compliance data
  const urgentPatients = assignedPatients.filter(patient => {
    // A patient needs attention if they have low compliance or are behind on trays
    const patientData = patient.patientData;
    if (!patientData) return false;
    // Mark as urgent if current tray is significantly behind expected progress
    const daysSinceStart = patientData.treatment_start_date
      ? Math.floor((Date.now() - new Date(patientData.treatment_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const expectedTray = Math.min(Math.floor(daysSinceStart / 14) + 1, patientData.total_trays);
    return patientData.current_tray < expectedTray - 1;
  }).length;

  const StatCard = ({ icon: Icon, title, value, subtitle, color = Colors.primary, onPress }: any) => (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Icon size={24} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.surface }]}>
      <ScrollView style={[styles.scrollView, { backgroundColor: themeColors.surface }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: themeColors.textSecondary }]}>Good morning,</Text>
            <Text style={[styles.doctorName, { color: themeColors.textPrimary }]}>Dr. {profile.name?.replace('Dr. ', '') || profile.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/messages')}
          >
            <MessageCircle size={24} color={themeColors.textSecondary} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={Users}
            title="Active Patients"
            value={activePatients}
            subtitle="under care"
            onPress={() => router.push('/patients')}
          />
          
          <StatCard
            icon={MessageCircle}
            title="Messages"
            value={unreadMessages}
            subtitle="unread"
            color={Colors.primary}
            onPress={() => router.push('/messages')}
          />
          
          <StatCard
            icon={AlertCircle}
            title="Need Attention"
            value={urgentPatients}
            subtitle="patients"
            color={Colors.warning}
            onPress={() => router.push('/patients?filter=urgent')}
          />
          
          <StatCard
            icon={Calendar}
            title="Invitations"
            value={pendingInvitations}
            subtitle="pending"
            color={Colors.success}
            onPress={() => router.push('/invite')}
          />
        </View>

        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
          </View>
          <Text style={styles.scheduleSubtitle}>No appointments scheduled for today</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// Main Component with Role Detection
export default function HomeScreen() {
  const { userRole, loading, profile } = usePatientStore();

  // Show loading while determining role
  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Return appropriate dashboard based on user role
  if (userRole === 'doctor') {
    return <DoctorDashboard />;
  }
  
  // Default to patient dashboard
  return <PatientDashboard />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
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
  patientName: {
    fontSize: 24,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  doctorName: {
    fontSize: 24,
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
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
    backgroundColor: Colors.success,
  },
  liveText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  progressRingContainer: {
    marginBottom: Spacing.md,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressTarget: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressActions: {
    width: '100%',
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: Colors.primary,
  },
  stopButton: {
    backgroundColor: Colors.error,
  },
  startButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  stopButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
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
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  statusBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  statusFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.md,
  },
  quickActions: {
    gap: Spacing.xs,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
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
    backgroundColor: Colors.surface,
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
    color: Colors.textSecondary,
  },
  chartTodayText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  chartHoursText: {
    fontSize: 10,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
  },
});