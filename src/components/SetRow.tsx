import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import type { DraftSet } from '../utils/sessionDraft';

interface SetRowProps {
  index: number;
  set: DraftSet;
  onChange: (set: DraftSet) => void;
  onRemove: () => void;
}

export function SetRow({ index, set, onChange, onRemove }: SetRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.index}>{index + 1}</Text>
      <TextInput
        style={styles.input}
        placeholder="Weight"
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
        value={set.weight}
        onChangeText={(v) => onChange({ ...set, weight: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Reps"
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
        value={set.reps}
        onChangeText={(v) => onChange({ ...set, reps: v })}
      />
      <Pressable
        style={[styles.rirBtn, set.rir && styles.rirBtnActive]}
        onPress={() => onChange({ ...set, rir: !set.rir })}
      >
        <Text style={[styles.rirText, set.rir && styles.rirTextActive]}>RIR</Text>
      </Pressable>
      <Pressable style={styles.removeBtn} onPress={onRemove}>
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  index: {
    color: colors.textMuted,
    width: 18,
    textAlign: 'center',
    fontSize: 13,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  rirBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rirBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rirText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  rirTextActive: {
    color: colors.primaryText,
  },
  removeBtn: {
    paddingHorizontal: spacing.xs,
  },
  removeText: {
    color: colors.danger,
    fontSize: 20,
    lineHeight: 20,
  },
});
