import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, MessageCircle } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { useChatStore } from '@/stores/chat-store';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { pmsPatientMessageApi } from '@/lib/api';

export default function PatientMessagesScreen() {
  const { assignedDoctor, userType, linkedPracticeName } = usePatientStore();
  const { conversations, loadConversations, loadingConversations, connect, connected, totalUnread, loadUnreadCount } = useChatStore();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [pmsConversations, setPmsConversations] = useState<any[]>([]);

  const loadPmsConversations = async () => {
    try {
      const response = await pmsPatientMessageApi.getConversations();
      if (response.data && Array.isArray(response.data)) {
        setPmsConversations(response.data);
      }
    } catch {
      // PMS messaging not available
    }
  };

  useEffect(() => {
    if (!connected) connect();
    loadConversations('patient');
    loadUnreadCount('patient');
    loadPmsConversations();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations('patient');
    await loadPmsConversations();
    setRefreshing(false);
  }, []);

  const allConversations = [
    ...conversations.map(c => ({ ...c, source: 'standalone' as const })),
    ...pmsConversations.map(c => ({ ...c, source: 'pms' as const })),
  ].sort((a, b) => {
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  // If no doctor linked (standalone with no doctor code entered)
  if (!assignedDoctor && userType !== 'linked' && pmsConversations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <User size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Doctor Linked</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Enter your doctor's code in Profile settings to start messaging
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(patient)/profile')}
          >
            <Text style={[styles.actionButtonText, { color: colors.background }]}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }: { item: typeof allConversations[0] }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={() => {
        if (item.source === 'pms') {
          router.push(`/chat/${item.id}?source=pms`);
        } else {
          router.push(`/chat/${item.id}`);
        }
      }}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <User size={24} color={colors.background} />
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.doctor?.name || item.staffName || 'Doctor'}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTime(item.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.conversationPreview}>
          <Text
            style={[styles.preview, { color: item.unreadCount > 0 ? colors.textPrimary : colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.lastMessagePreview || 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.background }]}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Messages</Text>
        <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
        {totalUnread > 0 && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {loadingConversations && allConversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : allConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Conversations</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your doctor will start a conversation with you
          </Text>
        </View>
      ) : (
        <FlatList
          data={allConversations}
          keyExtractor={(item) => `${item.source}-${item.id}`}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  list: { paddingHorizontal: Spacing.md },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.md,
  },
  conversationInfo: { flex: 1 },
  conversationHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  time: { fontSize: 12, marginLeft: Spacing.sm },
  conversationPreview: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  preview: { fontSize: 14, flex: 1 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6, marginLeft: Spacing.sm,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
  actionButton: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
});
