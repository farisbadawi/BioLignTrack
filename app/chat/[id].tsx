import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Check, CheckCheck } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useChatStore, type Message } from '@/stores/chat-store';
import { usePatientStore } from '@/stores/patient-store';
import { useTheme } from '@/contexts/ThemeContext';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = parseInt(id, 10);
  const { colors } = useTheme();
  const { userType } = usePatientStore();

  const {
    messages, loadMessages, sendMessage, markRead,
    startTyping, stopTyping, setActiveConversation,
    typingUsers, hasMoreMessages, loadingMessages,
    conversations, connected, connect,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const chatMessages = messages[conversationId] || [];
  const isLoading = loadingMessages[conversationId] ?? false;
  const hasMore = hasMoreMessages[conversationId] ?? true;
  const conversation = conversations.find((c) => c.id === conversationId);
  const typing = typingUsers[conversationId] || [];

  const resolvedUserType = (userType === 'standalone_doctor' ? 'doctor' : 'patient') as 'doctor' | 'patient';

  // Get the other person's name for the header
  const otherName = resolvedUserType === 'patient'
    ? conversation?.doctor?.name || 'Doctor'
    : conversation?.patient?.name || 'Patient';

  useEffect(() => {
    if (!connected) connect();
    setActiveConversation(conversationId);
    loadMessages(conversationId, resolvedUserType);
    markRead(conversationId, resolvedUserType);

    return () => {
      setActiveConversation(null);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [conversationId]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    sendMessage(conversationId, text);
    setInputText('');
    stopTyping(conversationId);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [inputText, conversationId]);

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);

    if (text.trim()) {
      startTyping(conversationId);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        stopTyping(conversationId);
      }, 3000);
    } else {
      stopTyping(conversationId);
    }
  }, [conversationId]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadMessages(conversationId, resolvedUserType, true);
    }
  }, [isLoading, hasMore, conversationId, resolvedUserType]);

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

  // Check if we should show a date separator before this message
  const shouldShowDate = (index: number) => {
    if (index === chatMessages.length - 1) return true;
    const current = new Date(chatMessages[index].createdAt).toDateString();
    const next = new Date(chatMessages[index + 1].createdAt).toDateString();
    return current !== next;
  };

  const isMyMessage = (msg: Message) => {
    return msg.senderType === resolvedUserType;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = isMyMessage(item);
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
          <View
            style={[
              styles.messageBubble,
              mine
                ? [styles.myBubble, { backgroundColor: colors.primary }]
                : [styles.theirBubble, { backgroundColor: colors.background, borderColor: colors.border }],
              item.pending && { opacity: 0.6 },
              item.failed && { borderColor: colors.error, borderWidth: 1 },
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
                  ? <CheckCheck size={14} color={mine ? 'rgba(255,255,255,0.7)' : colors.primary} style={{ marginLeft: 4 }} />
                  : <Check size={14} color={mine ? 'rgba(255,255,255,0.7)' : colors.textSecondary} style={{ marginLeft: 4 }} />
              )}
              {item.failed && (
                <Text style={[styles.failedText, { color: colors.error }]}> Failed</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {otherName}
          </Text>
          {typing.length > 0 && (
            <Text style={[styles.typingText, { color: colors.primary }]}>typing...</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
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
          ListFooterComponent={
            isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ padding: Spacing.md }} />
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyChat}>
                <Text style={[styles.emptyChatText, { color: colors.textSecondary }]}>
                  No messages yet. Say hello!
                </Text>
              </View>
            ) : null
          }
        />

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
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: { padding: Spacing.xs },
  headerInfo: { flex: 1, marginLeft: Spacing.sm },
  headerName: { fontSize: 18, fontWeight: '600' },
  typingText: { fontSize: 12, fontStyle: 'italic' },
  chatArea: { flex: 1 },
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
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: { fontSize: 11 },
  failedText: { fontSize: 11, fontWeight: '600' },
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
    transform: [{ scaleY: -1 }], // Because FlatList is inverted
  },
  emptyChatText: { fontSize: 14 },
});
