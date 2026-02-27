import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, User, Phone } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { useTheme } from '@/contexts/ThemeContext';

interface AppointmentData {
  id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  location?: string | null;
  status: string;
  [key: string]: any;
}

export default function AppointmentsScreen() {
  const { appointments, userRole } = usePatientStore();
  const { colors } = useTheme();

  // Filter and sort appointments
  const upcomingAppointments = (appointments as unknown as AppointmentData[])
    .filter((apt) => (apt.status === 'confirmed' || apt.status === 'pending') && new Date(apt.starts_at) > new Date())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const AppointmentCard = ({ appointment }: { appointment: AppointmentData }) => (
    <Card style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.dateInfo}>
          <Text style={[styles.appointmentDate, { color: colors.textPrimary }]}>
            {formatDate(new Date(appointment.starts_at))}
          </Text>
          <Text style={[styles.daysUntil, { color: colors.primary }]}>
            {getDaysUntil(new Date(appointment.starts_at))}
          </Text>
        </View>
        <View style={styles.timeInfo}>
          <Clock size={16} color={colors.primary} />
          <Text style={[styles.appointmentTime, { color: colors.primary }]}>
            {formatTime(new Date(appointment.starts_at))}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <User size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{appointment.title}</Text>
        </View>

        {appointment.provider && (
          <View style={styles.detailRow}>
            <User size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>{appointment.provider}</Text>
          </View>
        )}

        {appointment.location && (
          <TouchableOpacity style={styles.detailRow} onPress={() => {
            const encodedLocation = encodeURIComponent(appointment.location!);
            Linking.openURL(`https://maps.google.com/?q=${encodedLocation}`);
          }}>
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, styles.locationText, { color: colors.primary }]}>
              {appointment.location}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.appointmentActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {
          Linking.openURL('tel:+1234567890');
        }}>
          <Phone size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Call Office</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => {
          Alert.alert('Reschedule', 'Please call the office to reschedule your appointment.');
        }}>
          <Calendar size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Reschedule</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const getPageTitle = () => {
    return userRole === 'doctor' ? 'Patient Appointments' : 'Appointments';
  };

  const getSubtitle = () => {
    if (userRole === 'doctor') {
      return `${upcomingAppointments.length} upcoming patient appointments`;
    }
    return `${upcomingAppointments.length} upcoming appointments`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{getPageTitle()}</Text>
          <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{getSubtitle()}</Text>
        </View>

        {/* Next Appointment Highlight */}
        {upcomingAppointments.length > 0 && (
          <Card style={[styles.nextAppointmentCard, { backgroundColor: colors.primary }]}>
            <View style={styles.nextAppointmentHeader}>
              <Text style={[styles.nextAppointmentTitle, { color: colors.background }]}>Next Appointment</Text>
              <View style={styles.reminderBadge}>
                <Text style={[styles.reminderText, { color: colors.background }]}>Reminder Set</Text>
              </View>
            </View>

            <View style={styles.nextAppointmentContent}>
              <View style={styles.nextAppointmentDate}>
                <Text style={[styles.nextAppointmentDay, { color: colors.background }]}>
                  {new Date(upcomingAppointments[0].starts_at).getDate()}
                </Text>
                <Text style={[styles.nextAppointmentMonth, { color: colors.background }]}>
                  {new Date(upcomingAppointments[0].starts_at).toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </View>

              <View style={styles.nextAppointmentInfo}>
                <Text style={[styles.nextAppointmentPurpose, { color: colors.background }]}>
                  {upcomingAppointments[0].title}
                </Text>
                <Text style={[styles.nextAppointmentTime, { color: colors.background }]}>
                  {formatTime(new Date(upcomingAppointments[0].starts_at))}
                </Text>
                <Text style={[styles.nextAppointmentDays, { color: colors.background }]}>
                  {getDaysUntil(new Date(upcomingAppointments[0].starts_at))}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* All Upcoming Appointments */}
        <View style={styles.appointmentsList}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>All Upcoming</Text>

          {upcomingAppointments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Calendar size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No upcoming appointments</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Your next appointment will appear here when scheduled.
              </Text>
            </Card>
          ) : (
            upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </View>

        {/* Quick Actions */}
        <Card style={styles.quickActionsCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Need Help?</Text>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={() => {
              Linking.openURL('tel:+1234567890');
            }}>
              <Phone size={20} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>Call Office</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={() => {
              Alert.alert('Schedule', 'Please call the office to schedule a new appointment.');
            }}>
              <Calendar size={20} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={() => {
              const location = 'BioLign Orthodontics, 123 Main St';
              const encodedLocation = encodeURIComponent(location);
              Linking.openURL(`https://maps.google.com/?q=${encodedLocation}`);
            }}>
              <MapPin size={20} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>Directions</Text>
            </TouchableOpacity>
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
  nextAppointmentCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  nextAppointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nextAppointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  reminderBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  reminderText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
  },
  nextAppointmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextAppointmentDate: {
    alignItems: 'center',
    marginRight: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minWidth: 60,
  },
  nextAppointmentDay: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.background,
  },
  nextAppointmentMonth: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  nextAppointmentInfo: {
    flex: 1,
  },
  nextAppointmentPurpose: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.background,
    marginBottom: Spacing.xs,
  },
  nextAppointmentTime: {
    fontSize: 14,
    color: Colors.background,
    marginBottom: Spacing.xs,
  },
  nextAppointmentDays: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
  },
  appointmentsList: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  appointmentCard: {
    marginBottom: Spacing.md,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  dateInfo: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  daysUntil: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  appointmentTime: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  appointmentDetails: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  locationText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
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
  quickActionsCard: {
    marginBottom: Spacing.xl,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickActionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
