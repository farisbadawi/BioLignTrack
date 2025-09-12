// app/(tabs)/invite.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, Mail, Copy, Share as ShareIcon, Clock, CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function InviteScreen() {
  const { invitations, userRole, createPatientInvitation, loadInvitations } = usePatientStore();
  const [patientEmail, setPatientEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Only show this screen for doctors
  if (userRole !== 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access denied. This page is for doctors only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleInvitePatient = async () => {
    if (!patientEmail.trim()) {
      Alert.alert('Email Required', 'Please enter the patient\'s email address');
      return;
    }

    if (!patientEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const result = await createPatientInvitation(patientEmail.trim());
      
      if (result.success && result.invitationCode) {
        setPatientEmail('');
        Alert.alert(
          'Invitation Sent!',
          `Invitation code ${result.invitationCode} has been generated. Share this code with your patient.`,
          [
            {
              text: 'Share Code',
              onPress: () => handleShareInvitation(result.invitationCode!, patientEmail)
            },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create invitation');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareInvitation = async (code: string, email: string) => {
    const message = `You've been invited to join BioLign Progress for your orthodontic treatment tracking.\n\nInvitation Code: ${code}\n\nDownload the app and use this code to get started with tracking your aligner progress.`;
    
    try {
      await Share.share({
        message: message,
        title: 'BioLign Progress Invitation'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const copyToClipboard = (code: string) => {
    // In a real app, you'd use Clipboard.setString from @react-native-clipboard/clipboard
    Alert.alert('Copied!', `Invitation code ${code} copied to clipboard`);
  };

  const InvitationCard = ({ invitation }: { invitation: any }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'accepted': return Colors.success;
        case 'pending': return Colors.warning;
        case 'expired': return Colors.error;
        default: return Colors.textSecondary;
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'accepted': return CheckCircle;
        case 'pending': return Clock;
        default: return Clock;
      }
    };

    const StatusIcon = getStatusIcon(invitation.status);

    return (
      <Card style={styles.invitationCard}>
        <View style={styles.invitationHeader}>
          <View style={styles.invitationInfo}>
            <Text style={styles.patientEmail}>{invitation.patient_email}</Text>
            <Text style={styles.invitationCode}>Code: {invitation.invitation_code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invitation.status) + '20' }]}>
            <StatusIcon size={16} color={getStatusColor(invitation.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(invitation.status) }]}>
              {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.invitationActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => copyToClipboard(invitation.invitation_code)}
          >
            <Copy size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Copy Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleShareInvitation(invitation.invitation_code, invitation.patient_email)}
          >
            <ShareIcon size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.invitationDate}>
          Sent {new Date(invitation.created_at).toLocaleDateString()}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Invite Patients</Text>
          <Text style={styles.subtitle}>
            Send invitations to patients to join your practice
          </Text>
        </View>

        {/* Invite Form */}
        <Card style={styles.inviteCard}>
          <View style={styles.formHeader}>
            <UserPlus size={24} color={Colors.primary} />
            <Text style={styles.formTitle}>Send New Invitation</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Patient Email Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter patient's email address"
              value={patientEmail}
              onChangeText={setPatientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <Button
            title={loading ? 'Sending...' : 'Send Invitation'}
            onPress={handleInvitePatient}
            disabled={loading || !patientEmail.trim()}
            style={styles.sendButton}
          />
        </Card>

        {/* Instructions */}
        <Card style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How it works</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Enter the patient's email address and send an invitation
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Share the invitation code with your patient
              </Text>
            </View>
            
            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Patient downloads the app and enters the code to get started
              </Text>
            </View>
          </View>
        </Card>

        {/* Recent Invitations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Invitations</Text>
          
          {invitations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Mail size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No invitations sent yet</Text>
              <Text style={styles.emptySubtitle}>
                Start by sending your first patient invitation above
              </Text>
            </Card>
          ) : (
            invitations.slice(0, 10).map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
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
  inviteCard: {
    marginBottom: Spacing.lg,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: '100%',
  },
  instructionsCard: {
    marginBottom: Spacing.lg,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  instructionsList: {
    gap: Spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  invitationCard: {
    marginBottom: Spacing.sm,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  invitationInfo: {
    flex: 1,
  },
  patientEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  invitationCode: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invitationActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  invitationDate: {
    fontSize: 12,
    color: Colors.textSecondary,
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
});