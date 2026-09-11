import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { SessionEditor } from '../components/SessionEditor';
import {
  deleteSession,
  getAllExerciseNames,
  getSessionDetail,
  updateSession,
} from '../db/repository';
import type { HistoryStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { exerciseToDraft } from '../utils/sessionDraft';
import { formatDateDisplay } from '../utils/date';
import type { Session } from '../types';

type Props = NativeStackScreenProps<HistoryStackParamList, 'SessionDetail'>;

export function SessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<Session | null>(null);
  const [editing, setEditing] = useState(false);
  const [knownNames, setKnownNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getSessionDetail(sessionId).then(setSession);
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      load();
      getAllExerciseNames().then(setKnownNames);
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

  async function handleSave(date: string, exercises: Session['exercises']) {
    setSaving(true);
    try {
      await updateSession(sessionId, date, exercises);
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
          initialExercises={session.exercises.map(exerciseToDraft)}
          knownNames={knownNames}
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatDateDisplay(session.date)}</Text>
        {session.exercises.map((ex, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.exName}>
              {ex.name}
              {ex.hasBaseResistance ? ` (base ${ex.baseResistance})` : ''}
            </Text>
            {ex.sets.map((s, j) => {
              const effective = ex.hasBaseResistance
                ? (ex.baseResistance ?? 0) + (Number(s.weight) || 0)
                : null;
              return (
                <Text key={j} style={styles.setLine}>
                  {s.weight} × {s.reps}
                  {effective !== null ? `  (effective ${effective})` : ''}
                  {s.rir ? '  · RIR' : ''}
                </Text>
              );
            })}
          </View>
        ))}
        <View style={styles.actions}>
          <Button title="Edit" onPress={() => setEditing(true)} />
          <View style={{ height: spacing.sm }} />
          <Button title="Delete session" variant="danger" onPress={handleDelete} />
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
  date: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  setLine: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 2,
  },
  actions: {
    marginTop: spacing.md,
  },
  cancelWrap: {
    marginTop: spacing.sm,
  },
});
