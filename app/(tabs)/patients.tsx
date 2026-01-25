// app/(tabs)/patients.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MessageCircle, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function PatientsScreen() {
  const { assignedPatients, userRole, loadAssignedPatients, profile } = usePatientStore();
  const [refreshing, setRefreshing] = useState(false);

  // Set up real-time subscription for new patients
  useEffect(() => {
    if (!profile || userRole !== 'doctor') return;

    const subscription = supabase
      .channel('patients-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'doctor_patients',
        filter: `doctor_id=eq.${profile.id}`
      }, () => {
        console.log('Patient list changed!');
        loadAssignedPatients();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, userRole, loadAssignedPatients]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssignedPatients();
    setRefreshing(false);
  };

  // Only show this screen for doctors
  if (userRole !== 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access denied. This page is for doctors only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const PatientCard = ({ patient }: { patient: any }) => {
    const patientData = patient.patientData;
    const daysSinceStart = patientData?.treatment_start_date
      ? Math.floor((Date.now() - new Date(patientData.treatment_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const expectedTray = patientData
      ? Math.min(Math.floor(daysSinceStart / 14) + 1, patientData.total_trays || 24)
      : 1;
    const currentTray = patientData?.current_tray || 1;
    const isOnTrack = currentTray >= expectedTray - 1;
    const isBehind = currentTray < expectedTray - 1;

    const getStatus = () => {
      if (isBehind) return { text: 'Needs Attention', color: Colors.warning };
      if (isOnTrack && currentTray >= expectedTray) return { text: 'On Track', color: Colors.success };
      return { text: 'On Track', color: Colors.success };
    };

    const status = getStatus();

    return (
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => router.push(`/patient/${patient.id}`)}
      >
        <View style={styles.patientAvatar}>
          <Text style={styles.patientInitials}>
            {patient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA'}
          </Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientDetails}>
            Tray {currentTray} of {patientData?.total_trays || 24}
          </Text>
          <View style={styles.patientStatus}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        </View>
        <View style={styles.patientActions}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/chat/${patient.id}`);
            }}
          >
            <MessageCircle size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>My Patients</Text>
              <Text style={styles.subtitle}>
                {assignedPatients.length} active patients
              </Text>
            </View>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              {refreshing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <RefreshCw size={24} color={Colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statIcon}>
              <Users size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{assignedPatients.length}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp size={24} color={Colors.success} />
            </View>
            <Text style={styles.statValue}>
              {assignedPatients.filter(p => {
                const patientData = p.patientData;
                if (!patientData) return true;
                const daysSinceStart = patientData.treatment_start_date
                  ? Math.floor((Date.now() - new Date(patientData.treatment_start_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const expectedTray = Math.min(Math.floor(daysSinceStart / 14) + 1, patientData.total_trays || 24);
                return patientData.current_tray >= expectedTray - 1;
              }).length}
            </Text>
            <Text style={styles.statLabel}>On Track</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIcon}>
              <AlertCircle size={24} color={Colors.warning} />
            </View>
            <Text style={styles.statValue}>
              {assignedPatients.filter(p => {
                const patientData = p.patientData;
                if (!patientData) return false;
                const daysSinceStart = patientData.treatment_start_date
                  ? Math.floor((Date.now() - new Date(patientData.treatment_start_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const expectedTray = Math.min(Math.floor(daysSinceStart / 14) + 1, patientData.total_trays || 24);
                return patientData.current_tray < expectedTray - 1;
              }).length}
            </Text>
            <Text style={styles.statLabel}>Need Attention</Text>
          </Card>
        </View>

        {/* Patients List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Patients</Text>
          
          {assignedPatients.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Users size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No patients yet</Text>
              <Text style={styles.emptySubtitle}>
                Start by inviting patients to join your practice
              </Text>
              <TouchableOpacity 
                style={styles.inviteButton}
                onPress={() => router.push(`/invite`)}
              >
                <Text style={styles.inviteButtonText}>Invite Patients</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            assignedPatients.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))
          )}
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refreshButton: {
    padding: Spacing.sm,
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
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.lg,
  },
  inviteButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  inviteButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});