import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSessionsList, type SessionListItem } from '../db/repository';
import type { HistoryStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { formatDateDisplay } from '../utils/date';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryList'>;

export function HistoryScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getSessionsList()
        .then(setSessions)
        .finally(() => setLoading(false));
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>History</Text>
      {!loading && sessions.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No sessions logged yet.</Text>
        </View>
      )}
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
          >
            <Text style={styles.date}>{formatDateDisplay(item.date)}</Text>
            <Text style={styles.exercises} numberOfLines={1}>
              {item.exerciseNames.join(', ') || 'No exercises'}
            </Text>
          </Pressable>
        )}
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
  list: {
    padding: spacing.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  date: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  exercises: {
    color: colors.textMuted,
    fontSize: 14,
  },
  empty: {
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
});
