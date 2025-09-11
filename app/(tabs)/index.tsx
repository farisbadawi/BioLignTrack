// This will be the doctor's dashboard when userRole === 'doctor'
// Add this content to your existing app/(tabs)/index.tsx and use role-based rendering

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MessageCircle, Calendar, TrendingUp, AlertCircle, Clock } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { router } from 'expo-router';

// Doctor Dashboard Component
export function DoctorDashboard() {
  const { 
    profile, 
    assignedPatients, 
    unreadMessages, 
    invitations 
  } = usePatientStore();

  if (!profile) return null;

  const activePatients = assignedPatients.length;
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending').length;
  
  // Calculate urgent patients (those with low compliance or overdue tray changes)
  const urgentPatients = assignedPatients.filter(patient => {
    // Mock logic - in real app, calculate from actual data
    return Math.random() > 0.8; // 20% of patients need attention
  }).length;

  const StatCard = ({ icon: Icon, title, value, subtitle, color = Colors.primary, onPress }: any) => (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Icon size={24} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </Card>
    </TouchableOpacity>
  );

  const PatientCard = ({ patient }: { patient: any }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => router.push(`/patient-detail/${patient.id}`)}
    >
      <View style={styles.patientAvatar}>
        <Text style={styles.patientInitials}>
          {patient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA'}
        </Text>
      </View>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.patientDetails}>
          Tray {patient.patientData?.current_tray || 1} of {patient.patientData?.total_trays || 24}
        </Text>
        <View style={styles.patientStatus}>
          <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.statusText}>On track</Text>
        </View>
      </View>
      <View style={styles.patientActions}>
        <TouchableOpacity style={styles.messageButton}>
          <MessageCircle size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.doctorName}>Dr. {profile.name?.replace('Dr. ', '') || profile.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/messages')}
          >
            <MessageCircle size={24} color={Colors.textSecondary} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
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

        {/* Recent Patients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Patients</Text>
            <TouchableOpacity onPress={() => router.push('/patients')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {assignedPatients.slice(0, 3).map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
          
          {assignedPatients.length === 0 && (
            <Card style={styles.emptyCard}>
              <Users size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No patients yet</Text>
              <Text style={styles.emptySubtitle}>
                Start by inviting patients to join your practice
              </Text>
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/invite')}
            >
              <View style={styles.quickActionIcon}>
                <Users size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Invite Patient</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/appointments')}
            >
              <View style={styles.quickActionIcon}>
                <Calendar size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Schedule</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/messages')}
            >
              <View style={styles.quickActionIcon}>
                <MessageCircle size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/analytics')}
            >
              <View style={styles.quickActionIcon}>
                <TrendingUp size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Schedule */}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  patientInitials: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  patientDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  patientStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  patientActions: {
    alignItems: 'center',
  },
  messageButton: {
    padding: Spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
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