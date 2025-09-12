// app/(tabs)/patients.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MessageCircle, TrendingUp, AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { router } from 'expo-router';

export default function PatientsScreen() {
  const { assignedPatients, userRole } = usePatientStore();

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

  const PatientCard = ({ patient }: { patient: any }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => console.log('Navigate to patient detail:', patient.id)}
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
          <Text style={styles.title}>My Patients</Text>
          <Text style={styles.subtitle}>
            {assignedPatients.length} active patients
          </Text>
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
            <Text style={styles.statValue}>{Math.floor(assignedPatients.length * 0.8)}</Text>
            <Text style={styles.statLabel}>On Track</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIcon}>
              <AlertCircle size={24} color={Colors.warning} />
            </View>
            <Text style={styles.statValue}>{Math.floor(assignedPatients.length * 0.2)}</Text>
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