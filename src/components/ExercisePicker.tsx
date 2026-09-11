import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface ExercisePickerProps {
  knownNames: string[];
  onSubmit: (name: string) => void;
}

export function ExercisePicker({ knownNames, onSubmit }: ExercisePickerProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return knownNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 6);
  }, [text, knownNames]);

  function submit(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
    setFocused(false);
  }

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Exercise name (e.g. Bench Press)"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={() => submit(text)}
          returnKeyType="done"
        />
        <Pressable style={styles.addBtn} onPress={() => submit(text)}>
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      {focused && suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item}
          style={styles.suggestions}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={styles.suggestionRow} onPress={() => submit(item)}>
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  addBtnText: {
    color: colors.primaryText,
    fontWeight: '600',
  },
  suggestions: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    maxHeight: 180,
  },
  suggestionRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 15,
  },
});
