// app/(tabs)/progress.tsx - COMPLETE FILE WITH REAL DATA
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Calendar, Clock, Award, AlertCircle, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';
import { useTheme } from '@/contexts/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProgressScreen() {
  const { patient, dailyLogs, trayChanges, assignedDoctor, currentSession, todayWearSeconds, getComplianceStats } = usePatientStore();
  const { colors } = useTheme();
  const [, setTick] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const translateX = useRef(new Animated.Value(0)).current;

  // Update chart every 30 seconds while timer is running
  useEffect(() => {
    if (!currentSession) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentSession]);

  // Get weekly data for a specific week offset
  const getWeekData = (offset: number) => {
    const days = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const treatmentStartDate = patient?.treatment_start_date;

    // Calculate current session elapsed time if timer is running (in seconds)
    let currentSessionSeconds = 0;
    if (currentSession?.startTime && offset === 0) {
      currentSessionSeconds = Math.floor((new Date().getTime() - currentSession.startTime.getTime()) / 1000);
    }

    // Get Monday of the target week
    const currentDayOfWeek = today.getDay();
    const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday + (offset * 7));

    // Generate days Monday through Sunday
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Only count days on or after treatment_start_date
      const isBeforeTreatment = treatmentStartDate && dateStr < treatmentStartDate;
      const isFuture = dateStr > todayStr;

      const log = dailyLogs.find((l: any) => l.date === dateStr);
      let hours = 0;

      if (!isBeforeTreatment && !isFuture) {
        if (dateStr === todayStr && offset === 0) {
          // Use seconds for today: todayWearSeconds + current session
          hours = ((todayWearSeconds || 0) + currentSessionSeconds) / 3600;
        } else if (log) {
          // Use getLogSeconds for historical days
          const logSeconds = log.wear_seconds != null ? log.wear_seconds : (log.wear_minutes || 0) * 60;
          hours = logSeconds / 3600;
        }
      }

      days.push({
        date: dateStr,
        hours: Math.round(hours * 10) / 10,
        isFuture,
      });
    }
    return days;
  };

  const weeklyData = getWeekData(weekOffset);

  // Get week label (e.g., "This Week", "Last Week", "Feb 12 - 18")
  const getWeekLabel = (offset: number) => {
    if (offset === 0) return 'This Week';
    if (offset === -1) return 'Last Week';

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday + (offset * 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[monday.getMonth()]} ${monday.getDate()} - ${sunday.getDate()}`;
  };

  // Swipe handlers
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          // Swiped right - go to previous week
          setWeekOffset(prev => prev - 1);
        } else if (gestureState.dx < -50 && weekOffset < 0) {
          // Swiped left - go to next week (but not beyond current week)
          setWeekOffset(prev => prev + 1);
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
  const goToNextWeek = () => weekOffset < 0 && setWeekOffset(prev => prev + 1);

  if (!patient) return null;

  // Check if treatment has started
  const treatmentStarted = !!assignedDoctor && !!patient.treatment_start_date;

  // Helper to get seconds from log entry (uses wear_seconds if available, otherwise wear_minutes * 60)
  const getLogSeconds = (log: any) => {
    if (log.wear_seconds != null) return log.wear_seconds;
    return (log.wear_minutes || 0) * 60;
  };

  // Calculate real statistics from data
  const calculateStats = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const targetSeconds = patient.target_hours_per_day * 3600;

    // Find the first day with logged data - this is when tracking actually started
    const sortedLogs = [...dailyLogs].sort((a, b) => a.date.localeCompare(b.date));
    const firstLogDate = sortedLogs.length > 0 ? sortedLogs[0].date : todayStr;

    // Calculate days since first log (actual tracking period)
    const firstLogDateObj = new Date(firstLogDate);
    const daysSinceFirstLog = Math.max(1, Math.floor((today.getTime() - firstLogDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Weekly stats - from first log or last 7 days, whichever is later
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // -6 to include today = 7 days
    const weekStart = firstLogDate > sevenDaysAgo.toISOString().split('T')[0] ? firstLogDate : sevenDaysAgo.toISOString().split('T')[0];
    const weekStartDate = new Date(weekStart);
    const daysInWeek = Math.max(1, Math.floor((today.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Sum all logged seconds in the week period
    const weeklyLogs = dailyLogs.filter(log => log.date >= weekStart && log.date <= todayStr);
    const weeklyTotalSeconds = weeklyLogs.reduce((sum, log) => sum + getLogSeconds(log), 0);
    // Divide by ALL days in the period (not just logged days) - result in hours
    const weeklyAverage = weeklyTotalSeconds / daysInWeek / 3600;

    // Use 50% of target as threshold (consistent with tray page "days worn")
    const minimumSecondsForDay = targetSeconds * 0.5;

    // Current streak - check each CALENDAR day going backwards from yesterday
    // (today isn't over yet, so we start from yesterday)
    let currentStreak = 0;
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const log = dailyLogs.find(l => l.date === dateStr);

      if (log && getLogSeconds(log) >= minimumSecondsForDay) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1); // Go back one more day
      } else {
        break; // No qualifying log for this day - streak ends
      }
    }

    // Best streak - check consecutive calendar days
    let bestStreak = 0;
    let tempStreak = 0;
    const logsAscending = [...dailyLogs].sort((a, b) => a.date.localeCompare(b.date));

    if (logsAscending.length > 0) {
      let prevDate: Date | null = null;
      for (const log of logsAscending) {
        const logDate = new Date(log.date);

        if (getLogSeconds(log) >= minimumSecondsForDay) {
          // Check if this is consecutive with previous qualifying day
          if (prevDate) {
            const diffDays = Math.round((logDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              tempStreak++;
            } else {
              tempStreak = 1; // Reset streak, start new one
            }
          } else {
            tempStreak = 1; // First qualifying day
          }
          prevDate = logDate;
          if (tempStreak > bestStreak) {
            bestStreak = tempStreak;
          }
        } else {
          tempStreak = 0;
          prevDate = null;
        }
      }
    }

    // On-time tray changes
    const sortedTrayChanges = [...trayChanges].sort((a, b) =>
      new Date(a.date_changed).getTime() - new Date(b.date_changed).getTime()
    );
    let onTimeChanges = 0;
    for (let i = 1; i < sortedTrayChanges.length; i++) {
      const prevChange = new Date(sortedTrayChanges[i - 1].date_changed);
      const currentChange = new Date(sortedTrayChanges[i].date_changed);
      const daysBetween = (currentChange.getTime() - prevChange.getTime()) / (1000 * 60 * 60 * 24);
      if (daysBetween >= 12 && daysBetween <= 16) {
        onTimeChanges++;
      }
    }

    // Weighted compliance from FIRST LOG DATE (not treatment_start_date)
    // This way compliance is based on when user actually started tracking
    // Each day gets a score: (hours worn / target hours), capped at 100%
    // Overall compliance = average of all daily scores

    let complianceRate = 0;
    let daysInTreatment = daysSinceFirstLog;

    if (sortedLogs.length > 0) {
      // Calculate weighted compliance for each day from first log
      let totalComplianceScore = 0;

      for (let i = 0; i < daysInTreatment; i++) {
        const checkDate = new Date(firstLogDateObj);
        checkDate.setDate(firstLogDateObj.getDate() + i);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        // Find log for this date
        const dayLog = dailyLogs.find(log => log.date === checkDateStr);
        const hoursWorn = dayLog ? getLogSeconds(dayLog) / 3600 : 0;

        // Daily score: hours worn / target, capped at 100%
        const dailyScore = Math.min(hoursWorn / patient.target_hours_per_day, 1);
        totalComplianceScore += dailyScore;
      }

      // Average across all days
      complianceRate = (totalComplianceScore / daysInTreatment) * 100;
    }

    const daysTracked = dailyLogs.filter(log => getLogSeconds(log) > 0).length;

    // Monthly average - from first log or last 30 days, whichever is later
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29); // -29 to include today = 30 days
    const monthStart = firstLogDate > thirtyDaysAgo.toISOString().split('T')[0] ? firstLogDate : thirtyDaysAgo.toISOString().split('T')[0];
    const monthStartDate = new Date(monthStart);
    const daysInMonth = Math.max(1, Math.floor((today.getTime() - monthStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Sum all logged seconds in the month period
    const monthlyLogs = dailyLogs.filter(log => log.date >= monthStart && log.date <= todayStr);
    const monthlyTotalSeconds = monthlyLogs.reduce((sum, log) => sum + getLogSeconds(log), 0);
    // Divide by ALL days in the period (not just logged days) - result in hours
    const monthlyAverage = monthlyTotalSeconds / daysInMonth / 3600;

    // Trays completed this month
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const monthlyTrayChanges = trayChanges.filter(change =>
      change.date_changed >= thirtyDaysAgoStr && change.date_changed <= todayStr
    );

    return {
      weeklyAverage,
      currentStreak,
      bestStreak,
      onTimeChanges,
      monthlyAverage,
      complianceRate,
      traysCompletedThisMonth: monthlyTrayChanges.length,
      daysInTreatment
    };
  };

  const stats = calculateStats();
  const maxHours = 24; // Always show 24h as max on Y-axis
  const chartScale = 0.92; // Scale bars to 92% so there's visual headroom at top

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Generate insights based on real data
  const generateInsights = () => {
    const insights = [];
    const targetHours = patient.target_hours_per_day;

    // Consistency insight
    const weeklyLogs = dailyLogs.filter(log => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return log.date >= oneWeekAgo;
    });
    const daysMetTarget = weeklyLogs.filter(log => log.wear_minutes >= targetHours * 60).length;

    if (daysMetTarget >= 5) {
      insights.push({
        type: 'success',
        title: 'Great consistency!',
        text: `You've met your daily goal ${daysMetTarget} out of ${weeklyLogs.length} days this week.`
      });
    } else if (daysMetTarget >= 3) {
      insights.push({
        type: 'warning',
        title: 'Good progress',
        text: `You've met your daily goal ${daysMetTarget} out of ${weeklyLogs.length} days this week. Try to be more consistent.`
      });
    } else {
      insights.push({
        type: 'error',
        title: 'Need improvement',
        text: `You've only met your daily goal ${daysMetTarget} out of ${weeklyLogs.length} days this week. Focus on consistency.`
      });
    }

    // Weekend performance
    const weekendLogs = weeklyLogs.filter(log => {
      const dayOfWeek = new Date(log.date).getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    });
    const weekdayLogs = weeklyLogs.filter(log => {
      const dayOfWeek = new Date(log.date).getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    });

    const weekendAvg = weekendLogs.length > 0 ?
      weekendLogs.reduce((sum, log) => sum + log.wear_minutes, 0) / weekendLogs.length / 60 : 0;
    const weekdayAvg = weekdayLogs.length > 0 ?
      weekdayLogs.reduce((sum, log) => sum + log.wear_minutes, 0) / weekdayLogs.length / 60 : 0;

    if (weekendAvg < weekdayAvg - 2) {
      insights.push({
        type: 'warning',
        title: 'Weekend reminder',
        text: 'Your wear time tends to drop on weekends. Set reminders to stay on track.'
      });
    }

    // Treatment progress - use incremental calculation based on qualifying days
    const currentTrayChange = trayChanges.find(change => change.tray_number === patient.current_tray);
    const trayStartDate = currentTrayChange ? new Date(currentTrayChange.date_changed).toISOString().split('T')[0] : null;
    const minMinutesForDay = targetHours * 60 * 0.5; // 50% of target
    const recommendedDays = 14;

    const qualifyingDaysWorn = trayStartDate
      ? dailyLogs.filter(log => {
          if (log.date < trayStartDate) return false;
          return (log.wear_minutes || 0) >= minMinutesForDay;
        }).length
      : 0;

    const completedAligners = patient.current_tray - 1;
    const currentAlignerProgress = Math.min(qualifyingDaysWorn / recommendedDays, 1);
    const progressPercentage = Math.round(((completedAligners + currentAlignerProgress) / patient.total_trays) * 100);

    insights.push({
      type: 'primary',
      title: 'Treatment progress',
      text: `You're ${progressPercentage}% through your treatment plan. Keep it up!`
    });

    return insights;
  };

  const insights = generateInsights();

  // Get today's date string for comparison
  const todayStr = new Date().toISOString().split('T')[0];

  const BarChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Daily Wear Time</Text>
        <View style={styles.weekNavigation}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekArrow}>
            <ChevronLeft size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{getWeekLabel(weekOffset)}</Text>
          <TouchableOpacity
            onPress={goToNextWeek}
            style={[styles.weekArrow, weekOffset >= 0 && styles.weekArrowDisabled]}
            disabled={weekOffset >= 0}
          >
            <ChevronRight size={20} color={weekOffset >= 0 ? colors.border : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={[styles.chart, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.yAxis}>
          <Text style={[styles.yAxisLabel, { color: colors.textSecondary }]}>{Math.ceil(maxHours)}h</Text>
          <Text style={[styles.yAxisLabel, { color: colors.textSecondary }]}>{Math.ceil(maxHours * 0.75)}h</Text>
          <Text style={[styles.yAxisLabel, { color: colors.textSecondary }]}>{Math.ceil(maxHours * 0.5)}h</Text>
          <Text style={[styles.yAxisLabel, { color: colors.textSecondary }]}>0h</Text>
        </View>

        <View style={styles.chartArea}>
          {/* Grid lines at 6h, 12h, 18h, 24h */}
          <View style={[styles.gridLine, { bottom: `${25 * chartScale}%`, backgroundColor: colors.border }]} />
          <View style={[styles.gridLine, { bottom: `${50 * chartScale}%`, backgroundColor: colors.border }]} />
          <View style={[styles.gridLine, { bottom: `${75 * chartScale}%`, backgroundColor: colors.border }]} />
          <View style={[styles.gridLine, { bottom: `${100 * chartScale}%`, backgroundColor: colors.border }]} />

          {/* Target line */}
          <View
            style={[
              styles.targetLine,
              {
                bottom: `${(patient.target_hours_per_day / maxHours) * 100 * chartScale}%`,
                backgroundColor: colors.primary,
              }
            ]}
          />

          {/* Bars - using absolute positioning like target line for accurate alignment */}
          <View style={styles.barsAbsolute}>
            {weeklyData.map((data) => {
              const barHeight = (data.hours / maxHours) * 100 * chartScale;
              const isToday = data.date === todayStr && weekOffset === 0;
              const meetsTarget = data.hours >= patient.target_hours_per_day;

              // Only show visual highlight for today if there are actual hours logged
              const showTodayHighlight = isToday && data.hours > 0;

              return (
                <View key={data.date} style={styles.barColumn}>
                  <View
                    style={[
                      styles.barAbsolute,
                      {
                        height: `${barHeight}%`,
                        backgroundColor: data.hours === 0 ? 'transparent' :
                                       meetsTarget ? colors.success :
                                       data.hours >= patient.target_hours_per_day * 0.8 ? colors.warning :
                                       colors.error,
                      },
                      showTodayHighlight && [styles.todayBar, { borderColor: colors.primary }],
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Labels row - separate from chart area */}
      <View style={styles.labelsRow}>
        <View style={styles.yAxisSpacer} />
        {weeklyData.map((data) => {
          const isToday = data.date === todayStr && weekOffset === 0;
          const isFuture = data.isFuture;
          return (
            <View key={data.date} style={styles.labelColumn}>
              <Text style={[
                styles.barLabel,
                { color: isFuture ? colors.border : colors.textSecondary },
                isToday && { color: colors.primary, fontWeight: '600' }
              ]}>
                {formatDate(data.date)}
              </Text>
              <Text style={[styles.barValue, { color: isFuture ? colors.border : colors.textSecondary }]}>
                {data.hours.toFixed(1)}h
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Target met</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Close</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.error }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Below target</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.surface }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Progress</Text>
          <View style={{ height: 3, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6, marginBottom: 4 }} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Track your orthodontic journey</Text>
        </View>

        {/* Treatment Not Started Message */}
        {!treatmentStarted && (
          <Card style={styles.notStartedCard}>
            <AlertCircle size={48} color={colors.warning} />
            <Text style={[styles.notStartedTitle, { color: colors.textPrimary }]}>
              Treatment Not Started
            </Text>
            <Text style={[styles.notStartedText, { color: colors.textSecondary }]}>
              Link to your doctor to start tracking your progress and compliance.
            </Text>
            <TouchableOpacity
              style={[styles.linkDoctorButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <UserPlus size={18} color={colors.background} />
              <Text style={[styles.linkDoctorText, { color: colors.background }]}>
                Add Doctor Code
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.surface }]}>
              <TrendingUp size={24} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.weeklyAverage.toFixed(1)}h</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>7-Day Avg</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.surface }]}>
              <Award size={24} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day streak</Text>
            <Text style={[styles.statSublabel, { color: colors.textSecondary }]}>Best: {stats.bestStreak}</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.surface }]}>
              <Calendar size={24} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.onTimeChanges}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>On-time changes</Text>
          </Card>
        </View>

        {/* Weekly Chart */}
        <Card style={styles.chartCard}>
          <BarChart />
        </Card>

        {/* Progress Insights */}
        <Card style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Insights & Tips</Text>
          </View>

          <View style={styles.insights}>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <View style={[
                  styles.insightIndicator,
                  {
                    backgroundColor: insight.type === 'success' ? colors.success :
                                   insight.type === 'warning' ? colors.warning :
                                   insight.type === 'error' ? colors.error :
                                   colors.primary
                  }
                ]} />
                <View style={styles.insightContent}>
                  <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>{insight.title}</Text>
                  <Text style={[styles.insightText, { color: colors.textSecondary }]}>{insight.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Monthly Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Treatment Progress</Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              {stats.daysInTreatment} day{stats.daysInTreatment !== 1 ? 's' : ''} since first log
            </Text>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{Math.round(stats.complianceRate)}%</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Compliance</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{stats.monthlyAverage.toFixed(1)}h</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>30-Day Avg</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{stats.traysCompletedThisMonth}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tray Changes</Text>
            </View>
          </View>

          <View style={styles.summaryProgress}>
            <Text style={[styles.summaryProgressLabel, { color: colors.textPrimary }]}>Overall Compliance</Text>
            <View style={[styles.summaryProgressBar, { backgroundColor: colors.border }]}>
              <View style={[
                styles.summaryProgressFill,
                { width: `${Math.min(stats.complianceRate, 100)}%`, backgroundColor: colors.primary }
              ]} />
            </View>
            <Text style={[styles.summaryProgressText, { color: colors.textSecondary }]}>
              Avg {Math.round(stats.complianceRate)}% of {patient.target_hours_per_day}h daily target
            </Text>
          </View>

          <Text style={[styles.trackingNote, { color: colors.textSecondary }]}>
            Averages are rolling (last 7 or 30 days), or since your first log if you started more recently. Days without logs count as 0 hours.
          </Text>
        </Card>
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
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  notStartedCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  notStartedTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  notStartedText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  linkDoctorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  linkDoctorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statSublabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  chartCard: {
    marginBottom: Spacing.md,
  },
  chartContainer: {
    paddingVertical: Spacing.sm,
  },
  chartHeader: {
    marginBottom: Spacing.md,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  weekArrow: {
    padding: Spacing.xs,
  },
  weekArrowDisabled: {
    opacity: 0.3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  chartSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chart: {
    flexDirection: 'row',
    height: 200,
    marginBottom: Spacing.md,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.sm,
  },
  yAxisLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  barsAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barAbsolute: {
    width: '80%',
    borderRadius: 2,
  },
  todayBar: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    paddingLeft: 0,
  },
  yAxisSpacer: {
    width: 30,
  },
  labelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  todayLabel: {
    color: Colors.primary,
    fontWeight: '600',
  },
  barValue: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  insightsCard: {
    marginBottom: Spacing.md,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  insights: {
    gap: Spacing.md,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  insightIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  insightText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryHeader: {
    marginBottom: Spacing.md,
  },
  summarySubtitle: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  summaryProgress: {
    alignItems: 'center',
  },
  summaryProgressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  summaryProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  summaryProgressText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  trackingNote: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
  },
});
