import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SessionEditor } from '../components/SessionEditor';
import {
  deleteSession,
  getAllMachines,
  getExerciseCatalog,
  getRecentSessionNames,
  getSessionDetail,
  updateSession,
} from '../db/repository';
import type { HistoryStackParamList, RootTabParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import type { Exercise, ExerciseCatalogEntry, Session } from '../types';
import { formatDateDisplay } from '../utils/date';
import { formatVolume, formatWeight } from '../utils/format';
import { exerciseToDraft } from '../utils/sessionDraft';
import { countSets, sessionVolume, setEffectiveWeight } from '../utils/stats';

type Props = NativeStackScreenProps<HistoryStackParamList, 'SessionDetail'>;

function Tag({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <View style={[styles.tag, accent && styles.tagAccent]}>
      <Text style={[styles.tagText, accent && styles.tagTextAccent]}>{text}</Text>
    </View>
  );
}

export function SessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<Session | null>(null);
  const [editing, setEditing] = useState(false);
  const [catalog, setCatalog] = useState<ExerciseCatalogEntry[]>([]);
  const [machines, setMachines] = useState<string[]>([]);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getSessionDetail(sessionId).then(setSession);
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      load();
      getExerciseCatalog().then(setCatalog);
      getAllMachines().then(setMachines);
      getRecentSessionNames().then(setRecentNames);
    }, [load])
  );

  function handleDelete() {
    Alert.alert('Delete session', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(sessionId);
          navigation.goBack();
        },
      },
    ]);
  }

  function handleRepeat() {
    if (!session) return;
    navigation
      .getParent<BottomTabNavigationProp<RootTabParamList>>()
      ?.navigate('Log', { template: { name: session.name ?? '', exercises: session.exercises } });
  }

  async function handleSave(date: string, name: string, exercises: Exercise[]) {
    setSaving(true);
    try {
      await updateSession(sessionId, date, exercises, name);
      setEditing(false);
      load();
    } catch (e) {
      Alert.alert('Failed to save', String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  if (editing) {
    return (
      <View style={styles.container}>
        <SessionEditor
          initialDate={session.date}
          initialName={session.name ?? ''}
          initialExercises={session.exercises.map(exerciseToDraft)}
          catalog={catalog}
          allMachines={machines}
          recentNames={recentNames}
          saveLabel="Save changes"
          saving={saving}
          onSave={handleSave}
          extraActions={
            <View style={styles.cancelWrap}>
              <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
            </View>
          }
        />
      </View>
    );
  }

  const totalSets = countSets(session.exercises);
  const volume = sessionVolume(session.exercises);
  const metaParts = [
    `${session.exercises.length} exercise${session.exercises.length === 1 ? '' : 's'}`,
    `${totalSets} set${totalSets === 1 ? '' : 's'}`,
  ];
  if (volume > 0) metaParts.push(`${formatVolume(volume)} volume`);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {session.name ? (
          <>
            <Text style={styles.title}>{session.name}</Text>
            <Text style={styles.date}>{formatDateDisplay(session.date)}</Text>
          </>
        ) : (
          <Text style={styles.title}>{formatDateDisplay(session.date)}</Text>
        )}
        <Text style={styles.meta}>{metaParts.join(' · ')}</Text>

        {session.exercises.map((ex, i) => (
          <Card key={i}>
            <View style={styles.exHeader}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{i + 1}</Text>
              </View>
              <Text style={styles.exName} numberOfLines={2}>
                {ex.name}
              </Text>
            </View>
            {(ex.muscleGroup || ex.machine || ex.hasBaseResistance) && (
              <View style={styles.exTags}>
                {ex.muscleGroup ? <Tag text={ex.muscleGroup} accent /> : null}
                {ex.machine ? <Tag text={ex.machine} /> : null}
                {ex.hasBaseResistance ? <Tag text={`base ${formatWeight(ex.baseResistance ?? 0)}`} /> : null}
              </View>
            )}
            {ex.sets.map((s, j) => {
              const effective = ex.hasBaseResistance ? setEffectiveWeight(ex, s.weight) : null;
              return (
                <View key={j} style={[styles.setRow, j === ex.sets.length - 1 && styles.setRowLast]}>
                  <Text style={styles.setIndex}>SET {j + 1}</Text>
                  <Text style={styles.setValue}>
                    {s.weight} × {s.reps}
                  </Text>
                  <View style={styles.setTags}>
                    {effective !== null && <Tag text={`eff ${formatWeight(effective)}`} />}
                    {s.rir && <Tag text="RIR" accent />}
                  </View>
                </View>
              );
            })}
          </Card>
        ))}

        <View style={styles.actions}>
          <Button title="Repeat this session" variant="secondary" icon="repeat" onPress={handleRepeat} />
          <View style={styles.gap} />
          <Button title="Edit session" icon="create-outline" onPress={() => setEditing(true)} />
          <View style={styles.gap} />
          <Button title="Delete session" variant="ghostDanger" icon="trash-outline" onPress={handleDelete} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    color: colors.textMuted,
    padding: spacing.md,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    marginTop: 2,
  },
  meta: {
    color: colors.textFaint,
    fontSize: fontSize.small,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: colors.primary,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  exName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.h3,
    fontWeight: '700',
  },
  exTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  setRowLast: {
    borderBottomWidth: 0,
  },
  setIndex: {
    width: 44,
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  setValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  setTags: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tagAccent: {
    backgroundColor: colors.primarySoft,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '700',
  },
  tagTextAccent: {
    color: colors.primary,
  },
  actions: {
    marginTop: spacing.sm,
  },
  gap: {
    height: spacing.sm,
  },
  cancelWrap: {
    marginTop: spacing.sm,
  },
});
