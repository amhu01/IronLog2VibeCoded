import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { dateToString, parseDateString } from '../utils/date';

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
      <Pressable style={styles.field} onPress={() => setShow(true)}>
        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{date}</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
