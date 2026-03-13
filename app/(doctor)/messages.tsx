import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Search, X, MessageCircle, RefreshCw } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useChatStore } from '@/stores/chat-store';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';

export default function DoctorMessagesScreen() {
  const { conversations, loadConversations, loadingConversations, connect, connected, totalUnread, loadUnreadCount } = useChatStore();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!connected) connect();
    loadConversations('doctor');
    loadUnreadCount('doctor');
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations('doctor');
    setRefreshing(false);
  }, []);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((c) =>
      c.patient?.name?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

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

  const getInitials = (name?: string) => {
    if (!name) return 'PA';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderConversation = ({ item }: { item: typeof conversations[0] }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.initials, { color: colors.background }]}>
          {getInitials(item.patient?.name)}
        </Text>
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.patient?.name || 'Patient'}
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
        {item.patient?.currentTray && (
          <Text style={[styles.trayInfo, { color: colors.textSecondary }]}>
            Tray {item.patient.currentTray} of {item.patient.totalTrays || '?'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Messages</Text>
            <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              {totalUnread > 0 ? ` · ${totalUnread} unread` : ''}
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
      <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border, marginHorizontal: Spacing.md }]}>
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

      {loadingConversations && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          {searchQuery ? (
            <>
              <Search size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No results</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                No patients match "{searchQuery}"
              </Text>
            </>
          ) : (
            <>
              <MessageCircle size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Conversations</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Start a conversation from a patient's profile
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => String(item.id)}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  refreshButton: { padding: Spacing.sm },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: BorderRadius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md, gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.xs },
  list: { paddingHorizontal: Spacing.md },
  conversationItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, marginBottom: Spacing.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.md,
  },
  initials: { fontSize: 16, fontWeight: '600' },
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
  trayInfo: { fontSize: 12, marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
});
