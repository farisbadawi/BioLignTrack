import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Paperclip, AlertCircle, Clock, ArrowLeft, User } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { router } from 'expo-router';

// Patient List Component for Doctors
function PatientListView() {
  const { assignedPatients, messages } = usePatientStore();

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

  const PatientChatItem = ({ patient }: { patient: any }) => {
    const lastMessage = getLastMessage(patient.id);
    const unreadCount = getUnreadCount(patient.id);

    return (
      <TouchableOpacity 
        style={styles.patientChatItem}
        onPress={() => {
          // Navigate to chat with this patient
          router.push(`/chat/${patient.id}`);
        }}
      >
        <View style={styles.patientAvatar}>
          <Text style={styles.patientInitials}>
            {patient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA'}
          </Text>
        </View>
        
        <View style={styles.patientChatInfo}>
          <View style={styles.patientChatHeader}>
            <Text style={styles.patientName}>{patient.name}</Text>
            {lastMessage && (
              <Text style={styles.messageTime}>
                {new Date(lastMessage.created_at).toLocaleDateString()}
              </Text>
            )}
          </View>
          
          <View style={styles.patientChatPreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {lastMessage ? lastMessage.content : 'No messages yet'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.patientStatus}>
            <Text style={styles.patientTrayInfo}>
              Tray {patient.patientData?.current_tray || 1} of {patient.patientData?.total_trays || 24}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>
          {assignedPatients.length} patients
        </Text>
      </View>

      <View style={styles.patientsList}>
        {assignedPatients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <User size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No patients yet</Text>
            <Text style={styles.emptySubtitle}>
              Invite patients to start messaging
            </Text>
          </Card>
        ) : (
          assignedPatients.map((patient) => (
            <PatientChatItem key={patient.id} patient={patient} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// Direct Chat Component for Patients
function DirectChatView() {
  const { messages, addMessage, markMessagesRead, patient, assignedDoctor } = usePatientStore();
  const [newMessage, setNewMessage] = useState('');

  React.useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      addMessage(newMessage.trim(), 'patient');
      setNewMessage('');
    }
  };

  const quickTemplates = [
    { id: 'fit', text: 'I\'m having trouble with the fit of my current tray', icon: AlertCircle },
    { id: 'lost', text: 'I lost or broke my aligner', icon: AlertCircle },
    { id: 'pain', text: 'I\'m experiencing discomfort', icon: AlertCircle },
    { id: 'question', text: 'I have a general question', icon: Clock },
  ];

  const MessageBubble = ({ message }: { message: any }) => {
    const isPatient = message.sender === 'patient';
    
    return (
      <View style={[styles.messageBubble, isPatient ? styles.patientMessage : styles.doctorMessage]}>
        <Text style={[styles.messageText, isPatient ? styles.patientMessageText : styles.doctorMessageText]}>
          {message.content}
        </Text>
        <Text style={[styles.messageTime, isPatient ? styles.patientMessageTime : styles.doctorMessageTime]}>
          {new Date(message.createdAt).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.chatContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatTitle}>
            {assignedDoctor ? assignedDoctor.name : 'Your Orthodontist'}
          </Text>
          <View style={styles.statusIndicator}>
            <View style={styles.onlineIndicator} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
      </View>

      {/* Context Card */}
      <Card style={styles.contextCard}>
        <Text style={styles.contextTitle}>Current Status</Text>
        <View style={styles.contextInfo}>
          <Text style={styles.contextItem}>Tray {patient?.current_tray} of {patient?.total_trays}</Text>
          <Text style={styles.contextItem}>22h daily goal</Text>
          <Text style={styles.contextItem}>Last fit check: Good</Text>
        </View>
      </Card>

      {/* Messages */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.messagesList}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </View>
      </ScrollView>

      {/* Quick Templates */}
      <View style={styles.templatesContainer}>
        <Text style={styles.templatesTitle}>Quick Messages</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
          {quickTemplates.map((template) => {
            const Icon = template.icon;
            
            return (
              <TouchableOpacity
                key={template.id}
                style={styles.templateButton}
                onPress={() => setNewMessage(template.text)}
              >
                <Icon size={16} color={Colors.textSecondary} />
                <Text style={styles.templateText}>
                  {template.text.split(' ').slice(0, 3).join(' ')}...
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.attachButton}>
            <Paperclip size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <Send size={20} color={Colors.background} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Main Messages Screen Component
export default function MessagesScreen() {
  const { userRole } = usePatientStore();

  return (
    <SafeAreaView style={styles.container}>
      {userRole === 'doctor' ? <PatientListView /> : <DirectChatView />}
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
  patientsList: {
    marginBottom: Spacing.xl,
  },
  patientChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  patientInitials: {
    color: Colors.background,
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
    color: Colors.textPrimary,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  unreadText: {
    color: Colors.background,
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
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
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
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  contextCard: {
    marginVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  contextInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contextItem: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  doctorMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  patientMessageText: {
    color: Colors.background,
  },
  doctorMessageText: {
    color: Colors.textPrimary,
  },
  patientMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  doctorMessageTime: {
    color: Colors.textSecondary,
  },
  templatesContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  templatesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    backgroundColor: Colors.background,
  },
  templateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    maxHeight: 100,
    minHeight: 20,
  },
  attachButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});