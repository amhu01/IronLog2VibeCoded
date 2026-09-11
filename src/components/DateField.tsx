import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import { dateToString, formatDateDisplay, parseDateString } from '../utils/date';

interface DateFieldProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export function DateField({ date, onChange }: DateFieldProps) {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    setShow(Platform.OS === 'ios');
    if (event.type === 'set' && selected) {
      onChange(dateToString(selected));
    }
  }

  return (
    <>
      <Pressable style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]} onPress={() => setShow(true)}>
        <View style={styles.icon}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>DATE</Text>
          <Text style={styles.value}>{formatDateDisplay(date)}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {show && (
        <DateTimePicker
          value={parseDateString(date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fieldPressed: {
    opacity: 0.85,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  value: {
    color: colors.text,
    fontSize: fontSize.h3,
    fontWeight: '700',
    marginTop: 1,
  },
});
