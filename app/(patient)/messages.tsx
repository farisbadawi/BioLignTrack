import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, MessageCircle, Send, Check, CheckCheck, X } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { useChatStore, type Message } from '@/stores/chat-store';
import { useTheme } from '@/contexts/ThemeContext';
import { pmsPatientMessageApi, standaloneMessageApi } from '@/lib/api';

export default function PatientMessagesScreen() {
  const { assignedDoctor, userType, linkedPracticeName } = usePatientStore();
  const {
    conversations, loadConversations, loadingConversations,
    connect, connected, loadUnreadCount,
    messages, loadMessages, sendMessage, markRead,
    startTyping, stopTyping, setActiveConversation,
    typingUsers, hasMoreMessages, loadingMessages,
  } = useChatStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isLinked = userType === 'linked';

  // PMS state
  const [pmsConversations, setPmsConversations] = useState<any[]>([]);
  const [pmsLoading, setPmsLoading] = useState(false);
  const [pmsMessages, setPmsMessages] = useState<Message[]>([]);
  const [pmsMessagesLoading, setPmsMessagesLoading] = useState(false);

  // Chat input
  const [inputText, setInputText] = useState('');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Edit state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // ── Load conversations ──────────────────────────────

  const loadPmsConversations = async () => {
    setPmsLoading(true);
    try {
      const response = await pmsPatientMessageApi.getConversations();
      if (response.data && Array.isArray(response.data)) {
        setPmsConversations(response.data);
      }
    } catch {}
    setPmsLoading(false);
  };

  useEffect(() => {
    if (isLinked) {
      loadPmsConversations();
    } else {
      if (!connected) connect();
      loadConversations('patient');
      loadUnreadCount('patient');
    }
  }, []);

  // Determine the active conversation
  const displayConversations = isLinked ? pmsConversations : conversations;
  const activeConversation = displayConversations.length > 0 ? displayConversations[0] : null;
  const conversationId = activeConversation?.id ?? null;

  // ── Standalone: Socket.io messages ──────────────────

  useEffect(() => {
    if (isLinked || !conversationId) return;
    setActiveConversation(conversationId);
    loadMessages(conversationId, 'patient');
    markRead(conversationId, 'patient');

    return () => {
      setActiveConversation(null);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [conversationId, isLinked]);

  // ── PMS: REST polling ──────────────────────────────

  useEffect(() => {
    if (!isLinked || !conversationId) return;

    const loadPmsMsgs = async () => {
      setPmsMessagesLoading(true);
      try {
        const response = await pmsPatientMessageApi.getMessages(conversationId);
        if (response.data?.messages) {
          setPmsMessages(response.data.messages);
        }
      } catch {}
      setPmsMessagesLoading(false);
    };

    loadPmsMsgs();
    const interval = setInterval(loadPmsMsgs, 5000);
    pmsPatientMessageApi.markRead(conversationId).catch(() => {});

    return () => clearInterval(interval);
  }, [isLinked, conversationId]);

  // ── Chat data ──────────────────────────────────────

  const chatMessages = isLinked ? pmsMessages : (conversationId ? (messages[conversationId] || []) : []);
  const isLoadingMessages = isLinked ? pmsMessagesLoading : (conversationId ? (loadingMessages[conversationId] ?? false) : false);
  const typing = (!isLinked && conversationId) ? (typingUsers[conversationId] || []) : [];
  const hasMore = (!isLinked && conversationId) ? (hasMoreMessages[conversationId] ?? true) : false;

  const doctorName = activeConversation?.doctor?.name
    || activeConversation?.staffName
    || linkedPracticeName
    || assignedDoctor?.name
    || 'Doctor';

  // ── Send ───────────────────────────────────────────

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !conversationId) return;

    // Editing an existing message
    if (editingMessage) {
      if (isLinked) {
        pmsPatientMessageApi.editMessage(conversationId, editingMessage.id, text).then(() => {
          setPmsMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: text } : m));
        });
      } else {
        standaloneMessageApi.editMessage('patient', conversationId, editingMessage.id, text).then(() => {
          loadMessages(conversationId, 'patient');
        });
      }
      setEditingMessage(null);
      setInputText('');
      return;
    }

    // Sending a new message
    if (isLinked) {
      pmsPatientMessageApi.sendMessage(conversationId, text).then((response) => {
        if (response.data) {
          setPmsMessages(prev => [{
            id: response.data.id,
            conversationId,
            senderId: response.data.senderId,
            senderType: response.data.senderType,
            content: response.data.content,
            read: false,
            createdAt: response.data.createdAt,
          }, ...prev]);
        }
      });
    } else {
      sendMessage(conversationId, text);
      stopTyping(conversationId);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
    setInputText('');
  }, [inputText, conversationId, isLinked, editingMessage]);

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    if (isLinked || !conversationId) return;

    if (text.trim()) {
      startTyping(conversationId);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        stopTyping(conversationId);
      }, 3000);
    } else {
      stopTyping(conversationId);
    }
  }, [conversationId, isLinked]);

  const handleLoadMore = useCallback(() => {
    if (!isLinked && conversationId && !isLoadingMessages && hasMore) {
      loadMessages(conversationId, 'patient', true);
    }
  }, [isLoadingMessages, hasMore, conversationId, isLinked]);

  const handleRefresh = useCallback(async () => {
    if (isLinked) {
      await loadPmsConversations();
      if (conversationId) {
        try {
          const response = await pmsPatientMessageApi.getMessages(conversationId);
          if (response.data?.messages) setPmsMessages(response.data.messages);
        } catch {}
      }
    } else {
      await loadConversations('patient');
      if (conversationId) loadMessages(conversationId, 'patient');
    }
  }, [isLinked, conversationId]);

  // ── Edit / Delete ───────────────────────────────────

  const handleLongPress = (msg: Message) => {
    if (msg.senderType !== 'patient' || msg.pending || msg.failed) return;
    Alert.alert('Message', undefined, [
      {
        text: 'Edit',
        onPress: () => {
          setEditingMessage(msg);
          setInputText(msg.content);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Message', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => handleDeleteMessage(msg),
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!conversationId) return;
    if (isLinked) {
      await pmsPatientMessageApi.deleteMessage(conversationId, msg.id);
      setPmsMessages(prev => prev.filter(m => m.id !== msg.id));
    } else {
      await standaloneMessageApi.deleteMessage('patient', conversationId, msg.id);
      // Reload messages from store
      loadMessages(conversationId, 'patient');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  // ── Render helpers ─────────────────────────────────

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const shouldShowDate = (index: number) => {
    if (index === chatMessages.length - 1) return true;
    const current = new Date(chatMessages[index].createdAt).toDateString();
    const next = new Date(chatMessages[index + 1].createdAt).toDateString();
    return current !== next;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = item.senderType === 'patient';
    const showDate = shouldShowDate(index);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={[styles.dateSeparatorText, { color: colors.textSecondary }]}>
              {formatDateSeparator(item.createdAt)}
            </Text>
          </View>
        )}
        <View style={[styles.messageRow, mine ? styles.myMessageRow : styles.theirMessageRow]}>
          <Pressable
            onLongPress={() => handleLongPress(item)}
            style={[
              styles.messageBubble,
              mine
                ? [styles.myBubble, { backgroundColor: colors.primary }]
                : [styles.theirBubble, { backgroundColor: colors.background, borderColor: colors.border }],
              item.pending && { opacity: 0.6 },
              item.failed && { borderColor: colors.error, borderWidth: 1 },
              editingMessage?.id === item.id && { borderColor: colors.warning, borderWidth: 2 },
            ]}
          >
            <Text style={[styles.messageText, { color: mine ? colors.background : colors.textPrimary }]}>
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, { color: mine ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                {formatMessageTime(item.createdAt)}
              </Text>
              {mine && !item.pending && !item.failed && (
                item.read
                  ? <CheckCheck size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
                  : <Check size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
              )}
              {item.failed && (
                <Text style={[styles.failedText, { color: colors.error }]}> Failed</Text>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    );
  };

  // ── No doctor / loading states ─────────────────────

  if (!isLinked && !assignedDoctor) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <User size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Doctor Linked</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Enter your doctor's code in Profile settings to start messaging
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isInitialLoading = (isLinked ? pmsLoading : loadingConversations) && !activeConversation;

  if (isInitialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <View style={styles.chatHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User size={20} color={colors.background} />
          </View>
          <Text style={[styles.chatHeaderName, { color: colors.textPrimary }]}>{doctorName}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!activeConversation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <View style={styles.chatHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User size={20} color={colors.background} />
          </View>
          <Text style={[styles.chatHeaderName, { color: colors.textPrimary }]}>{doctorName}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MessageCircle size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Messages Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {isLinked
              ? 'Your clinic will start a conversation with you'
              : 'Your doctor will start a conversation with you'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main chat view ─────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      {/* Doctor header */}
      <View style={[styles.chatHeader, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <User size={20} color={colors.background} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.chatHeaderName, { color: colors.textPrimary }]}>{doctorName}</Text>
          {typing.length > 0 && (
            <Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.primary }}>typing...</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90 + insets.top}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.tempId || String(item.id)}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messageList}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          onRefresh={handleRefresh}
          refreshing={false}
          ListFooterComponent={
            isLoadingMessages ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ padding: Spacing.md }} />
            ) : null
          }
          ListEmptyComponent={
            !isLoadingMessages ? (
              <View style={styles.emptyChat}>
                <Text style={[styles.emptyChatText, { color: colors.textSecondary }]}>
                  No messages yet. Say hello!
                </Text>
              </View>
            ) : null
          }
        />

        {/* Editing banner */}
        {editingMessage && (
          <View style={[styles.editBanner, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[styles.editBannerText, { color: colors.textSecondary }]} numberOfLines={1}>
              Editing: {editingMessage.content}
            </Text>
            <TouchableOpacity onPress={handleCancelEdit} hitSlop={8}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? colors.primary : colors.border }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={20} color={inputText.trim() ? colors.background : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.sm,
  },
  chatHeaderName: { fontSize: 18, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  messageList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  dateSeparator: { alignItems: 'center', paddingVertical: Spacing.md },
  dateSeparatorText: { fontSize: 12, fontWeight: '500' },
  messageRow: { marginBottom: Spacing.xs },
  myMessageRow: { alignItems: 'flex-end' },
  theirMessageRow: { alignItems: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: { fontSize: 11 },
  failedText: { fontSize: 11, fontWeight: '600' },
  editBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  editBannerText: { fontSize: 13, flex: 1, marginRight: Spacing.sm },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: BorderRadius.lg, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: 15, maxHeight: 100, marginRight: Spacing.sm,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyChat: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingVertical: Spacing.xl,
    transform: [{ scaleY: -1 }],
  },
  emptyChatText: { fontSize: 14 },
});
