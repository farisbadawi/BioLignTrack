import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, User, Phone, Settings, ExternalLink, Link, CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';

// Office hours types and helpers
interface DaySchedule {
  isOpen: boolean
  openTime: string
  closeTime: string
}

interface OfficeHoursSchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const formatTime12h = (time24: string): string => {
  const [hours, minutes] = time24.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return minutes === '00' ? `${h12}${ampm}` : `${h12}:${minutes}${ampm}`
}

const parseOfficeHours = (officeHoursStr: string): OfficeHoursSchedule | null => {
  if (!officeHoursStr) return null

  try {
    const parsed = JSON.parse(officeHoursStr)
    if (parsed.monday && typeof parsed.monday.isOpen === 'boolean') {
      return parsed as OfficeHoursSchedule
    }
  } catch {
    // Legacy free-text format
  }

  return null
}

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
  const { appointments, userRole, assignedDoctor, practiceInfo, savePracticeInfo, loadAssignedDoctor } = usePatientStore();
  const { colors } = useTheme();
  const [calendlyInput, setCalendlyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAssignedDoctor();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Get doctor's practice info (for patients)
  const practicePhone = assignedDoctor?.practice_phone || null;
  const practiceAddress = assignedDoctor?.practice_address || null;
  const practiceName = assignedDoctor?.practice_name || 'Your Orthodontist';
  const calendlyUrl = assignedDoctor?.calendly_url || null;
  const officeHours = assignedDoctor?.office_hours || null;

  // Handle scheduling - always go to book-appointment screen (it handles missing Calendly gracefully)
  const handleSchedule = () => {
    router.push('/book-appointment');
  };

  // Safely handle phone calls with proper error handling
  const handleCallOffice = async () => {
    if (!practicePhone) return;

    const phoneNumber = practicePhone.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(telUrl);
      if (supported) {
        await Linking.openURL(telUrl);
      } else {
        // Phone calls not supported (e.g., simulator) - show the number to copy
        Alert.alert(
          'Call Office',
          `Phone: ${practicePhone}`,
          [
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Call Office',
        `Phone: ${practicePhone}`,
        [
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  // Handle doctor saving Calendly URL
  const handleSaveCalendly = async () => {
    if (!calendlyInput.trim()) return;

    setIsSaving(true);
    const result = await savePracticeInfo({ calendly_url: calendlyInput.trim() });
    setIsSaving(false);

    if (result.success) {
      setCalendlyInput('');
      Alert.alert('Success', 'Calendly URL saved! Your patients can now book appointments with you.');
    } else {
      Alert.alert('Error', result.error || 'Failed to save Calendly URL');
    }
  };

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
        {practicePhone && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCallOffice}>
            <Phone size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Call Office</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={handleSchedule}>
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

  // Doctor view
  if (userRole === 'doctor') {
    const doctorCalendlyUrl = practiceInfo?.calendly_url || null;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Appointments</Text>
            <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage your patient bookings</Text>
          </View>

          {/* Calendly Setup Card */}
          <Card style={styles.calendlySetupCard}>
            <View style={styles.calendlyHeader}>
              <Settings size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Calendly Integration</Text>
            </View>

            {doctorCalendlyUrl ? (
              <View style={styles.calendlyConfigured}>
                <View style={styles.calendlyStatus}>
                  <CheckCircle size={20} color={colors.success} />
                  <Text style={[styles.calendlyStatusText, { color: colors.success }]}>Connected</Text>
                </View>
                <Text style={[styles.calendlyUrlText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {doctorCalendlyUrl}
                </Text>
                <View style={styles.calendlyActions}>
                  <TouchableOpacity
                    style={[styles.calendlyButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/view-bookings')}
                  >
                    <ExternalLink size={18} color={colors.background} />
                    <Text style={[styles.calendlyButtonText, { color: colors.background }]}>View Bookings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.calendlyButtonOutline, { borderColor: colors.primary }]}
                    onPress={() => router.push('/(tabs)/profile')}
                  >
                    <Text style={[styles.calendlyButtonOutlineText, { color: colors.primary }]}>Edit in Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.calendlySetup}>
                <Text style={[styles.calendlySetupText, { color: colors.textSecondary }]}>
                  Connect your Calendly to let patients book appointments directly.
                </Text>
                <TextInput
                  style={[styles.calendlyInput, { borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="https://calendly.com/your-name"
                  placeholderTextColor={colors.textSecondary}
                  value={calendlyInput}
                  onChangeText={setCalendlyInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <TouchableOpacity
                  style={[styles.calendlyButton, { backgroundColor: colors.primary, opacity: isSaving || !calendlyInput.trim() ? 0.6 : 1 }]}
                  onPress={handleSaveCalendly}
                  disabled={isSaving || !calendlyInput.trim()}
                >
                  <Link size={18} color={colors.background} />
                  <Text style={[styles.calendlyButtonText, { color: colors.background }]}>
                    {isSaving ? 'Saving...' : 'Connect Calendly'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Upcoming Patient Appointments */}
          <View style={styles.appointmentsList}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Patient Appointments</Text>

            {upcomingAppointments.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Calendar size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No upcoming appointments</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {doctorCalendlyUrl
                    ? 'Patient appointments will appear here when booked.'
                    : 'Set up Calendly above to enable patient bookings.'}
                </Text>
              </Card>
            ) : (
              upcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            )}
          </View>

          {/* View Bookings Button */}
          {doctorCalendlyUrl && (
            <TouchableOpacity
              style={[styles.viewBookingsButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/view-bookings')}
            >
              <Calendar size={20} color={colors.background} />
              <Text style={[styles.viewBookingsText, { color: colors.background }]}>Open Calendly Dashboard</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Patient view
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.surface }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
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

        {/* Quick Actions - Patient only */}
        <Card style={styles.quickActionsCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Need Help?</Text>

          <View style={styles.quickActions}>
            {practicePhone ? (
              <TouchableOpacity style={styles.quickAction} onPress={handleCallOffice}>
                <Phone size={20} color={colors.primary} />
                <Text style={[styles.quickActionText, { color: colors.primary }]}>Call Office</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.quickAction}>
                <Phone size={20} color={colors.textSecondary} />
                <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>No Phone</Text>
              </View>
            )}

            <TouchableOpacity style={styles.quickAction} onPress={handleSchedule}>
              <Calendar size={20} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>Schedule</Text>
            </TouchableOpacity>

            {practiceAddress ? (
              <TouchableOpacity style={styles.quickAction} onPress={() => {
                const encodedLocation = encodeURIComponent(practiceAddress);
                Linking.openURL(`https://maps.google.com/?q=${encodedLocation}`);
              }}>
                <MapPin size={20} color={colors.primary} />
                <Text style={[styles.quickActionText, { color: colors.primary }]}>Directions</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.quickAction}>
                <MapPin size={20} color={colors.textSecondary} />
                <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>No Address</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Office Hours Card */}
        {officeHours && (() => {
          const schedule = parseOfficeHours(officeHours);

          // Legacy text format
          if (!schedule) {
            return (
              <Card style={styles.officeHoursCard}>
                <View style={styles.officeHoursHeader}>
                  <Clock size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Office Hours</Text>
                </View>
                <Text style={[styles.officeHoursLegacy, { color: colors.textSecondary }]}>{officeHours}</Text>
              </Card>
            );
          }

          // Structured format - group consecutive days with same hours
          const groupedHours: { days: string[], hours: string }[] = [];
          let currentGroup: { days: string[], hours: string } | null = null;

          DAYS_ORDER.forEach((day) => {
            const daySchedule = schedule[day];
            const hoursStr = daySchedule.isOpen
              ? `${formatTime12h(daySchedule.openTime)} - ${formatTime12h(daySchedule.closeTime)}`
              : 'Closed';

            if (currentGroup && currentGroup.hours === hoursStr) {
              currentGroup.days.push(DAY_LABELS[day]);
            } else {
              if (currentGroup) groupedHours.push(currentGroup);
              currentGroup = { days: [DAY_LABELS[day]], hours: hoursStr };
            }
          });
          if (currentGroup) groupedHours.push(currentGroup);

          return (
            <Card style={styles.officeHoursCard}>
              <View style={styles.officeHoursHeader}>
                <Clock size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Office Hours</Text>
              </View>
              <View style={[styles.officeHoursTable, { borderColor: colors.border }]}>
                {groupedHours.map((group, index) => {
                  const daysText = group.days.length > 2
                    ? `${group.days[0]} - ${group.days[group.days.length - 1]}`
                    : group.days.join(', ');

                  return (
                    <View
                      key={index}
                      style={[
                        styles.officeHoursRow,
                        { borderBottomColor: colors.border },
                        index === groupedHours.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <Text style={[styles.officeHoursDays, { color: colors.textPrimary }]}>{daysText}</Text>
                      <Text
                        style={[
                          styles.officeHoursTime,
                          { color: group.hours === 'Closed' ? colors.textSecondary : colors.primary },
                        ]}
                      >
                        {group.hours}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })()}

        <View style={{ height: Spacing.xl }} />
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
  // Calendly setup styles
  calendlySetupCard: {
    marginBottom: Spacing.lg,
  },
  calendlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  calendlyConfigured: {
    gap: Spacing.md,
  },
  calendlyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  calendlyStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  calendlyUrlText: {
    fontSize: 13,
  },
  calendlyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  calendlyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    flex: 1,
  },
  calendlyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  calendlyButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  calendlyButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  calendlySetup: {
    gap: Spacing.md,
  },
  calendlySetupText: {
    fontSize: 14,
    lineHeight: 20,
  },
  calendlyInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
  },
  viewBookingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  viewBookingsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Office Hours styles
  officeHoursCard: {
    marginBottom: Spacing.lg,
  },
  officeHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  officeHoursLegacy: {
    fontSize: 14,
    lineHeight: 20,
  },
  officeHoursTable: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  officeHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  officeHoursDays: {
    fontSize: 14,
    fontWeight: '500',
  },
  officeHoursTime: {
    fontSize: 14,
  },
});
