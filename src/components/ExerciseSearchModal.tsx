import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../theme';
import { MUSCLE_GROUPS } from '../types';

export interface ExerciseSearchEntry {
  name: string;
  muscleGroup: string;
}

interface ExerciseSearchModalProps {
  visible: boolean;
  entries: ExerciseSearchEntry[];
  selected?: string | null;
  allowCreate?: boolean;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function ExerciseSearchModal({ visible, entries, selected, allowCreate, onSelect, onClose }: ExerciseSearchModalProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setGroup(null);
    }
  }, [visible]);

  const groups = useMemo(() => {
    const present = new Set(entries.map((e) => e.muscleGroup).filter(Boolean));
    return MUSCLE_GROUPS.filter((g) => present.has(g));
  }, [entries]);

  const q = query.trim();
  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return entries.filter(
      (e) => (group === null || e.muscleGroup === group) && (lower === '' || e.name.toLowerCase().includes(lower))
    );
  }, [entries, q, group]);

  const exactExists = q !== '' && entries.some((e) => e.name.toLowerCase() === q.toLowerCase());
  const canCreate = !!allowCreate && q !== '' && !exactExists;

  function handleSubmit() {
    if (canCreate) onSelect(q);
    else if (filtered.length === 1) onSelect(filtered[0].name);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Exercises</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="SEARCH EXERCISES"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={(v) => setQuery(v.toUpperCase())}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
          />
          {query !== '' && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {groups.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable style={[styles.chip, group === null && styles.chipActive]} onPress={() => setGroup(null)}>
              <Text style={[styles.chipText, group === null && styles.chipTextActive]}>ALL</Text>
            </Pressable>
            {groups.map((g) => (
              <Pressable key={g} style={[styles.chip, group === g && styles.chipActive]} onPress={() => setGroup(group === g ? null : g)}>
                <Text style={[styles.chipText, group === g && styles.chipTextActive]}>{g}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Text style={styles.count}>
          {filtered.length} of {entries.length} exercise{entries.length === 1 ? '' : 's'}
        </Text>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            canCreate ? (
              <Pressable style={[styles.row, styles.createRow]} onPress={() => onSelect(q)}>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
                <Text style={styles.createText}>Add “{q}”</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="barbell-outline" size={28} color={colors.textFaint} />
              <Text style={styles.emptyText}>{entries.length === 0 ? 'No exercises yet' : 'No matches'}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = !!selected && selected.toLowerCase() === item.name.toLowerCase();
            return (
              <Pressable style={[styles.row, active && styles.rowActive]} onPress={() => onSelect(item.name)}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowName, active && styles.rowNameActive]}>{item.name}</Text>
                  {item.muscleGroup ? <Text style={styles.rowSub}>{item.muscleGroup}</Text> : null}
                </View>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.h2,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.h3,
    paddingVertical: 12,
  },
  // A horizontal ScrollView stretches to fill a flex column parent, and its content
  // container then stretches every chip to that height. Pin the height instead.
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chips: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
  count: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  rowNameActive: {
    color: colors.primary,
  },
  rowSub: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  createRow: {
    justifyContent: 'flex-start',
    gap: spacing.sm,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  createText: {
    color: colors.primary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
});
