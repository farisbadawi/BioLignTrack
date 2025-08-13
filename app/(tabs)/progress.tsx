import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Calendar, Clock, Award } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/colors';
import { usePatientStore } from '@/stores/patient-store';
import { Card } from '@/components/Card';

export default function ProgressScreen() {
  const { patient, getWeeklyProgress } = usePatientStore();
  const weeklyData = getWeeklyProgress();

  if (!patient) return null;

  const maxHours = Math.max(...weeklyData.map(d => d.hours), patient.targetHoursPerDay);
  const averageHours = weeklyData.reduce((sum, d) => sum + d.hours, 0) / weeklyData.length;
  const streak = 5; // Mock streak data
  const onTimeChanges = 7; // Mock on-time changes

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const BarChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Daily Wear Time</Text>
        <Text style={styles.chartSubtitle}>Last 7 days</Text>
      </View>
      
      <View style={styles.chart}>
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>{Math.ceil(maxHours)}h</Text>
          <Text style={styles.yAxisLabel}>{Math.ceil(maxHours * 0.75)}h</Text>
          <Text style={styles.yAxisLabel}>{Math.ceil(maxHours * 0.5)}h</Text>
          <Text style={styles.yAxisLabel}>0h</Text>
        </View>
        
        <View style={styles.chartArea}>
          {/* Target line */}
          <View 
            style={[
              styles.targetLine, 
              { bottom: `${(patient.targetHoursPerDay / maxHours) * 100}%` }
            ]} 
          />
          
          <View style={styles.bars}>
            {weeklyData.map((data, index) => {
              const barHeight = (data.hours / maxHours) * 100;
              const isToday = index === weeklyData.length - 1;
              const meetsTarget = data.hours >= patient.targetHoursPerDay;
              
              return (
                <View key={data.date} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${barHeight}%`,
                          backgroundColor: meetsTarget ? Colors.success : 
                                         data.hours >= patient.targetHoursPerDay * 0.8 ? Colors.warning : 
                                         Colors.error,
                        },
                        isToday && styles.todayBar,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isToday && styles.todayLabel]}>
                    {formatDate(data.date)}
                  </Text>
                  <Text style={styles.barValue}>
                    {data.hours.toFixed(1)}h
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
      
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.success }]} />
          <Text style={styles.legendText}>Target met</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.warning }]} />
          <Text style={styles.legendText}>Close</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.error }]} />
          <Text style={styles.legendText}>Below target</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>Track your orthodontic journey</Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{averageHours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>7-day average</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIcon}>
              <Award size={24} color={Colors.success} />
            </View>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIcon}>
              <Calendar size={24} color={Colors.warning} />
            </View>
            <Text style={styles.statValue}>{onTimeChanges}</Text>
            <Text style={styles.statLabel}>On-time changes</Text>
          </Card>
        </View>

        {/* Weekly Chart */}
        <Card style={styles.chartCard}>
          <BarChart />
        </Card>

        {/* Progress Insights */}
        <Card style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Insights & Tips</Text>
          </View>
          
          <View style={styles.insights}>
            <View style={styles.insightItem}>
              <View style={[styles.insightIndicator, { backgroundColor: Colors.success }]} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Great consistency!</Text>
                <Text style={styles.insightText}>
                  You&apos;ve met your daily goal 5 out of 7 days this week.
                </Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIndicator, { backgroundColor: Colors.warning }]} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Weekend reminder</Text>
                <Text style={styles.insightText}>
                  Your wear time tends to drop on weekends. Set reminders to stay on track.
                </Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIndicator, { backgroundColor: Colors.primary }]} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Treatment progress</Text>
                <Text style={styles.insightText}>
                  You&apos;re {Math.round((patient.currentTray / patient.totalTrays) * 100)}% through your treatment plan. Keep it up!
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Monthly Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>This Month</Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>89%</Text>
              <Text style={styles.summaryLabel}>Compliance Rate</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>21.2h</Text>
              <Text style={styles.summaryLabel}>Daily Average</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>2</Text>
              <Text style={styles.summaryLabel}>Trays Completed</Text>
            </View>
          </View>
          
          <View style={styles.summaryProgress}>
            <Text style={styles.summaryProgressLabel}>Monthly Goal Progress</Text>
            <View style={styles.summaryProgressBar}>
              <View style={[styles.summaryProgressFill, { width: '89%' }]} />
            </View>
            <Text style={styles.summaryProgressText}>89% of target hours</Text>
          </View>
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
  chartCard: {
    marginBottom: Spacing.md,
  },
  chartContainer: {
    paddingVertical: Spacing.sm,
  },
  chartHeader: {
    marginBottom: Spacing.md,
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
    height: 1,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },
  bars: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'flex-end',
    gap: 2,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
    minHeight: 2,
  },
  todayBar: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
});