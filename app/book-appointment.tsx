import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { X, Calendar, AlertCircle } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'
import { Spacing, BorderRadius } from '@/constants/colors'
import { usePatientStore } from '@/stores/patient-store'
import { Card } from '@/components/Card'

export default function BookAppointmentScreen() {
  const { colors } = useTheme()
  const { assignedDoctor } = usePatientStore()
  const [loading, setLoading] = React.useState(true)

  // Get Calendly URL from assigned doctor
  const calendlyUrl = assignedDoctor?.calendly_url || null
  const doctorName = assignedDoctor?.name || 'your orthodontist'
  const practicePhone = assignedDoctor?.practice_phone || null

  // If no Calendly URL, show a message
  if (!calendlyUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Book Appointment</Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.noCalendlyContainer}>
          <Card style={styles.noCalendlyCard}>
            <AlertCircle size={48} color={colors.warning} />
            <Text style={[styles.noCalendlyTitle, { color: colors.textPrimary }]}>
              Online Booking Not Available
            </Text>
            <Text style={[styles.noCalendlyText, { color: colors.textSecondary }]}>
              {assignedDoctor
                ? `${doctorName} hasn't set up online booking yet.`
                : "You haven't linked to a doctor yet."
              }
            </Text>
            {practicePhone && (
              <Text style={[styles.noCalendlyText, { color: colors.textSecondary }]}>
                Please call {practicePhone} to schedule an appointment.
              </Text>
            )}
            {!assignedDoctor && (
              <Text style={[styles.noCalendlyText, { color: colors.textSecondary }]}>
                Add your doctor in Profile settings to enable booking.
              </Text>
            )}
          </Card>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Book Appointment</Text>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
        >
          <X size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        {loading && (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading scheduler...
            </Text>
          </View>
        )}
        <WebView
          source={{ uri: calendlyUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  noCalendlyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  noCalendlyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  noCalendlyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  noCalendlyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
})
