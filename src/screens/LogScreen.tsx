import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SessionEditor } from '../components/SessionEditor';
import { createSession, getAllExerciseNames } from '../db/repository';
import { colors, spacing } from '../theme';
import { todayString } from '../utils/date';

export function LogScreen() {
  const [knownNames, setKnownNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAllExerciseNames().then(setKnownNames).catch(() => {});
    }, [])
  );

  async function handleSave(date: string, exercises: Parameters<typeof createSession>[1]) {
    if (exercises.length === 0) {
      Alert.alert('Nothing to save', 'Add at least one exercise with a set.');
      return;
    }
    setSaving(true);
    try {
      await createSession(date, exercises);
      setSavedMessage(`Saved session for ${date}`);
      setFormKey((k) => k + 1);
      const names = await getAllExerciseNames();
      setKnownNames(names);
      setTimeout(() => setSavedMessage(null), 2500);
    } catch (e) {
      Alert.alert('Failed to save', String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Log</Text>
      {savedMessage && <Text style={styles.savedBanner}>{savedMessage}</Text>}
      <SessionEditor
        key={formKey}
        initialDate={todayString()}
        initialExercises={[]}
        knownNames={knownNames}
        saveLabel="Save session"
        saving={saving}
        onSave={handleSave}
      />
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
  savedBanner: {
    color: colors.success,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    fontSize: 13,
  },
});
