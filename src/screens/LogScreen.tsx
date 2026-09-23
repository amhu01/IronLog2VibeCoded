import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { SessionEditor } from '../components/SessionEditor';
import { createSession, findNewPRs, getAllMachines, getExerciseCatalog, getRecentSessionNames } from '../db/repository';
import type { RootTabParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import type { Exercise, ExerciseCatalogEntry, SessionTemplate } from '../types';
import { formatDateDisplay, todayString } from '../utils/date';
import { formatWeight } from '../utils/format';
import { exerciseToDraft } from '../utils/sessionDraft';

type Props = BottomTabScreenProps<RootTabParamList, 'Log'>;

interface Toast {
  text: string;
  pr: boolean;
  sessionId: number;
}

export function LogScreen({ route, navigation }: Props) {
  const [catalog, setCatalog] = useState<ExerciseCatalogEntry[]>([]);
  const [machines, setMachines] = useState<string[]>([]);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [template, setTemplate] = useState<SessionTemplate | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const refresh = useCallback(() => {
    Promise.all([getExerciseCatalog(), getAllMachines(), getRecentSessionNames()])
      .then(([c, m, n]) => {
        setCatalog(c);
        setMachines(m);
        setRecentNames(n);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(refresh);

  const incoming = route.params?.template;
  useEffect(() => {
    if (!incoming) return;
    setTemplate(incoming);
    setFormKey((k) => k + 1);
    navigation.setParams({ template: undefined });
  }, [incoming, navigation]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.pr ? 6000 : 2500);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleSave(date: string, name: string, exercises: Exercise[]) {
    if (exercises.length === 0) {
      Alert.alert('Nothing to save', 'Add at least one exercise with a set.');
      return;
    }
    setSaving(true);
    try {
      const prs = await findNewPRs(exercises);
      const sessionId = await createSession(date, exercises, name);
      const label = name ? `“${name}”` : 'session';
      const prText = prs.length
        ? ` · NEW PR: ${prs.map((p) => `${p.name}${p.machine ? ` (${p.machine})` : ''} ${formatWeight(p.effectiveWeight)}`).join(', ')}`
        : '';
      setToast({ text: `Saved ${label} for ${formatDateDisplay(date)}${prText}`, pr: prs.length > 0, sessionId });
      setTemplate(null);
      setFormKey((k) => k + 1);
      refresh();
    } catch (e) {
      Alert.alert('Failed to save', String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Log"
        subtitle={template ? `Repeating ${template.name ? `“${template.name}”` : 'a previous session'} — adjust and save` : formatDateDisplay(todayString())}
      />
      {toast && (
        <View style={[styles.toast, toast.pr && styles.toastPr]}>
          <Ionicons name={toast.pr ? 'trophy' : 'checkmark-circle'} size={18} color={toast.pr ? colors.primary : colors.success} />
          <Text style={[styles.toastText, toast.pr && styles.toastTextPr]}>{toast.text}</Text>
          <Pressable
            style={styles.toastAction}
            onPress={() => navigation.navigate('History', { screen: 'SessionSummary', params: { sessionId: toast.sessionId } })}
            hitSlop={6}
          >
            <Text style={[styles.toastActionText, toast.pr && styles.toastTextPr]}>SUMMARY</Text>
          </Pressable>
        </View>
      )}
      <SessionEditor
        key={formKey}
        initialDate={todayString()}
        initialName={template?.name ?? ''}
        initialExercises={template ? template.exercises.map(exerciseToDraft) : []}
        catalog={catalog}
        allMachines={machines}
        recentNames={recentNames}
        saveLabel="Save session"
        saving={saving}
        showRestTimer
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
  toastPr: {
    backgroundColor: colors.primarySoft,
  },
  toastText: {
    flex: 1,
    color: colors.success,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  toastTextPr: {
    color: colors.primary,
  },
  toastAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  toastActionText: {
    color: colors.success,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
});
