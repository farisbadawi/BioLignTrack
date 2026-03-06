// app/chat/[id].tsx - Doctor-patient chat screen (Coming Soon)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, MessageCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>Messages</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Coming Soon Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MessageCircle size={64} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Messaging Coming Soon</Text>
        <Text style={styles.subtitle}>
          In-app messaging will be available in a future update. For now, please contact your doctor or patient using their contact information.
        </Text>
        <TouchableOpacity style={styles.backButton2} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  backButton2: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});
