// components/LogHoursModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePatientStore } from '@/stores/patient-store';
import { Spacing, BorderRadius } from '@/constants/colors';

interface LogHoursModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LogHoursModal({ visible, onClose }: LogHoursModalProps) {
  const { colors } = useTheme();
  const { patient, logHoursForDate, getLogForDate, dailyLogs } = usePatientStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const targetHours = patient?.dailyWearTarget ? patient.dailyWearTarget / 60 : 22;

  // Load existing hours when date changes
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const existingLog = getLogForDate(dateStr);
    if (existingLog) {
      setHours(existingLog.hours.toFixed(1));
    } else {
      setHours('');
    }
    setSaved(false);
  }, [selectedDate, dailyLogs]);

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);

    // Don't allow future dates
    if (newDate > new Date()) return;

    // Don't allow dates more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (newDate < thirtyDaysAgo) return;

    setSelectedDate(newDate);
  };

  const handleSave = async () => {
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
      return;
    }

    setSaving(true);
    // Use local date to match chart display (not UTC which could be next day)
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const result = await logHoursForDate(dateStr, hoursNum);
    setSaving(false);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const quickHours = [
    { label: '0h', value: 0 },
    { label: '18h', value: 18 },
    { label: '20h', value: 20 },
    { label: '22h', value: 22 },
    { label: '24h', value: 24 },
  ];

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isFuture = selectedDate > new Date();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Log Hours</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Date Selector */}
            <View style={styles.dateSelector}>
              <TouchableOpacity
                onPress={() => changeDate(-1)}
                style={[styles.dateArrow, { backgroundColor: colors.surface }]}
              >
                <ChevronLeft size={24} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.dateDisplay}>
                <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                  {formatDate(selectedDate)}
                </Text>
                <Text style={[styles.dateSubtext, { color: colors.textSecondary }]}>
                  {selectedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => changeDate(1)}
                style={[
                  styles.dateArrow,
                  { backgroundColor: colors.surface },
                  isToday && { opacity: 0.3 }
                ]}
                disabled={isToday}
              >
                <ChevronRight size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Hours Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Hours Worn
              </Text>
              <View style={styles.inputRow}>
                <Clock size={24} color={colors.primary} />
                <TextInput
                  style={[
                    styles.hoursInput,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      color: colors.textPrimary
                    }
                  ]}
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={4}
                />
                <Text style={[styles.hoursUnit, { color: colors.textSecondary }]}>
                  hours
                </Text>
              </View>
              <Text style={[styles.targetText, { color: colors.textSecondary }]}>
                Daily target: {targetHours} hours
              </Text>
            </View>

            {/* Quick Select */}
            <View style={styles.quickSection}>
              <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>
                Quick Select
              </Text>
              <View style={styles.quickButtons}>
                {quickHours.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.quickButton,
                      {
                        backgroundColor: hours === item.value.toString()
                          ? colors.primary
                          : colors.surface,
                        borderColor: colors.border,
                      }
                    ]}
                    onPress={() => setHours(item.value.toString())}
                  >
                    <Text style={[
                      styles.quickButtonText,
                      {
                        color: hours === item.value.toString()
                          ? colors.background
                          : colors.textPrimary
                      }
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info */}
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Manually log your aligner wear time for days you forgot to track,
              or adjust today's hours if the timer wasn't accurate.
            </Text>
          </ScrollView>

          {/* Save Button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: saved ? colors.success : colors.primary },
                (!hours || saving) && { opacity: 0.5 }
              ]}
              onPress={handleSave}
              disabled={!hours || saving}
            >
              {saved ? (
                <>
                  <Check size={20} color={colors.background} />
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>
                    Saved!
                  </Text>
                </>
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.background }]}>
                  {saving ? 'Saving...' : 'Save Hours'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  dateArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateSubtext: {
    fontSize: 14,
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hoursInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  hoursUnit: {
    fontSize: 18,
    fontWeight: '500',
  },
  targetText: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  quickSection: {
    marginBottom: Spacing.lg,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
