import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
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
      <View style={styles.indexBox}>
        <Text style={styles.index}>{index + 1}</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor={colors.textFaint}
        keyboardType="numbers-and-punctuation"
        value={set.weight}
        onChangeText={(v) => onChange({ ...set, weight: v })}
        selectTextOnFocus
      />
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor={colors.textFaint}
        keyboardType="numbers-and-punctuation"
        value={set.reps}
        onChangeText={(v) => onChange({ ...set, reps: v })}
        selectTextOnFocus
      />
      <Pressable
        style={[styles.wsBtn, set.ws && styles.wsBtnActive]}
        onPress={() => onChange({ ...set, ws: !set.ws })}
        hitSlop={4}
      >
        <Text style={[styles.wsText, set.ws && styles.wsTextActive]}>WS</Text>
      </Pressable>
      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={6}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  indexBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  index: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 10,
    fontSize: fontSize.h3,
    fontWeight: '700',
  },
  wsBtn: {
    width: 44,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  wsText: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wsTextActive: {
    color: colors.primary,
  },
  removeBtn: {
    width: 30,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
