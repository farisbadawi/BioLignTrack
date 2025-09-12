import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Shield, Download, HelpCircle, LogOut, ChevronRight, Settings } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';

export default function ProfileScreen() {
  const { patient, profile, userRole, signOut } = usePatientStore();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [reminderEnabled, setReminderEnabled] = React.useState(true);

  if (!profile) return null;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              console.log('Signing out...');
              await signOut();
              console.log('Sign out completed');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDataExport = () => {
    Alert.alert(
      'Export Data',
      'Your treatment data will be prepared and sent to your email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('Export data') },
      ]
    );
  };

  const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.sectionCard}>
        {children}
      </Card>
    </View>
  );

  const SettingRow = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Icon size={20} color={Colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (onPress && <ChevronRight size={20} color={Colors.textSecondary} />)}
    </TouchableOpacity>
  );

  const getRoleDisplayName = () => {
    return userRole === 'doctor' ? 'Doctor' : 'Patient';
  };

  const getDisplayName = () => {
    if (userRole === 'doctor') {
      return profile.name;
    }
    return patient?.name || profile.name;
  };

  const getDisplayEmail = () => {
    return patient?.email || profile.email;
  };

  const getTreatmentInfo = () => {
    if (userRole === 'patient' && patient) {
      return `Tray ${patient.current_tray} of ${patient.total_trays} • Active Treatment`;
    } else if (userRole === 'doctor') {
      return 'Managing patient treatments';
    }
    return 'Account active';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info */}
        <Card style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <User size={32} color={Colors.primary} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{getDisplayName()}</Text>
              <Text style={styles.userEmail}>{getDisplayEmail()}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{getRoleDisplayName()}</Text>
              </View>
              <Text style={styles.userStatus}>
                {getTreatmentInfo()}
              </Text>
            </View>
          </View>
          
          {/* Treatment Progress - Only for patients */}
          {userRole === 'patient' && patient && (
            <View style={styles.treatmentProgress}>
              <Text style={styles.progressLabel}>Treatment Progress</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(patient.current_tray / patient.total_trays) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round((patient.current_tray / patient.total_trays) * 100)}% Complete
              </Text>
            </View>
          )}
        </Card>

        {/* Notifications */}
        <ProfileSection title="Notifications">
          <SettingRow
            icon={Bell}
            title="Push Notifications"
            subtitle="Receive reminders and updates"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.background}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon={Bell}
            title="Daily Reminders"
            subtitle={userRole === 'doctor' ? "Remind about patient check-ins" : "Remind me to wear my aligners"}
            rightElement={
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.background}
              />
            }
          />
        </ProfileSection>

        {/* Account Settings */}
        <ProfileSection title={userRole === 'doctor' ? "Practice Settings" : "Treatment Settings"}>
          {userRole === 'patient' && patient && (
            <>
              <SettingRow
                icon={Settings}
                title="Daily Goal"
                subtitle={`${patient.target_hours_per_day} hours per day`}
                onPress={() => {
                  Alert.alert('Daily Goal', 'Contact your orthodontist to adjust your daily wear goal.');
                }}
              />
              <View style={styles.divider} />
            </>
          )}
          <SettingRow
            icon={Download}
            title="Export Data"
            subtitle={userRole === 'doctor' ? "Download practice data" : "Download your treatment history"}
            onPress={handleDataExport}
          />
        </ProfileSection>

        {/* Privacy & Security */}
        <ProfileSection title="Privacy & Security">
          <SettingRow
            icon={Shield}
            title="Privacy Policy"
            subtitle="How we protect your data"
            onPress={() => {
              Alert.alert('Privacy Policy', 'Our privacy policy ensures your medical data is protected and encrypted.');
            }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={Shield}
            title="Data Security"
            subtitle="Your information is encrypted"
            onPress={() => {
              Alert.alert('Data Security', 'All your data is encrypted with industry-standard security protocols.');
            }}
          />
        </ProfileSection>

        {/* Support */}
        <ProfileSection title="Support">
          <SettingRow
            icon={HelpCircle}
            title="Help Center"
            subtitle="FAQs and guides"
            onPress={() => {
              Alert.alert('Help Center', 'Visit our help center for frequently asked questions and treatment guides.');
            }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={HelpCircle}
            title="Contact Support"
            subtitle="Get help from our team"
            onPress={() => {
              Alert.alert('Contact Support', 'Call us at (555) 123-4567 or email support@biolign.com for assistance.');
            }}
          />
        </ProfileSection>

        {/* Sign Out */}
        <Card style={styles.logoutCard}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>BioLign Progress v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2024 BioLign Orthodontics</Text>
          <Text style={styles.appInfoText}>Role: {getRoleDisplayName()}</Text>
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
  },
  userCard: {
    marginBottom: Spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  roleText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
  },
  userStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  treatmentProgress: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionCard: {
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.md + 40 + Spacing.sm,
  },
  logoutCard: {
    marginBottom: Spacing.lg,
    padding: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  appInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
});