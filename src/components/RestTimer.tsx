import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

const PRESETS = [60, 90, 120];

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimer() {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(90);
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        Vibration.vibrate([0, 400, 200, 400]);
        setEndAt(null);
        setDone(true);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 4000);
    return () => clearTimeout(id);
  }, [done]);

  function start(seconds: number) {
    setTotal(seconds);
    setDone(false);
    setEndAt(Date.now() + seconds * 1000);
  }

  function extend() {
    if (endAt === null) return;
    setTotal((t) => t + 30);
    setEndAt(endAt + 30_000);
  }

  const running = endAt !== null;
  const progress = running && total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.row}>
        <View style={[styles.icon, done && styles.iconDone]}>
          <Ionicons name={done ? 'checkmark' : 'timer-outline'} size={18} color={done ? colors.success : colors.primary} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.label}>REST TIMER</Text>
          {running ? (
            <Text style={styles.countdown}>{mmss(remaining)}</Text>
          ) : (
            <Text style={[styles.hint, done && styles.hintDone]}>{done ? 'Rest over — go lift' : 'Tap a preset after a set'}</Text>
          )}
        </View>
        {running ? (
          <View style={styles.actions}>
            <Pressable style={styles.smallBtn} onPress={extend} hitSlop={4}>
              <Text style={styles.smallBtnText}>+30</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.stopBtn]} onPress={() => setEndAt(null)} hitSlop={4}>
              <Ionicons name="stop" size={14} color={colors.danger} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            {PRESETS.map((s) => (
              <Pressable key={s} style={styles.preset} onPress={() => start(s)} hitSlop={4}>
                <Text style={styles.presetText}>{s}s</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {running && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardDone: {
    borderColor: colors.success,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDone: {
    backgroundColor: colors.successSoft,
  },
  textCol: {
    flex: 1,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  countdown: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 28,
  },
  hint: {
    color: colors.textFaint,
    fontSize: fontSize.small,
    marginTop: 1,
  },
  hintDone: {
    color: colors.success,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  preset: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetText: {
    color: colors.text,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  smallBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    color: colors.primary,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  stopBtn: {
    backgroundColor: colors.dangerSoft,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.sm + 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
