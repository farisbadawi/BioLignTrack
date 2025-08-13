import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Paperclip, AlertCircle, Clock } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { Message } from '@/types';

export default function MessagesScreen() {
  const { messages, addMessage, markMessagesRead, patient } = usePatientStore();
  const [newMessage, setNewMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  React.useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      addMessage(newMessage.trim(), 'patient');
      setNewMessage('');
      setSelectedTemplate(null);
    }
  };

  const quickTemplates = [
    { id: 'fit', text: 'I&apos;m having trouble with the fit of my current tray', icon: AlertCircle },
    { id: 'lost', text: 'I lost or broke my aligner', icon: AlertCircle },
    { id: 'pain', text: 'I&apos;m experiencing discomfort', icon: AlertCircle },
    { id: 'question', text: 'I have a general question', icon: Clock },
  ];

  const handleTemplateSelect = (template: typeof quickTemplates[0]) => {
    setSelectedTemplate(template.id);
    setNewMessage(template.text);
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isPatient = message.sender === 'patient';
    
    return (
      <View style={[styles.messageBubble, isPatient ? styles.patientMessage : styles.doctorMessage]}>
        <Text style={[styles.messageText, isPatient ? styles.patientMessageText : styles.doctorMessageText]}>
          {message.content}
        </Text>
        <Text style={[styles.messageTime, isPatient ? styles.patientMessageTime : styles.doctorMessageTime]}>
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>Chat with your orthodontist</Text>
          </View>
          <View style={styles.statusIndicator}>
            <View style={styles.onlineIndicator} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
          {/* Context Card */}
          <Card style={styles.contextCard}>
            <Text style={styles.contextTitle}>Current Status</Text>
            <View style={styles.contextInfo}>
              <Text style={styles.contextItem}>Tray {patient?.currentTray} of {patient?.totalTrays}</Text>
              <Text style={styles.contextItem}>22h daily goal</Text>
              <Text style={styles.contextItem}>Last fit check: Good</Text>
            </View>
          </Card>

          {/* Message List */}
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
              const isSelected = selectedTemplate === template.id;
              
              return (
                <TouchableOpacity
                  key={template.id}
                  style={[styles.templateButton, isSelected && styles.selectedTemplate]}
                  onPress={() => handleTemplateSelect(template)}
                >
                  <Icon size={16} color={isSelected ? Colors.background : Colors.textSecondary} />
                  <Text style={[styles.templateText, isSelected && styles.selectedTemplateText]}>
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
            <TouchableOpacity style={styles.attachButton} onPress={() => {
              Alert.alert('Attachment', 'Photo attachment feature coming soon!');
            }}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
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
  messageTime: {
    fontSize: 12,
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
  selectedTemplate: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  templateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  selectedTemplateText: {
    color: Colors.background,
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