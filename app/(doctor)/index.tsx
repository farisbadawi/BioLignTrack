// app/(doctor)/index.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users, MessageCircle, Calendar, AlertCircle, Clock,
} from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

// Doctor Dashboard Component
export default function DoctorDashboard() {
  const {
    profile,
    assignedPatients,
    invitations
  } = usePatientStore();
  const { colors } = useTheme();

  if (!profile) return null;

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  const activePatients = assignedPatients.length;
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending').length;
  const unreadMessages = 0; // TODO: Implement messaging

  const urgentPatients = assignedPatients.filter(patient => {
    if (!patient.startDate) return false;
    const daysSinceStart = Math.floor((Date.now() - new Date(patient.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const expectedTray = Math.min(Math.floor(daysSinceStart / 14) + 1, patient.totalTrays || 24);
    return patient.currentTray < expectedTray - 1;
  }).length;

  const StatCard = ({ icon: Icon, title, value, subtitle, color = colors.primary, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.statCardWrapper}>
      <Card style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Icon size={24} color={color} />
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
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
            <Text style={[styles.doctorName, { color: colors.textPrimary }]}>Dr. {profile.name?.replace('Dr. ', '') || profile.name}</Text>
            <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 8 }} />
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(doctor)/messages')}
          >
            <MessageCircle size={24} color={colors.textSecondary} />
            {unreadMessages > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={[styles.badgeText, { color: colors.background }]}>{unreadMessages}</Text>
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
            color={colors.primary}
            onPress={() => router.push('/(doctor)/messages')}
          />

          <StatCard
            icon={AlertCircle}
            title="Need Attention"
            value={urgentPatients}
            subtitle="patients"
            color={colors.warning}
            onPress={() => router.push('/patients?filter=urgent')}
          />

          <StatCard
            icon={Calendar}
            title="Invitations"
            value={pendingInvitations}
            subtitle="pending"
            color={colors.success}
            onPress={() => router.push('/invite')}
          />
        </View>

        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appointments</Text>
          </View>
          <Text style={[styles.scheduleSubtitle, { color: colors.textSecondary }]}>
            View and manage your Calendly bookings
          </Text>
          <TouchableOpacity
            style={[styles.viewBookingsButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/view-bookings')}
          >
            <Calendar size={18} color={colors.background} />
            <Text style={[styles.viewBookingsText, { color: colors.background }]}>View Bookings</Text>
          </TouchableOpacity>
        </Card>
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
