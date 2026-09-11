import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../theme';

interface ExerciseSearchModalProps {
  visible: boolean;
  names: string[];
  selected?: string | null;
  allowCreate?: boolean;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function ExerciseSearchModal({ visible, names, selected, allowCreate, onSelect, onClose }: ExerciseSearchModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const q = query.trim();
  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return lower ? names.filter((n) => n.toLowerCase().includes(lower)) : names;
  }, [names, q]);

  const exactExists = q !== '' && names.some((n) => n.toLowerCase() === q.toLowerCase());
  const canCreate = !!allowCreate && q !== '' && !exactExists;

  function handleSubmit() {
    if (canCreate) onSelect(q);
    else if (filtered.length === 1) onSelect(filtered[0]);
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
        <Text style={styles.count}>
          {filtered.length} of {names.length} exercise{names.length === 1 ? '' : 's'}
        </Text>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
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
              <Text style={styles.emptyText}>{names.length === 0 ? 'No exercises yet' : 'No matches'}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = !!selected && selected.toLowerCase() === item.toLowerCase();
            return (
              <Pressable style={[styles.row, active && styles.rowActive]} onPress={() => onSelect(item)}>
                <Text style={[styles.rowText, active && styles.rowTextActive]}>{item}</Text>
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
    paddingVertical: 14,
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
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    flex: 1,
  },
  rowTextActive: {
    color: colors.primary,
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
