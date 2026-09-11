import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from '../components/LineChart';
import { getAllExerciseNames, getProgressForExercise, type ProgressPoint } from '../db/repository';
import { colors, radius, spacing } from '../theme';

export function ProgressScreen() {
  const [names, setNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [points, setPoints] = useState<ProgressPoint[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAllExerciseNames().then((list) => {
        if (!active) return;
        setNames(list);
        setSelected((prev) => {
          if (prev && list.some((n) => n.toLowerCase() === prev.toLowerCase())) return prev;
          return list[0] ?? null;
        });
      });
      return () => {
        active = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (!selected) {
        setPoints([]);
        return;
      }
      let active = true;
      getProgressForExercise(selected).then((p) => {
        if (active) setPoints(p);
      });
      return () => {
        active = false;
      };
    }, [selected])
  );

  const chartPoints = points.map((p) => ({ label: p.date.slice(5), value: p.effectiveWeight }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Progress</Text>
      {names.length === 0 ? (
        <Text style={styles.emptyText}>Log a session first to see progress.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {names.map((n) => {
              const active = selected?.toLowerCase() === n.toLowerCase();
              return (
                <Pressable key={n} style={[styles.chip, active && styles.chipActive]} onPress={() => setSelected(n)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{selected} — best effective weight per session</Text>
            <LineChart points={chartPoints} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sessions</Text>
            {[...points].reverse().map((p, i) => (
              <View key={i} style={styles.pointRow}>
                <Text style={styles.pointDate}>{p.date}</Text>
                <Text style={styles.pointValue}>
                  {p.effectiveWeight} × {p.reps}
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
  emptyText: {
    color: colors.textMuted,
    padding: spacing.md,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  chips: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primaryText,
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
  pointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pointDate: {
    color: colors.textMuted,
  },
  pointValue: {
    color: colors.text,
    fontWeight: '600',
  },
});
