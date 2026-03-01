import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Paperclip, AlertCircle, Clock, ArrowLeft, User, RefreshCw, Search, X } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

// Patient List Component for Doctors
function PatientListView() {
  const { assignedPatients, messages, loadAssignedPatients, loadMessages, profile } = usePatientStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useTheme();

  useEffect(() => {
    if (!profile) return;

    const patientSubscription = supabase
      .channel('doctor-patients-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'doctor_patients',
        filter: `doctor_id=eq.${profile.id}`
      }, () => {
        loadAssignedPatients();
      })
      .subscribe();

    const messageSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${profile.id}`
      }, () => {
        loadMessages();
      })
      .subscribe();

    return () => {
      patientSubscription.unsubscribe();
      messageSubscription.unsubscribe();
    };
  }, [profile, loadAssignedPatients, loadMessages]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAssignedPatients(), loadMessages()]);
    setRefreshing(false);
  };

  const getLastMessage = (patientId: string) => {
    const patientMessages = messages.filter(
      msg => msg.sender_id === patientId || msg.recipient_id === patientId
    );
    return patientMessages.length > 0 ? patientMessages[patientMessages.length - 1] : null;
  };

  const getUnreadCount = (patientId: string) => {
    return messages.filter(
      msg => msg.sender_id === patientId && !msg.read
    ).length;
  };

  // Filter patients by search
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return assignedPatients;
    const query = searchQuery.toLowerCase();
    return assignedPatients.filter(patient =>
      patient.name?.toLowerCase().includes(query)
    );
  }, [assignedPatients, searchQuery]);

  const PatientChatItem = ({ patient }: { patient: any }) => {
    const lastMessage = getLastMessage(patient.id);
    const unreadCount = getUnreadCount(patient.id);

    return (
      <TouchableOpacity
        style={[styles.patientChatItem, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => {
          router.push(`/chat/${patient.id}`);
        }}
      >
        <View style={[styles.patientAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.patientInitials, { color: colors.background }]}>
            {patient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA'}
          </Text>
        </View>

        <View style={styles.patientChatInfo}>
          <View style={styles.patientChatHeader}>
            <Text style={[styles.patientName, { color: colors.textPrimary }]}>{patient.name}</Text>
            {lastMessage && (
              <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
                {new Date(lastMessage.created_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          <View style={styles.patientChatPreview}>
            <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
              {lastMessage ? lastMessage.content : 'No messages yet'}
            </Text>
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
                <Text style={[styles.unreadText, { color: colors.background }]}>{unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.patientStatus}>
            <Text style={[styles.patientTrayInfo, { color: colors.textSecondary }]}>
              Tray {patient.patientData?.current_tray || 1} of {patient.patientData?.total_trays || 24}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Messages</Text>
            <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {assignedPatients.length} patients
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
      <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
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

      <View style={styles.patientsList}>
        {filteredPatients.length === 0 ? (
          <Card style={styles.emptyCard}>
            {searchQuery ? (
              <>
                <Search size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No results found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  No patients match "{searchQuery}"
                </Text>
              </>
            ) : (
              <>
                <User size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No patients yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Invite patients to start messaging
                </Text>
              </>
            )}
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <PatientChatItem key={patient.id} patient={patient} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// Direct Chat Component for Patients
function DirectChatView() {
  const { messages, markMessagesRead, patient, assignedDoctor, profile, loadMessages } = usePatientStore();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();

  useEffect(() => {
    if (profile && assignedDoctor) {
      loadChatMessages();
    }
  }, [profile, assignedDoctor]);

  useEffect(() => {
    if (!profile || !assignedDoctor) return;

    const subscription = supabase
      .channel('patient-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${profile.id}`
      }, async (payload) => {
        setChatMessages(prev => [...prev, payload.new]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        await markMessagesRead(assignedDoctor.id);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, assignedDoctor, markMessagesRead]);

  const loadChatMessages = async () => {
    if (!profile || !assignedDoctor) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${assignedDoctor.id}),and(sender_id.eq.${assignedDoctor.id},recipient_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setChatMessages(data);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
      await markMessagesRead(assignedDoctor.id);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile || !assignedDoctor || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          recipient_id: assignedDoctor.id,
          content: messageContent,
          read: false
        })
        .select()
        .single();

      if (error) {
        setNewMessage(messageContent);
        return;
      }

      if (data) {
        setChatMessages(prev => [...prev, data]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const quickTemplates = [
    { id: 'fit', text: 'I\'m having trouble with the fit of my current tray', icon: AlertCircle },
    { id: 'lost', text: 'I lost or broke my aligner', icon: AlertCircle },
    { id: 'pain', text: 'I\'m experiencing discomfort', icon: AlertCircle },
    { id: 'question', text: 'I have a general question', icon: Clock },
  ];

  const MessageBubble = ({ message }: { message: any }) => {
    const isOwnMessage = message.sender_id === profile?.id;

    return (
      <View style={[
        styles.messageBubble,
        isOwnMessage
          ? [styles.patientMessage, { backgroundColor: colors.primary }]
          : [styles.doctorMessage, { backgroundColor: colors.background, borderColor: colors.border }]
      ]}>
        <Text style={[
          styles.messageText,
          { color: isOwnMessage ? colors.background : colors.textPrimary }
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.msgTime,
          { color: isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary,
            textAlign: isOwnMessage ? 'right' : 'left' }
        ]}>
          {new Date(message.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  };

  if (!assignedDoctor) {
    return (
      <View style={[styles.noDoctorContainer, { backgroundColor: colors.surface }]}>
        <User size={64} color={colors.textSecondary} />
        <Text style={[styles.noDoctorTitle, { color: colors.textPrimary }]}>No Doctor Linked</Text>
        <Text style={[styles.noDoctorSubtitle, { color: colors.textSecondary }]}>
          Enter your doctor's code in Profile settings to start messaging
        </Text>
        <TouchableOpacity
          style={[styles.goToProfileButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={[styles.goToProfileButtonText, { color: colors.background }]}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.chatContainer, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Chat Header */}
      <View style={[styles.chatHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.chatHeaderInfo}>
          <Text style={[styles.chatTitle, { color: colors.textPrimary }]}>
            {assignedDoctor ? assignedDoctor.name : 'Your Orthodontist'}
          </Text>
          <Text style={[styles.chatSubtitle, { color: colors.textSecondary }]}>
            {assignedDoctor?.practice_name || 'Send a message anytime'}
          </Text>
        </View>
      </View>

      {/* Context Card */}
      <Card style={styles.contextCard}>
        <Text style={[styles.contextTitle, { color: colors.textPrimary }]}>Your Treatment</Text>
        <View style={styles.contextInfo}>
          <Text style={[styles.contextItem, { color: colors.textSecondary, backgroundColor: colors.surface }]}>
            Tray {patient?.current_tray || 1} of {patient?.total_trays || '?'}
          </Text>
          <Text style={[styles.contextItem, { color: colors.textSecondary, backgroundColor: colors.surface }]}>
            {patient?.target_hours_per_day || 22}h daily goal
          </Text>
        </View>
      </Card>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.messagesList}>
          {chatMessages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text style={[styles.emptyMessagesText, { color: colors.textPrimary }]}>No messages yet</Text>
              <Text style={[styles.emptyMessagesSubtext, { color: colors.textSecondary }]}>Send a message to your doctor</Text>
            </View>
          ) : (
            chatMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Quick Templates */}
      <View style={[styles.templatesContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[styles.templatesTitle, { color: colors.textSecondary }]}>Quick Messages</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
          {quickTemplates.map((template) => {
            const Icon = template.icon;

            return (
              <TouchableOpacity
                key={template.id}
                style={[styles.templateButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setNewMessage(template.text)}
              >
                <Icon size={16} color={colors.textSecondary} />
                <Text style={[styles.templateText, { color: colors.textSecondary }]}>
                  {template.text.split(' ').slice(0, 3).join(' ')}...
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Message Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: (!newMessage.trim() || sending) ? colors.border : colors.primary }]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Send size={20} color={colors.background} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Main Messages Screen Component
export default function MessagesScreen() {
  const { userRole } = usePatientStore();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      {userRole === 'doctor' ? <PatientListView /> : <DirectChatView />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  header: {
    paddingVertical: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refreshButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyMessagesText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
  },
  patientsList: {
    marginBottom: Spacing.xl,
  },
  patientChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  patientInitials: {
    fontSize: 16,
    fontWeight: '600',
  },
  patientChatInfo: {
    flex: 1,
  },
  patientChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
  },
  patientChatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  patientStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientTrayInfo: {
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Direct chat styles
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  chatSubtitle: {
    fontSize: 14,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  contextCard: {
    marginVertical: Spacing.md,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  contextInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contextItem: {
    fontSize: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  messagesList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  patientMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  doctorMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  msgTime: {
    fontSize: 12,
  },
  templatesContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  templatesTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  templatesScroll: {
    flexDirection: 'row',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  templateText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDoctorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  noDoctorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  noDoctorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  goToProfileButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  goToProfileButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
