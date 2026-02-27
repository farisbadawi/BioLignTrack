// app/(tabs)/patients.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MessageCircle, TrendingUp, AlertCircle, RefreshCw, Search, X } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

export default function PatientsScreen() {
  const { assignedPatients, userRole, loadAssignedPatients, profile } = usePatientStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useTheme();

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
        loadAssignedPatients();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, userRole, loadAssignedPatients]);

  // Filter patients by search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return assignedPatients;
    const query = searchQuery.toLowerCase();
    return assignedPatients.filter(patient =>
      patient.name?.toLowerCase().includes(query)
    );
  }, [assignedPatients, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssignedPatients();
    setRefreshing(false);
  };

  // Only show this screen for doctors
  if (userRole !== 'doctor') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>Access denied. This page is for doctors only.</Text>
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
      if (isBehind) return { text: 'Needs Attention', color: colors.warning };
      return { text: 'On Track', color: colors.success };
    };

    const status = getStatus();

    return (
      <TouchableOpacity
        style={[styles.patientCard, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => router.push(`/patient/${patient.id}`)}
      >
        <View style={[styles.patientAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.patientInitials, { color: colors.background }]}>
            {patient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA'}
          </Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={[styles.patientName, { color: colors.textPrimary }]}>{patient.name}</Text>
          <Text style={[styles.patientDetails, { color: colors.textSecondary }]}>
            Tray {currentTray} of {patientData?.total_trays || 24}
          </Text>
          <View style={styles.patientStatus}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>{status.text}</Text>
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
            <MessageCircle size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>My Patients</Text>
              <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {assignedPatients.length} active patients
              </Text>
            </View>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search patients..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Users size={24} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{assignedPatients.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Patients</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <TrendingUp size={24} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
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
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>On Track</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <AlertCircle size={24} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
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
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Need Attention</Text>
          </Card>
        </View>

        {/* Patients List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {searchQuery ? `Results (${filteredPatients.length})` : 'All Patients'}
          </Text>

          {filteredPatients.length === 0 ? (
            <Card style={styles.emptyCard}>
              {searchQuery ? (
                <>
                  <Search size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No results found</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    No patients match "{searchQuery}"
                  </Text>
                </>
              ) : (
                <>
                  <Users size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No patients yet</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Start by inviting patients to join your practice
                  </Text>
                  <TouchableOpacity
                    style={[styles.inviteButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/invite`)}
                  >
                    <Text style={[styles.inviteButtonText, { color: colors.background }]}>Invite Patients</Text>
                  </TouchableOpacity>
                </>
              )}
            </Card>
          ) : (
            filteredPatients.map((patient) => (
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: 16,
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
  },
  subtitle: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  patientInitials: {
    fontSize: 16,
    fontWeight: '600',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  patientDetails: {
    fontSize: 14,
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
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  inviteButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
