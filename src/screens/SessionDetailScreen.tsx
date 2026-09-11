import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SessionEditor } from '../components/SessionEditor';
import { deleteSession, getAllExerciseNames, getSessionDetail, updateSession } from '../db/repository';
import type { HistoryStackParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import type { Session } from '../types';
import { formatDateDisplay } from '../utils/date';
import { formatWeight } from '../utils/format';
import { exerciseToDraft } from '../utils/sessionDraft';

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

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatDateDisplay(session.date)}</Text>
        <Text style={styles.meta}>
          {session.exercises.length} exercise{session.exercises.length === 1 ? '' : 's'} · {totalSets} set
          {totalSets === 1 ? '' : 's'}
        </Text>

        {session.exercises.map((ex, i) => (
          <Card key={i}>
            <View style={styles.exHeader}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{i + 1}</Text>
              </View>
              <Text style={styles.exName} numberOfLines={2}>
                {ex.name}
              </Text>
              {ex.hasBaseResistance && <Tag text={`base ${formatWeight(ex.baseResistance ?? 0)}`} />}
            </View>
            {ex.sets.map((s, j) => {
              const effective = ex.hasBaseResistance ? (ex.baseResistance ?? 0) + (Number(s.weight) || 0) : null;
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
          <Button title="Edit session" icon="create-outline" onPress={() => setEditing(true)} />
          <View style={{ height: spacing.sm }} />
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
  date: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  meta: {
    color: colors.textMuted,
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
  cancelWrap: {
    marginTop: spacing.sm,
  },
});
