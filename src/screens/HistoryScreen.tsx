import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { getSessionsList, type SessionListItem } from '../db/repository';
import type { HistoryStackParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import { formatDateParts } from '../utils/format';

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
      <ScreenHeader
        title="History"
        subtitle={sessions.length > 0 ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}` : undefined}
      />
      {!loading && sessions.length === 0 && (
        <EmptyState icon="time-outline" title="No sessions yet" body="Your logged workouts will show up here, newest first." />
      )}
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const { day, month, weekday } = formatDateParts(item.date);
          const count = item.exerciseNames.length;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
            >
              <View style={styles.dateBox}>
                <Text style={styles.day}>{day}</Text>
                <Text style={styles.month}>{month}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.weekday}>
                  {weekday} · {count} exercise{count === 1 ? '' : 's'}
                </Text>
                <Text style={styles.exercises} numberOfLines={2}>
                  {item.exerciseNames.join(' · ') || 'No exercises'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    opacity: 0.85,
  },
  dateBox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  day: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  month: {
    color: colors.primary,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1,
  },
  body: {
    flex: 1,
  },
  weekday: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  exercises: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    lineHeight: 20,
  },
});
