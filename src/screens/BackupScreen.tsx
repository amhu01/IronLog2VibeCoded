import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { exportAllSessions, mergeData, replaceAllData } from '../db/repository';
import { colors, fontSize, radius, spacing } from '../theme';
import type { Exercise, Session, SetEntry } from '../types';
import { todayString } from '../utils/date';

type ImportedSession = Omit<Session, 'id'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseBackup(raw: unknown): ImportedSession[] {
  const list = Array.isArray(raw)
    ? raw
    : isPlainObject(raw) && Array.isArray(raw.sessions)
      ? raw.sessions
      : null;
  if (!list) throw new Error('Backup must be a JSON array of sessions (or an object with a "sessions" array).');

  return list.map((s, i) => {
    if (!isPlainObject(s) || typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
      throw new Error(`Session ${i + 1} is missing a valid date (YYYY-MM-DD).`);
    }
    const exercisesRaw = Array.isArray(s.exercises) ? s.exercises : [];
    const exercises: Exercise[] = exercisesRaw.map((e, j) => {
      if (!isPlainObject(e) || typeof e.name !== 'string' || !e.name.trim()) {
        throw new Error(`Session ${i + 1}, exercise ${j + 1} is missing a name.`);
      }
      const setsRaw = Array.isArray(e.sets) ? e.sets : [];
      const sets: SetEntry[] = setsRaw.map((st) => {
        const o = isPlainObject(st) ? st : {};
        const weight = typeof o.weight === 'number' || typeof o.weight === 'string' ? o.weight : '';
        const reps = typeof o.reps === 'number' || typeof o.reps === 'string' ? o.reps : '';
        return { weight, reps, rir: !!o.rir };
      });
      const ex: Exercise = { name: e.name.trim().toUpperCase(), sets };
      if (e.hasBaseResistance) {
        ex.hasBaseResistance = true;
        ex.baseResistance = typeof e.baseResistance === 'number' ? e.baseResistance : Number(e.baseResistance) || 0;
      }
      return ex;
    });
    return { date: s.date, exercises };
  });
}

function SectionIcon({ name }: { name: IconName }) {
  return (
    <View style={styles.sectionIcon}>
      <Ionicons name={name} size={20} color={colors.primary} />
    </View>
  );
}

export function BackupScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setStatus(null);
    try {
      const sessions = await exportAllSessions();
      const payload = sessions.map(({ id: _id, ...rest }) => rest);
      const file = new File(Paths.cache, `iron-log-backup-${todayString()}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(payload, null, 2));

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Iron Log backup',
        UTI: 'public.json',
      });
      setStatus(`Exported ${payload.length} session${payload.length === 1 ? '' : 's'}.`);
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setStatus(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setImporting(true);
    try {
      const text = await new File(result.assets[0].uri).text();
      const sessions = parseBackup(JSON.parse(text));

      Alert.alert(
        'Import backup',
        `Found ${sessions.length} session${sessions.length === 1 ? '' : 's'}. Merge them into your existing data, or replace everything?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setImporting(false) },
          {
            text: 'Merge',
            onPress: async () => {
              try {
                await mergeData(sessions);
                setStatus(`Merged ${sessions.length} session${sessions.length === 1 ? '' : 's'}.`);
              } catch (e) {
                Alert.alert('Import failed', String(e));
              } finally {
                setImporting(false);
              }
            },
          },
          {
            text: 'Replace all',
            style: 'destructive',
            onPress: async () => {
              try {
                await replaceAllData(sessions);
                setStatus(`Replaced all data with ${sessions.length} session${sessions.length === 1 ? '' : 's'}.`);
              } catch (e) {
                Alert.alert('Import failed', String(e));
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      setImporting(false);
      Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Backup" subtitle="Your data never leaves this phone unless you export it" />
      <ScrollView contentContainerStyle={styles.content}>
        {status && (
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}

        <Card>
          <View style={styles.cardHeader}>
            <SectionIcon name="cloud-upload-outline" />
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Export</Text>
              <Text style={styles.cardBody}>
                Saves every session to a JSON file and opens the share sheet so you can send it to Drive, Files, or
                anywhere else.
              </Text>
            </View>
          </View>
          <Button title="Export to JSON" icon="share-outline" onPress={handleExport} loading={exporting} />
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <SectionIcon name="cloud-download-outline" />
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Import / restore</Text>
              <Text style={styles.cardBody}>
                Pick a previously exported JSON file. You'll be asked whether to merge it into your existing data or
                replace everything.
              </Text>
            </View>
          </View>
          <Button title="Import from JSON" variant="secondary" icon="folder-open-outline" onPress={handleImport} loading={importing} />
        </Card>
      </ScrollView>
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statusText: {
    color: colors.success,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 19,
  },
});
