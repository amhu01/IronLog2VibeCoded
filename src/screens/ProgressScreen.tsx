import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardTitle } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ExerciseSearchModal } from '../components/ExerciseSearchModal';
import { LineChart } from '../components/LineChart';
import { ScreenHeader } from '../components/ScreenHeader';
import { getExerciseCatalog, getProgressForExercise, type ProgressPoint } from '../db/repository';
import { colors, fontSize, radius, spacing } from '../theme';
import type { ExerciseCatalogEntry } from '../types';
import { formatDateDisplay } from '../utils/date';
import { formatDateShort, formatDelta, formatWeight } from '../utils/format';

const NO_MACHINE = '';

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, accent && styles.miniValueAccent]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const up = delta > 0;
  const flat = delta === 0;
  const color = flat ? colors.textMuted : up ? colors.success : colors.danger;
  const bg = flat ? colors.surfaceAlt : up ? colors.successSoft : colors.dangerSoft;
  return (
    <View style={[styles.deltaPill, { backgroundColor: bg }]}>
      <Ionicons name={flat ? 'remove' : up ? 'arrow-up' : 'arrow-down'} size={12} color={color} />
      <Text style={[styles.deltaText, { color }]}>{formatDelta(delta)}</Text>
    </View>
  );
}

export function ProgressScreen() {
  const [catalog, setCatalog] = useState<ExerciseCatalogEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [allPoints, setAllPoints] = useState<ProgressPoint[]>([]);
  const [machineFilter, setMachineFilter] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getExerciseCatalog().then((list) => {
        if (!active) return;
        setCatalog(list);
        setSelected((prev) => {
          if (prev && list.some((e) => e.name.toLowerCase() === prev.toLowerCase())) return prev;
          return list[0]?.name ?? null;
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
        setAllPoints([]);
        return;
      }
      let active = true;
      getProgressForExercise(selected).then((p) => {
        if (active) setAllPoints(p);
      });
      return () => {
        active = false;
      };
    }, [selected])
  );

  const machines = useMemo(() => {
    const seen: string[] = [];
    for (const p of allPoints) if (!seen.includes(p.machine)) seen.push(p.machine);
    return seen;
  }, [allPoints]);

  const activeFilter = machineFilter !== null && machines.includes(machineFilter) ? machineFilter : null;
  const points = activeFilter === null ? allPoints : allPoints.filter((p) => p.machine === activeFilter);

  const best = points.reduce<ProgressPoint | null>((acc, p) => (!acc || p.effectiveWeight > acc.effectiveWeight ? p : acc), null);
  const latest = points.length > 0 ? points[points.length - 1] : null;
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const delta = latest && previous ? latest.effectiveWeight - previous.effectiveWeight : null;
  const chartPoints = points.map((p) => ({ label: formatDateShort(p.date), value: p.effectiveWeight }));
  const newestFirst = [...points].reverse();
  const showMachineTags = activeFilter === null && machines.length > 1;

  function selectExercise(name: string) {
    setSelected(name);
    setMachineFilter(null);
    setPicking(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Progress"
        subtitle={catalog.length > 0 ? `${catalog.length} exercise${catalog.length === 1 ? '' : 's'} tracked` : undefined}
      />
      {catalog.length === 0 ? (
        <EmptyState icon="trending-up-outline" title="Nothing to chart yet" body="Log a session and your exercises will show up here." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable style={({ pressed }) => [styles.selector, pressed && styles.selectorPressed]} onPress={() => setPicking(true)}>
            <View style={styles.selectorIcon}>
              <Ionicons name="barbell" size={20} color={colors.primary} />
            </View>
            <View style={styles.selectorText}>
              <Text style={styles.selectorLabel}>EXERCISE</Text>
              <Text style={styles.selectorValue} numberOfLines={1}>
                {selected ?? 'Choose an exercise'}
              </Text>
            </View>
            <Ionicons name="search" size={20} color={colors.textMuted} />
          </Pressable>

          {machines.length > 1 && (
            <View style={styles.machineBlock}>
              <Text style={styles.machineLabel}>MACHINE — numbers only compare on the same one</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
                <Pressable style={[styles.chip, activeFilter === null && styles.chipActive]} onPress={() => setMachineFilter(null)}>
                  <Text style={[styles.chipText, activeFilter === null && styles.chipTextActive]}>ALL</Text>
                </Pressable>
                {machines.map((m) => {
                  const active = activeFilter === m;
                  return (
                    <Pressable key={m || '__none'} style={[styles.chip, active && styles.chipActive]} onPress={() => setMachineFilter(m)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{m === NO_MACHINE ? 'NO MACHINE' : m}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.statRow}>
            <MiniStat label="Best" value={best ? formatWeight(best.effectiveWeight) : '–'} accent />
            <MiniStat label="Latest" value={latest ? formatWeight(latest.effectiveWeight) : '–'} />
            <MiniStat label="Sessions" value={String(points.length)} />
          </View>

          <Card>
            <CardTitle title="Best effective weight (kg)" right={delta !== null ? <DeltaPill delta={delta} /> : undefined} />
            <LineChart points={chartPoints} />
          </Card>

          <Card>
            <CardTitle title="Sessions" />
            {newestFirst.map((p, i) => {
              const older = newestFirst[i + 1];
              const d = older ? p.effectiveWeight - older.effectiveWeight : null;
              return (
                <View key={`${p.date}-${i}`} style={[styles.pointRow, i === newestFirst.length - 1 && styles.pointRowLast]}>
                  <View style={styles.pointLeft}>
                    <Text style={styles.pointDate}>{formatDateDisplay(p.date)}</Text>
                    {(p.sessionName || (showMachineTags && p.machine)) && (
                      <Text style={styles.pointSub} numberOfLines={1}>
                        {[p.sessionName, showMachineTags ? p.machine : ''].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.pointRight}>
                    {d !== null && d !== 0 && (
                      <Text style={[styles.pointDelta, { color: d > 0 ? colors.success : colors.danger }]}>{formatDelta(d)}</Text>
                    )}
                    <Text style={styles.pointValue}>
                      {formatWeight(p.effectiveWeight)} × {p.reps}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </ScrollView>
      )}

      <ExerciseSearchModal visible={picking} entries={catalog} selected={selected} onClose={() => setPicking(false)} onSelect={selectExercise} />
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  selectorPressed: {
    opacity: 0.85,
  },
  selectorIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    flex: 1,
  },
  selectorLabel: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  selectorValue: {
    color: colors.text,
    fontSize: fontSize.h3,
    fontWeight: '700',
    marginTop: 2,
  },
  machineBlock: {
    marginBottom: spacing.md,
  },
  machineLabel: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.xs + 2,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chips: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: colors.primary,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  miniStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  miniValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  miniValueAccent: {
    color: colors.primary,
  },
  miniLabel: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  deltaText: {
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  pointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pointRowLast: {
    borderBottomWidth: 0,
  },
  pointLeft: {
    flex: 1,
  },
  pointDate: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  pointSub: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  pointRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pointDelta: {
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  pointValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.body,
  },
});
