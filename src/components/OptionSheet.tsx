import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing, themed } from '../theme';
import { t } from '../i18n';

export interface Option {
  value: string;
  label: string;
  sub?: string;
}

/** Lists that only grow (machines, session names) get a search box once they're this long. */
const SEARCH_THRESHOLD = 7;

interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: Option[];
  selected?: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
}

/** A bottom-sheet dropdown: replaces chip rows that stop scaling once the list gets long. */
export function OptionSheet({ visible, title, options, selected, onSelect, onClose }: OptionSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        {options.length >= SEARCH_THRESHOLD && (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('SEARCH')}
              placeholderTextColor={colors.textFaint}
              value={query}
              onChangeText={(v) => setQuery(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        )}
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.value || '__blank'}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('Nothing matches.')}</Text>}
          renderItem={({ item, index }) => {
            const active = item.value === selected;
            return (
              <Pressable
                style={({ pressed }) => [styles.row, index === filtered.length - 1 && styles.rowLast, pressed && styles.rowPressed]}
                onPress={() => onSelect(item.value)}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
                  {item.sub ? <Text style={styles.sub}>{item.sub}</Text> : null}
                </View>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

/** The closed state of a dropdown: label, current value and a chevron. */
export function SelectField({ label, value, onPress, icon }: SelectFieldProps) {
  return (
    <Pressable style={({ pressed }) => [styles.field, pressed && styles.rowPressed]} onPress={onPress}>
      {icon && <Ionicons name={icon} size={18} color={colors.primary} />}
      <View style={styles.rowText}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = themed(() => ({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.h2,
    fontWeight: '800',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
    paddingVertical: 10,
  },
  list: {
    flexGrow: 0,
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.primary,
  },
  sub: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    marginTop: 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  fieldLabel: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fieldValue: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
    marginTop: 1,
  },
}));
