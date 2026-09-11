import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardTitle } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { getStats } from '../db/repository';
import { colors, fontSize, radius, spacing } from '../theme';
import type { StatsSummary } from '../types';
import { formatDateDisplay } from '../utils/date';
import { formatWeight } from '../utils/format';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function StatTile({ label, value, icon }: { label: string; value: string | number; icon: IconName }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export function StatsScreen() {
  const [stats, setStats] = useState<StatsSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats);
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Stats" subtitle={stats && stats.totalSessions > 0 ? 'All time' : undefined} />
      {stats && stats.totalSessions === 0 && (
        <EmptyState icon="stats-chart-outline" title="No stats yet" body="Your numbers will appear after your first logged session." />
      )}
      {stats && stats.totalSessions > 0 && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.grid}>
            <StatTile label="Sessions" value={stats.totalSessions} icon="calendar-outline" />
            <StatTile label="Exercises" value={stats.distinctExercises} icon="barbell-outline" />
            <StatTile label="Last 7 days" value={stats.sessionsLast7Days} icon="flame-outline" />
            <StatTile label="Weeks training" value={stats.weeksSinceFirstSession} icon="time-outline" />
          </View>

          <Card>
            <CardTitle title="Most trained" />
            {stats.mostTrainedExercise ? (
              <View style={styles.mostRow}>
                <View style={styles.trophy}>
                  <Ionicons name="trophy" size={22} color={colors.primary} />
                </View>
                <View style={styles.mostText}>
                  <Text style={styles.mostName}>{stats.mostTrainedExercise.name}</Text>
                  <Text style={styles.mostMeta}>
                    {stats.mostTrainedExercise.sessionCount} session{stats.mostTrainedExercise.sessionCount === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.cardBody}>No sessions yet</Text>
            )}
          </Card>

          <Card>
            <CardTitle title="Personal bests" />
            {stats.personalBests.length === 0 && <Text style={styles.cardBody}>No sessions yet</Text>}
            {stats.personalBests.map((pb, i) => (
              <View key={pb.exerciseName} style={[styles.pbRow, i === stats.personalBests.length - 1 && styles.pbRowLast]}>
                <View style={styles.pbIcon}>
                  <Ionicons name="medal-outline" size={16} color={colors.success} />
                </View>
                <View style={styles.pbLeft}>
                  <Text style={styles.pbName}>{pb.exerciseName}</Text>
                  <Text style={styles.pbDate}>{formatDateDisplay(pb.date)}</Text>
                </View>
                <Text style={styles.pbValue}>
                  {formatWeight(pb.effectiveWeight)} × {pb.reps}
                </Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tileValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tileLabel: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: fontSize.body,
  },
  mostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trophy: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mostText: {
    flex: 1,
  },
  mostName: {
    color: colors.text,
    fontSize: fontSize.h3,
    fontWeight: '700',
  },
  mostMeta: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    marginTop: 2,
  },
  pbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pbRowLast: {
    borderBottomWidth: 0,
  },
  pbIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pbLeft: {
    flex: 1,
  },
  pbName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.body,
  },
  pbDate: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    marginTop: 1,
  },
  pbValue: {
    color: colors.success,
    fontWeight: '800',
    fontSize: fontSize.body,
  },
});
