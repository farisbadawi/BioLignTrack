// app/patient/[id].tsx - Comprehensive Patient Detail Screen for Doctors
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  MessageCircle,
  Calendar,
  TrendingUp,
  Package,
  Clock,
  AlertCircle,
  ChevronRight,
  FileText,
  Plus,
  Flag,
  X,
  Check,
  Activity,
  Target,
  Award,
  CheckCircle,
  Camera,
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useCustomAlert } from '@/components/CustomAlert';
import { router, useLocalSearchParams } from 'expo-router';

// Note Modal Component
const AddNoteModal = ({
  visible,
  onClose,
  onSave,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string; note_type: string; is_flagged: boolean }) => void;
  loading: boolean;
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<string>('general');
  const [isFlagged, setIsFlagged] = useState(false);

  const noteTypes = [
    { key: 'general', label: 'General' },
    { key: 'clinical', label: 'Clinical' },
    { key: 'progress', label: 'Progress' },
    { key: 'concern', label: 'Concern' },
    { key: 'treatment_plan', label: 'Plan' },
  ];

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({
      title: title.trim() || '',
      content: content.trim(),
      note_type: noteType,
      is_flagged: isFlagged,
    });
    setTitle('');
    setContent('');
    setNoteType('general');
    setIsFlagged(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add Note</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.typeRow}>
            {noteTypes.map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  modalStyles.typeChip,
                  noteType === type.key && modalStyles.typeChipSelected,
                ]}
                onPress={() => setNoteType(type.key)}
              >
                <Text
                  style={[
                    modalStyles.typeText,
                    noteType === type.key && modalStyles.typeTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={modalStyles.input}
            placeholder="Title (optional)"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={Colors.textSecondary}
          />

          <TextInput
            style={[modalStyles.input, modalStyles.contentInput]}
            placeholder="Note content..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            placeholderTextColor={Colors.textSecondary}
          />

          <TouchableOpacity
            style={modalStyles.flagToggle}
            onPress={() => setIsFlagged(!isFlagged)}
          >
            <Flag size={20} color={isFlagged ? Colors.error : Colors.textSecondary} />
            <Text style={[modalStyles.flagText, isFlagged && modalStyles.flagTextActive]}>
              Flag as important
            </Text>
            {isFlagged && <Check size={16} color={Colors.error} />}
          </TouchableOpacity>

          <View style={modalStyles.actions}>
            <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button
              title={loading ? 'Saving...' : 'Save Note'}
              onPress={handleSave}
              disabled={loading || !content.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    userRole,
    getPatientById,
    loadPatientNotes,
    addPatientNote,
    patientNotes,
  } = usePatientStore();

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'notes'>('overview');
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const { showAlert, AlertComponent } = useCustomAlert();

  useEffect(() => {
    loadPatientData();
  }, [id]);

  const loadPatientData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const patientData = await getPatientById(id);
      setPatient(patientData);
      await loadPatientNotes(id);
    } catch (error) {
      console.error('Failed to load patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const patientData = await getPatientById(id);
      setPatient(patientData);
      await loadPatientNotes(id);
    } catch (error) {
      console.error('Failed to refresh patient:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddNote = async (note: { title: string; content: string; note_type: string; is_flagged: boolean }) => {
    if (!id) return;
    setSavingNote(true);
    const result = await addPatientNote(id, {
      ...note,
      note_type: note.note_type as 'clinical' | 'progress' | 'concern' | 'general' | 'treatment_plan',
    });
    setSavingNote(false);
    if (result.success) {
      setShowNoteModal(false);
      await loadPatientNotes(id);
    } else {
      showAlert({
        title: 'Error',
        message: result.error || 'Failed to save note',
        type: 'error',
      });
    }
  };

  const handleSendMessage = () => {
    if (id) {
      router.push(`/chat/${id}`);
    }
  };

  // Access control
  if (userRole !== 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access denied. This page is for doctors only.</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading patient data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={Colors.error} />
          <Text style={styles.errorText}>Patient not found</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  const patientData = patient.patientData || {};
  const recentLogs = patient.dailyLogs || [];
  const patientTrayChanges = patient.trayChanges || [];
  const targetSeconds = (patientData.target_hours_per_day || 22) * 3600;

  // Helper to get seconds from log (uses wear_seconds if available, otherwise wear_minutes * 60)
  const getLogSeconds = (log: any) => {
    if (log.wear_seconds != null) return log.wear_seconds;
    return (log.wear_minutes || 0) * 60;
  };

  // Calculate incremental progress based on qualifying days
  const calculateProgressPercent = () => {
    if (!patientData.total_trays) return 0;
    const currentTrayChange = patientTrayChanges.find((change: any) => change.tray_number === patientData.current_tray);
    const trayStartDate = currentTrayChange ? new Date(currentTrayChange.date_changed).toISOString().split('T')[0] : null;
    const minimumSecondsForDay = targetSeconds * 0.5;
    const recommendedDays = 14;

    const qualifyingDaysWorn = trayStartDate
      ? recentLogs.filter((log: any) => {
          if (log.date < trayStartDate) return false;
          return getLogSeconds(log) >= minimumSecondsForDay;
        }).length
      : 0;

    const completedAligners = (patientData.current_tray || 1) - 1;
    const currentAlignerProgress = Math.min(qualifyingDaysWorn / recommendedDays, 1);
    return Math.round(((completedAligners + currentAlignerProgress) / patientData.total_trays) * 100);
  };

  const progressPercent = calculateProgressPercent();

  // Calculate compliance - based on all days since first log
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Find first log date
  const sortedLogs = [...recentLogs].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const firstLogDate = sortedLogs.length > 0 ? sortedLogs[0].date : null;

  let weeklyAvg = 0;
  let daysInPeriod = 1;

  if (firstLogDate) {
    const firstLogDateObj = new Date(firstLogDate);
    // Weekly: last 7 days or since first log, whichever is shorter
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // -6 to include today = 7 days
    const weekStartDate = firstLogDate > sevenDaysAgo.toISOString().split('T')[0] ? firstLogDate : sevenDaysAgo.toISOString().split('T')[0];
    const weekStartDateObj = new Date(weekStartDate);
    daysInPeriod = Math.max(1, Math.floor((today.getTime() - weekStartDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const weeklyLogs = recentLogs.filter((log: any) => log.date >= weekStartDate && log.date <= todayStr);
    const weeklyTotalSeconds = weeklyLogs.reduce((sum: number, log: any) => sum + getLogSeconds(log), 0);
    weeklyAvg = weeklyTotalSeconds / daysInPeriod / 60; // Convert to minutes for display
  }

  const targetMinutes = targetSeconds / 60;
  const compliancePercent = targetMinutes > 0 ? Math.round((weeklyAvg / targetMinutes) * 100) : 0;

  // Calculate streak - check each CALENDAR day going backwards from yesterday
  // Use 50% of target as threshold, consistent with other pages
  const minimumSecondsForDay = targetSeconds * 0.5;
  let streak = 0;
  const checkDate = new Date(today);
  checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const log = recentLogs.find((l: any) => l.date === dateStr);

    if (log && getLogSeconds(log) >= minimumSecondsForDay) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Get patient status
  const getPatientStatus = () => {
    if (compliancePercent >= 90) return { text: 'Excellent', color: Colors.success };
    if (compliancePercent >= 70) return { text: 'Good', color: Colors.primary };
    if (compliancePercent >= 50) return { text: 'Needs Attention', color: Colors.warning };
    return { text: 'At Risk', color: Colors.error };
  };

  const status = getPatientStatus();

  const Tab = ({ name, label, count }: { name: typeof activeTab; label: string; count?: number }) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === name && styles.tabActive]}
      onPress={() => setActiveTab(name)}
    >
      <Text style={[styles.tabText, activeTab === name && styles.tabTextActive]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.tabBadge, activeTab === name && styles.tabBadgeActive]}>
          <Text style={[styles.tabBadgeText, activeTab === name && styles.tabBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AlertComponent />
      <AddNoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleAddNote}
        loading={savingNote}
      />

      {/* Full-screen Photo Viewer */}
      <Modal visible={!!selectedPhoto} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.photoOverlay}
          activeOpacity={1}
          onPress={() => setSelectedPhoto(null)}
        >
          <View style={styles.photoViewerHeader}>
            <Text style={styles.photoViewerTitle}>
              {selectedPhoto?.photo_type?.charAt(0).toUpperCase() + selectedPhoto?.photo_type?.slice(1)} View
              {selectedPhoto?.tray_number ? ` - Aligner #${selectedPhoto.tray_number}` : ''}
            </Text>
            <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
              <X size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto.photo_url }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          )}
          {selectedPhoto && (
            <Text style={styles.photoViewerDate}>
              {new Date(selectedPhoto.taken_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </Text>
          )}
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
          <MessageCircle size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Patient Info Card */}
        <Card style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientInitials}>
                {patient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA'}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientEmail}>{patient.email}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Package size={16} color={Colors.primary} />
              <Text style={styles.quickStatValue}>
                {patientData.current_tray || 1}/{patientData.total_trays || 24}
              </Text>
              <Text style={styles.quickStatLabel}>Current Tray</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Target size={16} color={Colors.success} />
              <Text style={styles.quickStatValue}>{compliancePercent}%</Text>
              <Text style={styles.quickStatLabel}>Compliance</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Award size={16} color={Colors.warning} />
              <Text style={styles.quickStatValue}>{streak} days</Text>
              <Text style={styles.quickStatLabel}>Streak</Text>
            </View>
          </View>
        </Card>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Tab name="overview" label="Overview" />
          <Tab name="history" label="History" count={patient.trayChanges?.length} />
          <Tab name="notes" label="Notes" count={patientNotes.length} />
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Treatment Progress */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Treatment Progress</Text>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.progressText}>{progressPercent}% Complete</Text>
              </View>
              {patientData.treatment_start_date && (
                <Text style={styles.treatmentDate}>
                  Started: {formatDate(patientData.treatment_start_date)}
                </Text>
              )}
            </Card>

            {/* Recent Wear Time */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Clock size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Recent Wear Time</Text>
              </View>
              {recentLogs.length > 0 ? (
                <>
                  <View style={styles.wearChart}>
                    {recentLogs.slice(0, 7).reverse().map((log: any, index: number) => {
                      const logSeconds = getLogSeconds(log);
                      const percent = targetSeconds > 0 ? Math.min((logSeconds / targetSeconds) * 100, 100) : 0;
                      const color = percent >= 90 ? Colors.success : percent >= 70 ? Colors.warning : Colors.error;
                      return (
                        <View key={log.date || index} style={styles.wearDay}>
                          <View style={styles.wearBarContainer}>
                            <View style={[styles.wearBar, { height: `${percent}%`, backgroundColor: color }]} />
                          </View>
                          <Text style={styles.wearDayLabel}>
                            {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.avgText}>
                    Weekly Average: {formatTime(Math.round(weeklyAvg))} / {patientData.target_hours_per_day || 22}h goal
                  </Text>
                  <Text style={styles.avgNote}>
                    Rolling 7-day avg (or {daysInPeriod} day{daysInPeriod !== 1 ? 's' : ''} if started recently). Days without logs = 0h.
                  </Text>
                </>
              ) : (
                <Text style={styles.emptyText}>No wear data available</Text>
              )}
            </Card>

            {/* Treatment Bouts */}
            {patient.treatmentBouts && patient.treatmentBouts.length > 0 && (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Activity size={20} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Treatment History</Text>
                </View>
                {patient.treatmentBouts.slice(0, 3).map((bout: any) => (
                  <View key={bout.id} style={styles.boutItem}>
                    <View style={styles.boutInfo}>
                      <Text style={styles.boutNumber}>Treatment #{bout.bout_number}</Text>
                      <Text style={styles.boutDetails}>
                        {bout.total_trays} trays | {bout.status}
                      </Text>
                    </View>
                    <Text style={styles.boutDate}>
                      {formatDate(bout.start_date)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Progress Photos */}
            {patient.progressPhotos && patient.progressPhotos.length > 0 && (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Camera size={20} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Progress Photos</Text>
                </View>
                {(() => {
                  // Group photos by tray number
                  const grouped: Record<number, any[]> = {};
                  for (const photo of patient.progressPhotos) {
                    const tray = photo.tray_number ?? 0;
                    if (!grouped[tray]) grouped[tray] = [];
                    grouped[tray].push(photo);
                  }
                  const trayNumbers = Object.keys(grouped).map(Number).sort((a, b) => b - a);
                  return trayNumbers.map((tray) => (
                    <View key={tray} style={styles.photoGroup}>
                      <Text style={styles.photoGroupLabel}>
                        {tray > 0 ? `Aligner #${tray}` : 'Other'}
                      </Text>
                      <View style={styles.photoGrid}>
                        {grouped[tray].map((photo: any) => (
                          <TouchableOpacity
                            key={photo.id}
                            style={styles.photoThumb}
                            onPress={() => setSelectedPhoto(photo)}
                          >
                            <Image
                              source={{ uri: photo.photo_url }}
                              style={styles.photoThumbImage}
                            />
                            <Text style={styles.photoThumbLabel}>{photo.photo_type}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ));
                })()}
              </Card>
            )}

            {/* Quick Actions */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Actions</Text>
              </View>
              <TouchableOpacity style={styles.actionRow} onPress={handleSendMessage}>
                <MessageCircle size={20} color={Colors.primary} />
                <Text style={styles.actionText}>Send Message</Text>
                <ChevronRight size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionRow} onPress={() => setShowNoteModal(true)}>
                <FileText size={20} color={Colors.primary} />
                <Text style={styles.actionText}>Add Clinical Note</Text>
                <ChevronRight size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionRow}>
                <Calendar size={20} color={Colors.primary} />
                <Text style={styles.actionText}>Schedule Appointment</Text>
                <ChevronRight size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Package size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Tray Change History</Text>
              </View>
              {patient.trayChanges && patient.trayChanges.length > 0 ? (
                patient.trayChanges.map((change: any) => (
                  <View key={change.id} style={styles.historyItem}>
                    <View style={styles.historyIcon}>
                      <Package size={16} color={Colors.primary} />
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyTitle}>Changed to Tray #{change.tray_number}</Text>
                      <Text style={styles.historyDate}>{formatDate(change.date_changed)}</Text>
                      {change.fit_status && (
                        <View style={[
                          styles.fitBadge,
                          { backgroundColor: change.fit_status === 'good' ? Colors.success + '20' : Colors.warning + '20' }
                        ]}>
                          <CheckCircle size={12} color={change.fit_status === 'good' ? Colors.success : Colors.warning} />
                          <Text style={[
                            styles.fitText,
                            { color: change.fit_status === 'good' ? Colors.success : Colors.warning }
                          ]}>
                            Fit: {change.fit_status}
                          </Text>
                        </View>
                      )}
                      {change.notes && <Text style={styles.historyNotes}>{change.notes}</Text>}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No tray changes recorded</Text>
              )}
            </Card>
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={styles.tabContent}>
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={() => setShowNoteModal(true)}
            >
              <Plus size={20} color={Colors.primary} />
              <Text style={styles.addNoteText}>Add Note</Text>
            </TouchableOpacity>

            {patientNotes.length > 0 ? (
              patientNotes.map((note: any) => (
                <Card key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteTypeTag}>
                      <Text style={styles.noteTypeLabel}>{note.note_type}</Text>
                    </View>
                    {note.is_flagged && <Flag size={16} color={Colors.error} />}
                  </View>
                  {note.title && <Text style={styles.noteTitle}>{note.title}</Text>}
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <FileText size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyTitle}>No notes yet</Text>
                <Text style={styles.emptySubtitle}>Add your first clinical note for this patient</Text>
              </Card>
            )}
          </View>
        )}

        <View style={{ height: Spacing.xl * 2 }} />
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
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
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
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  messageButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  patientCard: {
    marginTop: Spacing.md,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  patientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  patientInitials: {
    color: Colors.background,
    fontSize: 24,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  patientEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickStat: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  quickStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.background,
  },
  tabBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: Colors.background,
  },
  tabContent: {
    marginTop: Spacing.md,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressContainer: {
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  treatmentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  wearChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 100,
    marginBottom: Spacing.sm,
  },
  wearDay: {
    flex: 1,
    alignItems: 'center',
  },
  wearBarContainer: {
    flex: 1,
    width: 20,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  wearBar: {
    width: '100%',
    borderRadius: 4,
  },
  wearDayLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  avgText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  avgNote: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  boutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  boutInfo: {},
  boutNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  boutDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  boutDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  actionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 32,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  historyNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  fitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: Spacing.xs,
    gap: 4,
  },
  fitText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  addNoteText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  noteCard: {
    marginBottom: Spacing.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  noteTypeTag: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  noteTypeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  noteContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  // Progress photo styles
  photoGroup: {
    marginBottom: Spacing.md,
  },
  photoGroupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoThumb: {
    alignItems: 'center',
  },
  photoThumbImage: {
    width: (Dimensions.get('window').width - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    height: (Dimensions.get('window').width - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  photoThumbLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  photoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerHeader: {
    position: 'absolute',
    top: 60,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  photoViewerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  photoViewerImage: {
    width: Dimensions.get('window').width - Spacing.md * 2,
    height: Dimensions.get('window').height * 0.6,
  },
  photoViewerDate: {
    position: 'absolute',
    bottom: 60,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});

// Modal styles
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  typeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  typeTextSelected: {
    color: Colors.background,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  contentInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  flagToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  flagText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  flagTextActive: {
    color: Colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
