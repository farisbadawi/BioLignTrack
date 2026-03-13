import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, Settings, ExternalLink, Link, CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { useCustomAlert } from '@/components/CustomAlert';

export default function DoctorAppointmentsScreen() {
  const {
    practiceInfo,
    savePracticeInfo,
  } = usePatientStore();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [calendlyInput, setCalendlyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const doctorCalendlyUrl = practiceInfo?.calendly_url || null;

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
                  onPress={() => router.push('/(doctor)/profile')}
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

          <Card style={styles.emptyCard}>
            <Calendar size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No upcoming appointments</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {doctorCalendlyUrl
                ? 'Patient appointments will appear here when booked.'
                : 'Set up Calendly above to enable patient bookings.'}
            </Text>
          </Card>
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
