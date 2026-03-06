import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, TextInput, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, User, Phone, Settings, ExternalLink, Link, CheckCircle, X, Plus } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { useCustomAlert } from '@/components/CustomAlert';

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
  const {
    userType,
    assignedDoctor,
    practiceInfo,
    savePracticeInfo,
    loadAssignedDoctor,
    appointments: pmsAppointments,
    availableSlots,
    loadAppointments,
    loadAvailableSlots,
    bookAppointment,
    cancelAppointment,
  } = usePatientStore();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [calendlyInput, setCalendlyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Load appointments for PMS-linked patients
  useEffect(() => {
    if (userType === 'linked') {
      loadAppointments();
    }
  }, [userType]);

  // Appointments - use PMS appointments for linked patients, empty for standalone
  const appointments: any[] = userType === 'linked' ? pmsAppointments.upcoming : [];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (userType === 'linked') {
        await loadAppointments();
      } else {
        await loadAssignedDoctor();
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenBookingModal = async () => {
    setLoadingSlots(true);
    setShowBookingModal(true);
    await loadAvailableSlots();
    setLoadingSlots(false);
  };

  const handleSelectSlot = (slot: any) => {
    setSelectedSlot(slot);
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot) return;

    setIsBooking(true);
    const result = await bookAppointment(selectedSlot.slotId, bookingNotes || undefined);
    setIsBooking(false);

    if (result.success) {
      showAlert({
        title: 'Success',
        message: 'Your appointment has been booked!',
        type: 'success',
      });
      setShowBookingModal(false);
      setSelectedSlot(null);
      setBookingNotes('');
    } else {
      showAlert({
        title: 'Error',
        message: result.error || 'Failed to book appointment',
        type: 'error',
      });
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    showAlert({
      title: 'Cancel Appointment',
      message: 'Are you sure you want to cancel this appointment?',
      type: 'warning',
      buttons: [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelAppointment(appointmentId);
            if (result.success) {
              showAlert({
                title: 'Cancelled',
                message: 'Your appointment has been cancelled.',
                type: 'success',
              });
            } else {
              showAlert({
                title: 'Error',
                message: result.error || 'Failed to cancel appointment',
                type: 'error',
              });
            }
          },
        },
      ],
    });
  };

  // Group available slots by date
  const groupedSlots = availableSlots.reduce((acc: Record<string, any[]>, slot) => {
    const dateStr = new Date(slot.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(slot);
    return acc;
  }, {});

  // Get doctor's practice info (for patients) - use camelCase from API
  const practicePhone = assignedDoctor?.practicePhone || null;
  const practiceAddress = assignedDoctor?.practiceAddress || null;
  const practiceName = assignedDoctor?.practiceName || 'Your Orthodontist';
  const calendlyUrl = assignedDoctor?.calendlyUrl || null;
  const officeHours = assignedDoctor?.officeHours || null;

  // Handle scheduling - PMS patients use built-in booking, standalone uses Calendly
  const handleSchedule = () => {
    if (userType === 'linked') {
      handleOpenBookingModal();
    } else {
      router.push('/book-appointment');
    }
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
        showAlert({
          title: 'Call Office',
          message: `Phone: ${practicePhone}`,
          type: 'info',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Call Office',
        message: `Phone: ${practicePhone}`,
        type: 'info',
      });
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
      showAlert({
        title: 'Success',
        message: 'Calendly URL saved! Your patients can now book appointments with you.',
        type: 'success',
      });
    } else {
      showAlert({
        title: 'Error',
        message: result.error || 'Failed to save Calendly URL',
        type: 'error',
      });
    }
  };

  // Filter and sort appointments - handle both PMS format (startTime) and legacy format (starts_at)
  const upcomingAppointments = appointments
    .filter((apt) => {
      const status = apt.status?.toLowerCase();
      const startDate = new Date(apt.startTime || apt.starts_at);
      return (status === 'scheduled' || status === 'confirmed' || status === 'pending') && startDate > new Date();
    })
    .sort((a, b) => {
      const aTime = new Date(a.startTime || a.starts_at).getTime();
      const bTime = new Date(b.startTime || b.starts_at).getTime();
      return aTime - bTime;
    });

  const formatDate = (date: Date) => {
    // Display stored date as-is (no timezone conversion)
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date: Date) => {
    // Display stored time as-is (no timezone conversion)
    // Times are stored as UTC but represent clinic local time
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return minutes === 0 ? `${h12} ${ampm}` : `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const AppointmentCard = ({ appointment }: { appointment: any }) => {
    // Handle both PMS format (startTime/endTime) and legacy format (starts_at/ends_at)
    const startDate = new Date(appointment.startTime || appointment.starts_at);
    const title = appointment.type || appointment.title || 'Appointment';
    const practice = appointment.practice || appointment.location;
    const isPmsAppointment = !!appointment.startTime;

    return (
      <Card style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.dateInfo}>
            <Text style={[styles.appointmentDate, { color: colors.textPrimary }]}>
              {formatDate(startDate)}
            </Text>
            <Text style={[styles.daysUntil, { color: colors.primary }]}>
              {getDaysUntil(startDate)}
            </Text>
          </View>
          <View style={styles.timeInfo}>
            <Clock size={16} color={colors.primary} />
            <Text style={[styles.appointmentTime, { color: colors.primary }]}>
              {formatTime(startDate)}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>{title}</Text>
          </View>

          {practice && (
            <View style={styles.detailRow}>
              <MapPin size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{practice}</Text>
            </View>
          )}

          {appointment.notes && (
            <View style={styles.detailRow}>
              <User size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{appointment.notes}</Text>
            </View>
          )}
        </View>

        <View style={[styles.appointmentActions, { borderTopColor: colors.border }]}>
          {isPmsAppointment && userType === 'linked' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCancelAppointment(appointment.id)}
            >
              <X size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          {practicePhone && (
            <TouchableOpacity style={styles.actionButton} onPress={handleCallOffice}>
              <Phone size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Call Office</Text>
            </TouchableOpacity>
          )}

          {!isPmsAppointment && (
            <TouchableOpacity style={styles.actionButton} onPress={handleSchedule}>
              <Calendar size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Reschedule</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const getPageTitle = () => {
    return userType === 'standalone_doctor' ? 'Patient Appointments' : 'Appointments';
  };

  const getSubtitle = () => {
    if (userType === 'standalone_doctor') {
      return `${upcomingAppointments.length} upcoming patient appointments`;
    }
    return `${upcomingAppointments.length} upcoming appointments`;
  };

  // Doctor view
  if (userType === 'standalone_doctor') {
    const doctorCalendlyUrl = practiceInfo?.calendly_url || null;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <AlertComponent />
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
      <AlertComponent />
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

        {/* Book Appointment Button for PMS-linked patients */}
        {userType === 'linked' && (
          <TouchableOpacity
            style={[styles.bookAppointmentButton, { backgroundColor: colors.primary }]}
            onPress={handleOpenBookingModal}
          >
            <Plus size={20} color={colors.background} />
            <Text style={[styles.bookAppointmentText, { color: colors.background }]}>Book New Appointment</Text>
          </TouchableOpacity>
        )}

        {/* Next Appointment Highlight */}
        {upcomingAppointments.length > 0 && (() => {
          const nextAppt = upcomingAppointments[0];
          const nextStartDate = new Date(nextAppt.startTime || nextAppt.starts_at);
          const nextTitle = nextAppt.type || nextAppt.title || 'Appointment';

          return (
            <Card style={[styles.nextAppointmentCard, { backgroundColor: colors.primary }]}>
              <View style={styles.nextAppointmentHeader}>
                <Text style={[styles.nextAppointmentTitle, { color: colors.background }]}>Next Appointment</Text>
                <View style={styles.reminderBadge}>
                  <Text style={[styles.reminderText, { color: colors.background }]}>Scheduled</Text>
                </View>
              </View>

              <View style={styles.nextAppointmentContent}>
                <View style={styles.nextAppointmentDate}>
                  <Text style={[styles.nextAppointmentDay, { color: colors.background }]}>
                    {nextStartDate.getDate()}
                  </Text>
                  <Text style={[styles.nextAppointmentMonth, { color: colors.background }]}>
                    {nextStartDate.toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                </View>

                <View style={styles.nextAppointmentInfo}>
                  <Text style={[styles.nextAppointmentPurpose, { color: colors.background }]}>
                    {nextTitle}
                  </Text>
                  <Text style={[styles.nextAppointmentTime, { color: colors.background }]}>
                    {formatTime(nextStartDate)}
                  </Text>
                  <Text style={[styles.nextAppointmentDays, { color: colors.background }]}>
                    {getDaysUntil(nextStartDate)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })()}

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

      {/* Booking Modal for PMS-linked patients */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Book Appointment</Text>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                setShowBookingModal(false);
                setSelectedSlot(null);
                setBookingNotes('');
              }}
            >
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loadingSlots ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading available slots...
              </Text>
            </View>
          ) : availableSlots.length === 0 ? (
            <View style={styles.noSlotsContainer}>
              <Calendar size={48} color={colors.textSecondary} />
              <Text style={[styles.noSlotsTitle, { color: colors.textPrimary }]}>
                No Available Slots
              </Text>
              <Text style={[styles.noSlotsText, { color: colors.textSecondary }]}>
                There are no appointment slots available in the next 30 days.
                Please contact your clinic directly.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.slotsScrollView}>
              {selectedSlot ? (
                <View style={styles.confirmationContainer}>
                  <Text style={[styles.confirmationTitle, { color: colors.textPrimary }]}>
                    Confirm Your Appointment
                  </Text>

                  <Card style={styles.selectedSlotCard}>
                    <View style={styles.selectedSlotHeader}>
                      <Calendar size={20} color={colors.primary} />
                      <Text style={[styles.selectedSlotDate, { color: colors.textPrimary }]}>
                        {new Date(selectedSlot.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.selectedSlotTime}>
                      <Clock size={20} color={colors.primary} />
                      <Text style={[styles.selectedSlotTimeText, { color: colors.textPrimary }]}>
                        {formatTime12h(selectedSlot.startTime)} - {formatTime12h(selectedSlot.endTime)}
                      </Text>
                    </View>
                    {selectedSlot.appointmentType && (
                      <View style={[styles.confirmTypeBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.confirmTypeText, { color: colors.primary }]}>
                          {selectedSlot.appointmentType.name}
                        </Text>
                      </View>
                    )}
                  </Card>

                  <View style={styles.notesContainer}>
                    <Text style={[styles.notesLabel, { color: colors.textPrimary }]}>
                      Notes (optional)
                    </Text>
                    <TextInput
                      style={[styles.notesInput, {
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        backgroundColor: colors.surface,
                      }]}
                      placeholder="Add any notes for your appointment..."
                      placeholderTextColor={colors.textSecondary}
                      value={bookingNotes}
                      onChangeText={setBookingNotes}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.confirmationButtons}>
                    <TouchableOpacity
                      style={[styles.backButton, { borderColor: colors.border }]}
                      onPress={() => setSelectedSlot(null)}
                    >
                      <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>
                        Back
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmButton, {
                        backgroundColor: colors.primary,
                        opacity: isBooking ? 0.6 : 1,
                      }]}
                      onPress={handleBookAppointment}
                      disabled={isBooking}
                    >
                      {isBooking ? (
                        <ActivityIndicator size="small" color={colors.background} />
                      ) : (
                        <Text style={[styles.confirmButtonText, { color: colors.background }]}>
                          Confirm Booking
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {Object.entries(groupedSlots).map(([dateStr, slots], dateIndex) => {
                    // Group slots by appointment type within each date
                    const slotsByType = (slots as any[]).reduce((acc: Record<string, any[]>, slot) => {
                      const typeName = slot.appointmentType?.name || 'General';
                      if (!acc[typeName]) acc[typeName] = [];
                      acc[typeName].push(slot);
                      return acc;
                    }, {});

                    return (
                      <View key={dateStr} style={styles.dateGroup}>
                        {/* Date Header */}
                        <View style={[styles.dateHeader, { backgroundColor: colors.primary + '10' }]}>
                          <View style={styles.dateHeaderLeft}>
                            <Calendar size={18} color={colors.primary} />
                            <Text style={[styles.dateGroupTitle, { color: colors.textPrimary }]}>
                              {dateStr}
                            </Text>
                          </View>
                          <Text style={[styles.slotCount, { color: colors.textSecondary }]}>
                            {(slots as any[]).length} slots
                          </Text>
                        </View>

                        {/* Slots grouped by type */}
                        {Object.entries(slotsByType).map(([typeName, typeSlots]) => (
                          <View key={typeName} style={styles.typeSection}>
                            <View style={styles.typeLabelRow}>
                              <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.typeLabel, { color: colors.primary }]}>
                                  {typeName}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.slotsGrid}>
                              {(typeSlots as any[]).map((slot) => (
                                <TouchableOpacity
                                  key={slot.slotId}
                                  style={[styles.slotButton, {
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                  }]}
                                  onPress={() => handleSelectSlot(slot)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.slotTime, { color: colors.textPrimary }]}>
                                    {formatTime12h(slot.startTime)}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                  <View style={{ height: Spacing.xl }} />
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  // Book Appointment Button
  bookAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  bookAppointmentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Booking Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  noSlotsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  noSlotsTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  noSlotsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  slotsScrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  selectSlotTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  dateGroup: {
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  slotCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeSection: {
    marginBottom: Spacing.md,
  },
  typeLabelRow: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slotButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTime: {
    fontSize: 15,
    fontWeight: '600',
  },
  slotType: {
    fontSize: 11,
    marginTop: 2,
  },
  // Confirmation styles
  confirmationContainer: {
    paddingBottom: Spacing.xl,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.lg,
  },
  selectedSlotCard: {
    marginBottom: Spacing.lg,
  },
  selectedSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selectedSlotDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedSlotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selectedSlotTimeText: {
    fontSize: 16,
  },
  selectedSlotType: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  confirmTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  confirmTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesContainer: {
    marginBottom: Spacing.lg,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
