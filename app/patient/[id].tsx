// app/patient/[id].tsx - Patient Detail Screen for Doctors
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  MessageCircle,
  Package,
  Clock,
  TrendingUp,
  Calendar,
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { router, useLocalSearchParams } from 'expo-router';
import { standaloneDoctorApi } from '@/lib/api';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userType, assignedPatients } = usePatientStore();

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, [id]);

  const loadPatientData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // First try to get detailed data from API
      const response = await standaloneDoctorApi.getPatient(parseInt(id));
      if (response.data) {
        setPatient(response.data);
      } else {
        // Fallback to assigned patients list
        const foundPatient = assignedPatients.find(p => String(p.id) === id);
        setPatient(foundPatient || null);
      }
    } catch (error) {
      // Fallback to assigned patients list
      const foundPatient = assignedPatients.find(p => String(p.id) === id);
      setPatient(foundPatient || null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientData();
    setRefreshing(false);
  };

  const handleSendMessage = () => {
    if (id) {
      router.push(`/chat/${id}`);
    }
  };

  // Access control
  if (userType !== 'standalone_doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access denied. This page is for doctors only.</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading patient...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Patient not found</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = patient.totalTrays > 0
    ? Math.round((patient.currentTray / patient.totalTrays) * 100)
    : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <TouchableOpacity onPress={handleSendMessage} style={styles.messageButton}>
          <MessageCircle size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Patient Info Card */}
        <Card style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <View style={styles.avatar}>
              <User size={32} color={Colors.primary} />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name || 'Unknown'}</Text>
              <Text style={styles.patientEmail}>{patient.email || 'No email'}</Text>
            </View>
          </View>
        </Card>

        {/* Treatment Progress */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Treatment Progress</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>{progressPercent}% Complete</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{patient.currentTray || 1}</Text>
              <Text style={styles.statLabel}>Current Aligner</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{patient.totalTrays || 0}</Text>
              <Text style={styles.statLabel}>Total Aligners</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{patient.daysPerTray || 14}</Text>
              <Text style={styles.statLabel}>Days per Tray</Text>
            </View>
          </View>
        </Card>

        {/* Compliance */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Compliance</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{patient.weeklyCompliance || 0}%</Text>
              <Text style={styles.statLabel}>Weekly Average</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{patient.dailyWearTarget ? Math.round(patient.dailyWearTarget / 60) : 22}h</Text>
              <Text style={styles.statLabel}>Daily Target</Text>
            </View>
          </View>
        </Card>

        {/* Timeline */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Timeline</Text>
          </View>

          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Treatment Started</Text>
            <Text style={styles.timelineValue}>{formatDate(patient.startDate)}</Text>
          </View>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Assigned to You</Text>
            <Text style={styles.timelineValue}>{formatDate(patient.assignedDate)}</Text>
          </View>
        </Card>

        {/* Recent Activity */}
        {patient.wearLogs && patient.wearLogs.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Clock size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Recent Wear Logs</Text>
            </View>

            {patient.wearLogs.slice(0, 5).map((log: any, index: number) => (
              <View key={log.id || index} style={styles.logItem}>
                <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                <Text style={styles.logValue}>
                  {Math.round(log.wearMinutes / 60 * 10) / 10}h worn
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  messageButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  patientCard: {
    marginBottom: Spacing.md,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  patientEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timelineLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  logValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});
