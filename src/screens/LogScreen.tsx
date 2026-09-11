import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { SessionEditor } from '../components/SessionEditor';
import { createSession, getAllExerciseNames } from '../db/repository';
import { colors, fontSize, radius, spacing } from '../theme';
import { formatDateDisplay, todayString } from '../utils/date';

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
      setSavedMessage(`Saved session for ${formatDateDisplay(date)}`);
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
      <ScreenHeader title="Log" subtitle={formatDateDisplay(todayString())} />
      {savedMessage && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.toastText}>{savedMessage}</Text>
        </View>
      )}
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
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  toastText: {
    color: colors.success,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
});
