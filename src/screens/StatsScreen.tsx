import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStats } from '../db/repository';
import { colors, radius, spacing } from '../theme';
import type { StatsSummary } from '../types';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.tile}>
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
      <Text style={styles.title}>Stats</Text>
      {stats && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.grid}>
            <StatTile label="Total sessions" value={stats.totalSessions} />
            <StatTile label="Exercises tracked" value={stats.distinctExercises} />
            <StatTile label="Last 7 days" value={stats.sessionsLast7Days} />
            <StatTile label="Weeks training" value={stats.weeksSinceFirstSession} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Most trained</Text>
            <Text style={styles.cardBody}>
              {stats.mostTrainedExercise
                ? `${stats.mostTrainedExercise.name} — ${stats.mostTrainedExercise.sessionCount} session${stats.mostTrainedExercise.sessionCount === 1 ? '' : 's'}`
                : 'No sessions yet'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal bests</Text>
            {stats.personalBests.length === 0 && <Text style={styles.cardBody}>No sessions yet</Text>}
            {stats.personalBests.map((pb) => (
              <View key={pb.exerciseName} style={styles.pbRow}>
                <View style={styles.pbLeft}>
                  <Text style={styles.pbName}>{pb.exerciseName}</Text>
                  <Text style={styles.pbDate}>{pb.date}</Text>
                </View>
                <Text style={styles.pbValue}>
                  {pb.effectiveWeight} × {pb.reps}
                </Text>
              </View>
            ))}
          </View>
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tileValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 15,
  },
  pbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pbLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  pbName: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  pbDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  pbValue: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 15,
  },
});
