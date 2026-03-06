import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, Clock, User, RefreshCw, Search, X, MessageCircle } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

// Patient List Component for Doctors
function PatientListView() {
  const { assignedPatients, loadAssignedPatients } = usePatientStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useTheme();

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssignedPatients();
    setRefreshing(false);
  };

  // Filter patients by search
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return assignedPatients;
    const query = searchQuery.toLowerCase();
    return assignedPatients.filter(patient =>
      patient.name?.toLowerCase().includes(query)
    );
  }, [assignedPatients, searchQuery]);

  const PatientChatItem = ({ patient }: { patient: any }) => {
    return (
      <TouchableOpacity
        style={[styles.patientChatItem, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => {
          Alert.alert(
            'Coming Soon',
            'Messaging functionality will be available in a future update.',
            [{ text: 'OK' }]
          );
        }}
      >
        <View style={[styles.patientAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.patientInitials, { color: colors.background }]}>
            {patient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA'}
          </Text>
        </View>

        <View style={styles.patientChatInfo}>
          <View style={styles.patientChatHeader}>
            <Text style={[styles.patientName, { color: colors.textPrimary }]}>{patient.name}</Text>
          </View>

          <View style={styles.patientChatPreview}>
            <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
              Tap to message
            </Text>
          </View>

          <View style={styles.patientStatus}>
            <Text style={[styles.patientTrayInfo, { color: colors.textSecondary }]}>
              Tray {patient.currentTray || 1} of {patient.totalTrays || 24}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Messages</Text>
            <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {assignedPatients.length} patients
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

      {/* Coming Soon Notice */}
      <Card style={styles.comingSoonCard}>
        <MessageCircle size={24} color={colors.primary} />
        <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
          In-app messaging is coming soon. For now, contact patients via email or phone.
        </Text>
      </Card>

      <View style={styles.patientsList}>
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
                <User size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No patients yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Invite patients to start messaging
                </Text>
              </>
            )}
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <PatientChatItem key={patient.id} patient={patient} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// Direct Chat Component for Patients
function DirectChatView() {
  const { patient, assignedDoctor } = usePatientStore();
  const { colors } = useTheme();

  if (!assignedDoctor) {
    return (
      <View style={[styles.noDoctorContainer, { backgroundColor: colors.surface }]}>
        <User size={64} color={colors.textSecondary} />
        <Text style={[styles.noDoctorTitle, { color: colors.textPrimary }]}>No Doctor Linked</Text>
        <Text style={[styles.noDoctorSubtitle, { color: colors.textSecondary }]}>
          Enter your doctor's code in Profile settings to start messaging
        </Text>
        <TouchableOpacity
          style={[styles.goToProfileButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={[styles.goToProfileButtonText, { color: colors.background }]}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get target hours (dailyWearTarget is in minutes)
  const targetHoursPerDay = (patient?.dailyWearTarget || 1320) / 60;

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Messages</Text>
        <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Contact your orthodontist
        </Text>
      </View>

      {/* Doctor Info Card */}
      <Card style={styles.doctorCard}>
        <View style={[styles.doctorAvatar, { backgroundColor: colors.primary }]}>
          <User size={32} color={colors.background} />
        </View>
        <View style={styles.doctorInfo}>
          <Text style={[styles.doctorName, { color: colors.textPrimary }]}>
            {assignedDoctor.name || 'Your Orthodontist'}
          </Text>
          <Text style={[styles.doctorPractice, { color: colors.textSecondary }]}>
            {assignedDoctor.practiceName || 'Orthodontic Practice'}
          </Text>
        </View>
      </Card>

      {/* Context Card */}
      <Card style={styles.contextCard}>
        <Text style={[styles.contextTitle, { color: colors.textPrimary }]}>Your Treatment</Text>
        <View style={styles.contextInfo}>
          <Text style={[styles.contextItem, { color: colors.textSecondary, backgroundColor: colors.background }]}>
            Tray {patient?.currentTray || 1} of {patient?.totalTrays || '?'}
          </Text>
          <Text style={[styles.contextItem, { color: colors.textSecondary, backgroundColor: colors.background }]}>
            {targetHoursPerDay}h daily goal
          </Text>
        </View>
      </Card>

      {/* Coming Soon Message */}
      <Card style={styles.comingSoonCardLarge}>
        <MessageCircle size={48} color={colors.primary} />
        <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>
          Messaging Coming Soon
        </Text>
        <Text style={[styles.comingSoonDescription, { color: colors.textSecondary }]}>
          In-app messaging will be available in a future update. For now, please contact your doctor using the information below.
        </Text>
      </Card>

      {/* Contact Options */}
      <Card style={styles.contactCard}>
        <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>Contact Options</Text>

        {assignedDoctor.practicePhone && (
          <View style={styles.contactRow}>
            <AlertCircle size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              Phone: {assignedDoctor.practicePhone}
            </Text>
          </View>
        )}

        {assignedDoctor.email && (
          <View style={styles.contactRow}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              Email: {assignedDoctor.email}
            </Text>
          </View>
        )}

        {!assignedDoctor.practicePhone && !assignedDoctor.email && (
          <Text style={[styles.noContactInfo, { color: colors.textSecondary }]}>
            Contact information not available. Please check with your orthodontist.
          </Text>
        )}
      </Card>

      {/* Quick Issue Templates */}
      <Card style={styles.issueCard}>
        <Text style={[styles.issueTitle, { color: colors.textPrimary }]}>Common Concerns</Text>
        <Text style={[styles.issueSubtitle, { color: colors.textSecondary }]}>
          If you're experiencing any of these issues, please contact your doctor:
        </Text>

        <View style={styles.issueList}>
          <View style={styles.issueItem}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={[styles.issueText, { color: colors.textSecondary }]}>Trouble with tray fit</Text>
          </View>
          <View style={styles.issueItem}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={[styles.issueText, { color: colors.textSecondary }]}>Lost or broken aligner</Text>
          </View>
          <View style={styles.issueItem}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={[styles.issueText, { color: colors.textSecondary }]}>Experiencing discomfort</Text>
          </View>
        </View>
      </Card>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

// Main Messages Screen Component
export default function MessagesScreen() {
  const { userType } = usePatientStore();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      {userType === 'standalone_doctor' ? <PatientListView /> : <DirectChatView />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
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
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  comingSoonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  patientsList: {
    marginBottom: Spacing.xl,
  },
  patientChatItem: {
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
  patientChatInfo: {
    flex: 1,
  },
  patientChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  patientChatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
  },
  patientStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientTrayInfo: {
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  },
  noDoctorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  noDoctorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  noDoctorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  goToProfileButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  goToProfileButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  doctorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  doctorPractice: {
    fontSize: 14,
  },
  contextCard: {
    marginBottom: Spacing.md,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  contextInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contextItem: {
    fontSize: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  comingSoonCardLarge: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  comingSoonDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  contactCard: {
    marginBottom: Spacing.md,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  contactText: {
    fontSize: 14,
  },
  noContactInfo: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  issueCard: {
    marginBottom: Spacing.md,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  issueSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  issueList: {
    gap: Spacing.sm,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  issueText: {
    fontSize: 14,
  },
});
