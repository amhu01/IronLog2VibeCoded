import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import type { ExerciseCatalogEntry } from '../types';
import { ExerciseSearchModal } from './ExerciseSearchModal';

interface ExercisePickerProps {
  catalog: ExerciseCatalogEntry[];
  onSubmit: (name: string) => void;
}

export function ExercisePicker({ catalog, onSubmit }: ExercisePickerProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [browsing, setBrowsing] = useState(false);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 6);
  }, [text, catalog]);

  function submit(name: string) {
    const normalized = name.trim().toUpperCase();
    if (!normalized) return;
    onSubmit(normalized);
    setText('');
    setFocused(false);
  }

  const hasText = text.trim() !== '';

  return (
    <View>
      <Text style={styles.label}>ADD EXERCISE</Text>
      <View style={styles.row}>
        <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
          <Ionicons name="barbell-outline" size={18} color={focused ? colors.primary : colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="E.G. BENCH PRESS"
            placeholderTextColor={colors.textFaint}
            value={text}
            onChangeText={(v) => setText(v.toUpperCase())}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onSubmitEditing={() => submit(text)}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>
        <Pressable style={styles.iconBtn} onPress={() => setBrowsing(true)} hitSlop={4}>
          <Ionicons name="list" size={22} color={colors.text} />
        </Pressable>
        <Pressable style={[styles.addBtn, !hasText && styles.addBtnDisabled]} onPress={() => submit(text)} disabled={!hasText} hitSlop={4}>
          <Ionicons name="add" size={24} color={colors.primaryText} />
        </Pressable>
      </View>

      {focused && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((item, i) => (
            <Pressable
              key={item.name}
              style={[styles.suggestionRow, i === suggestions.length - 1 && styles.suggestionRowLast]}
              onPress={() => submit(item.name)}
            >
              <Ionicons name="time-outline" size={16} color={colors.textFaint} />
              <Text style={styles.suggestionText}>{item.name}</Text>
              {item.muscleGroup ? <Text style={styles.suggestionSub}>{item.muscleGroup}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}

      <ExerciseSearchModal
        visible={browsing}
        entries={catalog}
        allowCreate
        onClose={() => setBrowsing(false)}
        onSelect={(name) => {
          setBrowsing(false);
          submit(name);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    paddingVertical: 12,
  },
  iconBtn: {
    width: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  suggestions: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionRowLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  suggestionSub: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
