// app/(patient)/profile.tsx - Patient Profile & Settings Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Bell,
  Shield,
  Download,
  HelpCircle,
  LogOut,
  ChevronRight,
  Settings,
  Moon,
  Sun,
  Globe,
  Clock,
  Volume2,
  Vibrate,
  Mail,
  MessageSquare,
  Calendar,
  TrendingUp,
  X,
  Check,
  AlertTriangle,
  Phone,
  Smartphone,
  Building2,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CodeInput } from '@/components/CodeInput';
import { useCustomAlert } from '@/components/CustomAlert';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';

// Time picker modal component
const TimePickerModal = ({
  visible,
  onClose,
  onSave,
  times,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (times: string[]) => void;
  times: string[];
}) => {
  const [selectedTimes, setSelectedTimes] = useState<string[]>(times);
  const { colors: themeColors } = useTheme();
  const availableTimes = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00',
  ];

  const toggleTime = (time: string) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter(t => t !== time));
    } else if (selectedTimes.length < 5) {
      setSelectedTimes([...selectedTimes, time].sort());
    }
  };

  const formatTime = (time: string) => {
    const [hours] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:00 ${ampm}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Reminder Times</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>Select up to 5 reminder times</Text>
          <View style={styles.timeGrid}>
            {availableTimes.map(time => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  { borderColor: themeColors.border, backgroundColor: themeColors.surface },
                  selectedTimes.includes(time) && [
                    styles.timeChipSelected,
                    { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                  ],
                ]}
                onPress={() => toggleTime(time)}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    { color: themeColors.textPrimary },
                    selectedTimes.includes(time) && styles.timeChipTextSelected,
                  ]}
                >
                  {formatTime(time)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title="Save"
              onPress={() => {
                onSave(selectedTimes);
                onClose();
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function PatientProfileScreen() {
  const {
    patient,
    profile,
    userType,
    signOut,
    assignedDoctor,
    linkedPracticeName,
    joinDoctorByCode,
    getComplianceStats,
    dailyLogs,
    trayChanges,
  } = usePatientStore();

  // Local state for notification settings (will be stored in API later)
  const [notificationSettings, setNotificationSettings] = useState({
    push_enabled: true,
    email_enabled: true,
    message_notifications: true,
    wear_reminders: true,
    wear_reminder_times: ['09:00', '14:00', '21:00'],
    tray_change_reminders: true,
    appointment_reminders: true,
    weekly_summary: true,
  });

  // Local state for user settings
  const [userSettings, setUserSettings] = useState({
    language: 'en',
    time_format: '12h',
    haptic_feedback: true,
    sound_enabled: true,
  });

  const [doctorCodeInput, setDoctorCodeInput] = useState('');
  const [isLinkingDoctor, setIsLinkingDoctor] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();
  const { theme, isDark, colors: themeColors, setTheme } = useTheme();
  const { requestPermission, checkPermission, cancelAll } = useNotifications();

  const handleLinkDoctor = async () => {
    if (!doctorCodeInput.trim()) {
      showAlert({
        title: 'Error',
        message: 'Please enter a code',
        type: 'error',
      });
      return;
    }

    setIsLinkingDoctor(true);
    try {
      const result = await joinDoctorByCode(doctorCodeInput.trim());
      if (result.success) {
        const message = result.type === 'pms'
          ? 'Your account is now linked to your clinic!'
          : 'You are now linked to your doctor!';
        showAlert({
          title: 'Success!',
          message,
          type: 'success',
        });
        setDoctorCodeInput('');
      } else {
        showAlert({
          title: 'Error',
          message: result.error || 'Invalid code. Please check and try again.',
          type: 'error',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Something went wrong',
        type: 'error',
      });
    } finally {
      setIsLinkingDoctor(false);
    }
  };

  const handleNotificationSettingChange = async (
    key: string,
    value: boolean | string | string[] | number
  ) => {
    // If enabling a notification setting, request permission first
    if (value === true && (key === 'wear_reminders' || key === 'tray_change_reminders' || key === 'message_notifications')) {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          showAlert({
            title: 'Notifications Disabled',
            message: 'Please enable notifications in your device settings to receive reminders.',
            type: 'warning',
          });
          return; // Don't save the setting if permission wasn't granted
        }
      }
    }

    // Update local state (would save to API in production)
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleUserSettingChange = async (
    key: string,
    value: boolean | string
  ) => {
    // Update local state (would save to API in production)
    setUserSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!profile) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: themeColors.surface }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel all scheduled notifications on sign out
              await cancelAll();
              await signOut();
            } catch (error) {
              showAlert({
                title: 'Error',
                message: 'Failed to sign out. Please try again.',
                type: 'error',
              });
            }
          },
        },
      ],
    });
  };

  const handleDataExport = () => {
    showAlert({
      title: 'Export Data',
      message: 'Your treatment data will be prepared and sent to your email address.',
      type: 'info',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            showAlert({
              title: 'Export Started',
              message: 'Your data export is being prepared. You will receive an email shortly.',
              type: 'success',
            });
          },
        },
      ],
    });
  };

  const ProfileSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{title}</Text>
      <Card style={styles.sectionCard}>{children}</Card>
    </View>
  );

  const SettingRow = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    rightElement,
    danger,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: themeColors.surface }, danger && styles.settingIconDanger]}>
          <Icon size={20} color={danger ? themeColors.error : themeColors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: danger ? themeColors.error : themeColors.textPrimary }]}>
            {title}
          </Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: themeColors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (onPress && <ChevronRight size={20} color={themeColors.textSecondary} />)}
    </TouchableOpacity>
  );

  const getRoleDisplayName = () => {
    return 'Patient';
  };

  const getDisplayName = () => {
    return patient?.name || profile?.name || 'Patient';
  };

  const getDisplayEmail = () => {
    return patient?.email || profile?.email || '';
  };

  const getTreatmentInfo = () => {
    if (userType === 'standalone_patient' && patient) {
      return `Aligner ${patient.currentTray} of ${patient.totalTrays}`;
    }
    return 'Account active';
  };

  const complianceStats = userType === 'standalone_patient' ? getComplianceStats() : null;

  // Calculate incremental treatment progress based on qualifying days
  const calculateTreatmentProgress = () => {
    if (!patient) return 0;
    const currentTrayChange = trayChanges.find(change => change.toTray === patient.currentTray);
    const trayStartDate = currentTrayChange ? new Date(currentTrayChange.changeDate).toISOString().split('T')[0] : null;
    const targetHours = (patient.dailyWearTarget || 1320) / 60;
    const targetSeconds = targetHours * 3600;
    const minimumSecondsForDay = targetSeconds * 0.5;
    const recommendedDays = 14;

    // Helper to get seconds from log (uses wearSeconds if available, otherwise wearMinutes * 60)
    const getLogSeconds = (log: any) => {
      if (log.wearSeconds != null) return log.wearSeconds;
      return (log.wearMinutes || 0) * 60;
    };

    const qualifyingDaysWorn = trayStartDate
      ? dailyLogs.filter(log => {
          if (log.date < trayStartDate) return false;
          return getLogSeconds(log) >= minimumSecondsForDay;
        }).length
      : 0;

    const completedAligners = patient.currentTray - 1;
    const currentAlignerProgress = Math.min(qualifyingDaysWorn / recommendedDays, 1);
    return ((completedAligners + currentAlignerProgress) / patient.totalTrays) * 100;
  };

  const treatmentProgress = calculateTreatmentProgress();

  const formatReminderTimes = (times: string[] | undefined) => {
    if (!times || times.length === 0) return 'Not set';
    return times
      .map(t => {
        const [hours] = t.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}${ampm}`;
      })
      .join(', ');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.surface }]} edges={['top', 'left', 'right']}>
      <AlertComponent />
      <TimePickerModal
        visible={showTimePickerModal}
        onClose={() => setShowTimePickerModal(false)}
        times={notificationSettings?.wear_reminder_times || ['09:00', '14:00', '21:00']}
        onSave={times => handleNotificationSettingChange('wear_reminder_times', times)}
      />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: themeColors.surface }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>Profile & Settings</Text>
            <View style={{ height: 3, width: 40, backgroundColor: themeColors.primary, borderRadius: 2 }} />
          </View>
          {savingSettings && (
            <ActivityIndicator size="small" color={themeColors.primary} />
          )}
        </View>

        {/* User Info Card */}
        <Card style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: themeColors.surface }]}>
              <User size={32} color={themeColors.primary} />
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{getDisplayName()}</Text>
              <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>{getDisplayEmail()}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{getRoleDisplayName()}</Text>
              </View>
              <Text style={[styles.userStatus, { color: themeColors.textSecondary }]}>{getTreatmentInfo()}</Text>
            </View>
          </View>

          {/* Treatment Progress - Only for patients */}
          {userType === 'standalone_patient' && patient && (
            <View style={styles.treatmentProgress}>
              <Text style={styles.progressLabel}>Treatment Progress</Text>
              <View style={[styles.progressBar, { backgroundColor: themeColors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${treatmentProgress}%` },
                  ]}
                />
              </View>
              <View style={styles.progressStats}>
                <Text style={[styles.progressText, { color: themeColors.textSecondary }]}>
                  {Math.round(treatmentProgress)}% Complete
                </Text>
                {complianceStats && complianceStats.streak > 0 && (
                  <Text style={styles.streakText}>{complianceStats.streak} day streak</Text>
                )}
              </View>
            </View>
          )}

          {/* Compliance Stats for patients */}
          {userType === 'standalone_patient' && complianceStats && (
            <>
              <View style={[styles.statsRow, { borderTopColor: themeColors.border }]}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{complianceStats.weeklyAverage}h</Text>
                  <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>7-Day Avg</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{complianceStats.monthlyAverage}h</Text>
                  <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>30-Day Avg</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{patient?.currentTray || 1}</Text>
                  <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Current Tray</Text>
                </View>
              </View>
              <Text style={[styles.statsNote, { color: themeColors.textSecondary }]}>
                Rolling averages based on the last 7 or 30 days (or since your first log if shorter). Days without wear = 0h.
              </Text>
            </>
          )}
        </Card>

        {/* Practice Section - For PMS-linked patients */}
        {userType === 'linked' && linkedPracticeName && (
          <ProfileSection title="Your Practice">
            <View style={styles.doctorLinkSection}>
              <View style={styles.linkedDoctorInfo}>
                <View style={styles.linkedDoctorAvatar}>
                  <Building2 size={24} color={Colors.background} />
                </View>
                <View style={styles.linkedDoctorDetails}>
                  <Text style={[styles.linkedDoctorName, { color: themeColors.textPrimary }]}>{linkedPracticeName}</Text>
                </View>
              </View>
            </View>
          </ProfileSection>
        )}

        {/* Link to Doctor Section - For Patients */}
        {userType === 'standalone_patient' && (
          <ProfileSection title="Your Doctor">
            <View style={styles.doctorLinkSection}>
              {assignedDoctor ? (
                <View style={styles.linkedDoctorInfo}>
                  <View style={styles.linkedDoctorAvatar}>
                    <User size={24} color={Colors.background} />
                  </View>
                  <View style={styles.linkedDoctorDetails}>
                    <Text style={[styles.linkedDoctorName, { color: themeColors.textPrimary }]}>{assignedDoctor.name}</Text>
                    {assignedDoctor.phone && (
                      <Text style={[styles.linkedDoctorPhone, { color: themeColors.textSecondary }]}>{assignedDoctor.phone}</Text>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.linkDoctorForm}>
                  <Text style={[styles.linkDoctorLabel, { color: themeColors.textSecondary, textAlign: 'center' }]}>
                    Enter your invite code or doctor code to link your account:
                  </Text>
                  <View style={styles.codeInputWrapper}>
                    <CodeInput
                      value={doctorCodeInput}
                      onChange={setDoctorCodeInput}
                      length={6}
                    />
                  </View>
                  <Button
                    title={isLinkingDoctor ? 'Linking...' : 'Link Account'}
                    onPress={handleLinkDoctor}
                    disabled={isLinkingDoctor || doctorCodeInput.length !== 6}
                    style={styles.linkButton}
                  />
                </View>
              )}
            </View>
          </ProfileSection>
        )}

        {/* Notifications Section */}
        <ProfileSection title="Notifications">
          <SettingRow
            icon={Bell}
            title="Push Notifications"
            subtitle="Receive all app notifications"
            rightElement={
              <Switch
                value={notificationSettings?.push_enabled ?? true}
                onValueChange={value => handleNotificationSettingChange('push_enabled', value)}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={themeColors.background}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={Mail}
            title="Email Notifications"
            subtitle="Receive email updates and summaries"
            rightElement={
              <Switch
                value={notificationSettings?.email_enabled ?? true}
                onValueChange={value => handleNotificationSettingChange('email_enabled', value)}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={themeColors.background}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={MessageSquare}
            title="Message Notifications"
            subtitle="Get notified of new messages"
            rightElement={
              <Switch
                value={notificationSettings?.message_notifications ?? true}
                onValueChange={value =>
                  handleNotificationSettingChange('message_notifications', value)
                }
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={themeColors.background}
              />
            }
          />
          {userType === 'standalone_patient' && (
            <>
              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
              <SettingRow
                icon={Clock}
                title="Wear Reminders"
                subtitle={
                  notificationSettings?.wear_reminders
                    ? formatReminderTimes(notificationSettings?.wear_reminder_times)
                    : 'Disabled'
                }
                rightElement={
                  <Switch
                    value={notificationSettings?.wear_reminders ?? true}
                    onValueChange={value =>
                      handleNotificationSettingChange('wear_reminders', value)
                    }
                    trackColor={{ false: themeColors.border, true: themeColors.primary }}
                    thumbColor={themeColors.background}
                  />
                }
              />
              {notificationSettings?.wear_reminders && (
                <>
                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                  <SettingRow
                    icon={Clock}
                    title="Reminder Times"
                    subtitle={formatReminderTimes(notificationSettings?.wear_reminder_times)}
                    onPress={() => setShowTimePickerModal(true)}
                  />
                </>
              )}
              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
              <SettingRow
                icon={AlertTriangle}
                title="Tray Change Reminders"
                subtitle="Get reminded when it's time to change aligners"
                rightElement={
                  <Switch
                    value={notificationSettings?.tray_change_reminders ?? true}
                    onValueChange={value =>
                      handleNotificationSettingChange('tray_change_reminders', value)
                    }
                    trackColor={{ false: themeColors.border, true: themeColors.primary }}
                    thumbColor={themeColors.background}
                  />
                }
              />
            </>
          )}
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={Calendar}
            title="Appointment Reminders"
            subtitle="Reminders before scheduled appointments"
            rightElement={
              <Switch
                value={notificationSettings?.appointment_reminders ?? true}
                onValueChange={value =>
                  handleNotificationSettingChange('appointment_reminders', value)
                }
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={themeColors.background}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={TrendingUp}
            title="Weekly Summary"
            subtitle="Receive weekly progress reports"
            rightElement={
              <Switch
                value={notificationSettings?.weekly_summary ?? true}
                onValueChange={value => handleNotificationSettingChange('weekly_summary', value)}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={themeColors.background}
              />
            }
          />
        </ProfileSection>

        {/* Preferences Section */}
        <ProfileSection title="Preferences">
          <SettingRow
            icon={isDark ? Moon : Sun}
            title="Theme"
            subtitle={`${theme === 'system' ? 'System Default' : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}`}
            onPress={() => {
              const themes = ['light', 'dark', 'system'] as const;
              const currentIndex = themes.indexOf(theme);
              const nextTheme = themes[(currentIndex + 1) % themes.length];
              setTheme(nextTheme);
            }}
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={Globe}
            title="Language"
            subtitle={userSettings?.language === 'en' ? 'English' : userSettings?.language || 'English'}
            onPress={() => {
              showAlert({
                title: 'Language',
                message: 'Language selection coming soon. Currently only English is supported.',
                type: 'info',
              });
            }}
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={Clock}
            title="Time Format"
            subtitle={userSettings?.time_format === '24h' ? '24-hour (14:00)' : '12-hour (2:00 PM)'}
            onPress={() => {
              const newFormat = userSettings?.time_format === '24h' ? '12h' : '24h';
              handleUserSettingChange('time_format', newFormat);
            }}
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={Vibrate}
            title="Haptic Feedback"
            subtitle="Vibrate on actions"
            rightElement={
              <Switch
                value={userSettings?.haptic_feedback ?? true}
                onValueChange={value => handleUserSettingChange('haptic_feedback', value)}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={themeColors.background}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={Volume2}
            title="Sound Effects"
            subtitle="Play sounds for notifications"
            rightElement={
              <Switch
                value={userSettings?.sound_enabled ?? true}
                onValueChange={value => handleUserSettingChange('sound_enabled', value)}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={themeColors.background}
              />
            }
          />
        </ProfileSection>

        {/* Treatment Settings - Only for patients */}
        {userType === 'standalone_patient' && patient && (
          <ProfileSection title="Treatment Settings">
            <SettingRow
              icon={Settings}
              title="Daily Wear Goal"
              subtitle={`${Math.round((patient.dailyWearTarget || 1320) / 60)} hours per day`}
              onPress={() => {
                showAlert({
                  title: 'Daily Wear Goal',
                  message:
                    'Your daily wear goal is set by your orthodontist. Contact them to adjust this setting.',
                  type: 'info',
                });
              }}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingRow
              icon={Download}
              title="Export Treatment Data"
              subtitle="Download your complete treatment history"
              onPress={handleDataExport}
            />
          </ProfileSection>
        )}

        {/* Privacy & Security */}
        <ProfileSection title="Privacy & Security">
          <SettingRow
            icon={Shield}
            title="Privacy Policy"
            subtitle="How we protect your data"
            onPress={() => {
              showAlert({
                title: 'Privacy Policy',
                message:
                  'BioLign is committed to protecting your health information. Your data is encrypted in transit using TLS and at rest using AES-256 encryption. We implement role-based access controls so only you and your authorized healthcare providers can access your data.',
                type: 'info',
              });
            }}
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={Shield}
            title="Data Security"
            subtitle="Your information is encrypted"
            onPress={() => {
              showAlert({
                title: 'Data Security',
                message:
                  'Your data is protected with:\n\n• TLS encryption for all data in transit\n• AES-256 encryption for stored data\n• Row-level security policies\n• Secure authentication\n\nFor HIPAA compliance in a production environment, additional configuration may be required.',
                type: 'info',
              });
            }}
          />
        </ProfileSection>

        {/* Support */}
        <ProfileSection title="Support">
          <SettingRow
            icon={HelpCircle}
            title="Help Center"
            subtitle="FAQs and treatment guides"
            onPress={() => {
              showAlert({
                title: 'Help Center',
                message:
                  'Visit our help center at help.biolign.com for frequently asked questions, treatment guides, and troubleshooting tips.',
                type: 'info',
              });
            }}
          />
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <SettingRow
            icon={Phone}
            title="Contact Support"
            subtitle="Get help from our team"
            onPress={() => {
              showAlert({
                title: 'Contact Support',
                message:
                  'Email: support@biolign.com\nPhone: 1-800-BIOLIGN (1-800-246-5446)\n\nSupport hours: Mon-Fri 8am-8pm EST',
                type: 'info',
              });
            }}
          />
        </ProfileSection>

        {/* Sign Out */}
        <Card style={styles.logoutCard}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={themeColors.error} />
            <Text style={[styles.logoutText, { color: themeColors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: themeColors.textSecondary }]}>BioLign Progress v1.0.0</Text>
          <Text style={[styles.appInfoText, { color: themeColors.textSecondary }]}>2024 BioLign Orthodontics</Text>
          <Text style={[styles.appInfoText, { color: themeColors.textSecondary }]}>
            Account: {getRoleDisplayName()} | ID: {String(profile?.id || '').slice(0, 8) || 'N/A'}
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: Spacing.sm,
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
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  streakText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  statsNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
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
  settingIconDanger: {
    backgroundColor: Colors.error + '15',
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
  settingTitleDanger: {
    color: Colors.error,
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
  doctorCodeSection: {
    padding: Spacing.md,
  },
  doctorCodeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  doctorCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  doctorCodeText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
  },
  doctorLinkSection: {
    padding: Spacing.md,
  },
  linkedDoctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  linkedDoctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkedDoctorDetails: {
    flex: 1,
  },
  linkedDoctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  linkedDoctorEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  linkedDoctorPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  linkDoctorForm: {
    alignItems: 'center',
  },
  linkDoctorLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  codeInputWrapper: {
    marginVertical: Spacing.md,
  },
  linkButton: {
    minWidth: 140,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  timeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  timeChipTextSelected: {
    color: Colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
