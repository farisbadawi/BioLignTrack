import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { X, Calendar, ExternalLink, AlertCircle } from 'lucide-react-native'
import { router } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'
import { usePatientStore } from '@/stores/patient-store'
import { Spacing, BorderRadius } from '@/constants/colors'

export default function ViewBookingsScreen() {
  const { colors } = useTheme()
  const { practiceInfo, userType } = usePatientStore()
  const [loading, setLoading] = React.useState(true)

  // Get the doctor's Calendly URL
  const calendlyUrl = practiceInfo?.calendly_url || null

  // If no Calendly URL is set up, show setup prompt
  if (userType === 'standalone_doctor' && !calendlyUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Calendly Bookings</Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.emptyContainer}>
          <AlertCircle size={64} color={colors.warning} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Calendly Not Set Up
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Add your Calendly URL in the Appointments tab to view and manage your bookings.
          </Text>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.back()
              router.push('/(doctor)/appointments')
            }}
          >
            <Calendar size={20} color={colors.background} />
            <Text style={[styles.setupButtonText, { color: colors.background }]}>
              Set Up Calendly
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Extract username from Calendly URL for dashboard access
  // e.g., https://calendly.com/smileelements -> smileelements
  const getCalendlyDashboardUrl = () => {
    // Calendly's scheduled events page (requires login)
    return 'https://calendly.com/app/scheduled_events/user/me'
  }

  // Option to open in external browser for full Calendly access
  const openInBrowser = () => {
    Linking.openURL('https://calendly.com/app/scheduled_events/user/me')
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Calendly Bookings</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.externalButton, { backgroundColor: colors.surface }]}
            onPress={openInBrowser}
          >
            <ExternalLink size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.webviewContainer}>
        {loading && (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading Calendly...
            </Text>
          </View>
        )}
        <WebView
          source={{ uri: getCalendlyDashboardUrl() }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  externalButton: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
