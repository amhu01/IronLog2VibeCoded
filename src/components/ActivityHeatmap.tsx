import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, fontSize, heat, spacing, themed } from '../theme';
import type { DayActivity } from '../types';
import { dateToString, formatDateDisplay, parseDateString, todayString } from '../utils/date';
import { monthShort, t, tn, weekdayInitials } from '../i18n';

const CELL = 15;
const GAP = 3;
const DAY_LABEL_WIDTH = 16;

export interface HeatCell {
  date: string;
  sets: number;
  sessions: number;
  /** 0 = nothing logged, 1–4 = share of the busiest day in view. */
  level: number;
  future: boolean;
}

export interface HeatmapGrid {
  /** Columns are Monday-first weeks, oldest on the left; the last column holds today. */
  weeks: HeatCell[][];
  /** Month index 0–11; the label text is chosen at render so it follows the app language. */
  monthLabels: { col: number; month: number }[];
  trainingDays: number;
}

/** Pure so it can be checked headlessly; `today` is a YYYY-MM-DD string. */
export function buildHeatmap(activity: DayActivity[], today: string, weekCount: number): HeatmapGrid {
  const byDate = new Map(activity.map((a) => [a.date, a]));
  const end = parseDateString(today);
  const mondayOffset = (end.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - mondayOffset - (weekCount - 1) * 7);

  const weeks: HeatCell[][] = [];
  let max = 0;
  for (let w = 0; w < weekCount; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      // Built from y/m/d each time rather than adding 24 h, so DST shifts can't skip or repeat a day.
      const date = dateToString(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d));
      const a = byDate.get(date);
      const future = date > today;
      const sets = future ? 0 : a?.sets ?? 0;
      const sessions = future ? 0 : a?.sessions ?? 0;
      max = Math.max(max, sets);
      col.push({ date, sets, sessions, level: 0, future });
    }
    weeks.push(col);
  }

  let trainingDays = 0;
  for (const col of weeks) {
    for (const cell of col) {
      if (cell.sessions > 0) trainingDays += 1;
      // A session logged with no sets still counts as a training day, at the lowest level.
      if (cell.sessions > 0) cell.level = max > 0 ? Math.max(1, Math.ceil((cell.sets / max) * 4)) : 1;
    }
  }

  // A month is labelled over the week holding its 1st; the leftmost column gets its own
  // month too unless that label would crowd the next one.
  const monthOf = (date: string) => Number(date.slice(5, 7)) - 1;
  const monthLabels: { col: number; month: number }[] = [];
  weeks.forEach((col, i) => {
    const first = col.find((c) => c.date.endsWith('-01'));
    if (first) monthLabels.push({ col: i, month: monthOf(first.date) });
  });
  if (monthLabels.length === 0 || monthLabels[0].col >= 3) monthLabels.unshift({ col: 0, month: monthOf(weeks[0][0].date) });

  return { weeks, monthLabels, trainingDays };
}

function describe(cell: HeatCell): string {
  const when = formatDateDisplay(cell.date);
  if (cell.sessions === 0) return t('{date} — rest day', { date: when });
  const sessions = cell.sessions > 1 ? `${t('{n} sessions', { n: cell.sessions })} · ` : '';
  return `${when} — ${sessions}${tn(cell.sets, '{n} set', '{n} sets')}`;
}

export function ActivityHeatmap({ activity }: { activity: DayActivity[] }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<HeatCell | null>(null);

  const weekCount = width > 0 ? Math.max(8, Math.floor((width - DAY_LABEL_WIDTH + GAP) / (CELL + GAP))) : 0;
  const grid = useMemo(() => (weekCount > 0 ? buildHeatmap(activity, todayString(), weekCount) : null), [activity, weekCount]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {grid && (
        <>
          <Text style={styles.summary}>
            {tn(grid.trainingDays, '{n} training day in the last {weeks} weeks', '{n} training days in the last {weeks} weeks', {
              weeks: weekCount,
            })}
          </Text>
          <View style={styles.monthRow}>
            {grid.monthLabels.map((m) => (
              <Text key={`${m.col}-${m.month}`} style={[styles.monthLabel, { left: DAY_LABEL_WIDTH + m.col * (CELL + GAP) }]}>
                {monthShort(m.month)}
              </Text>
            ))}
          </View>
          <View style={styles.gridRow}>
            <View style={styles.dayLabels}>
              {weekdayInitials().map((d, i) => (
                <Text key={i} style={styles.dayLabel}>
                  {d}
                </Text>
              ))}
            </View>
            {grid.weeks.map((col) => (
              <View key={col[0].date} style={styles.col}>
                {col.map((cell) => (
                  <Pressable
                    key={cell.date}
                    disabled={cell.future}
                    onPress={() => setSelected(selected?.date === cell.date ? null : cell)}
                    hitSlop={1}
                    style={[
                      styles.cell,
                      { backgroundColor: cell.future ? 'transparent' : heat[cell.level] },
                      selected?.date === cell.date && styles.cellSelected,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <Text style={styles.detail} numberOfLines={1}>
              {selected ? describe(selected) : t('Tap a day for details')}
            </Text>
            <View style={styles.legend}>
              <Text style={styles.legendText}>{t('LESS')}</Text>
              {heat.map((c) => (
                <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />
              ))}
              <Text style={styles.legendText}>{t('MORE')}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = themed(() => ({
  summary: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    marginBottom: spacing.sm,
  },
  monthRow: {
    height: 16,
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  dayLabels: {
    width: DAY_LABEL_WIDTH - GAP,
    gap: GAP,
  },
  dayLabel: {
    height: CELL,
    lineHeight: CELL,
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '800',
  },
  col: {
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 4,
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
  },
  detail: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendText: {
    color: colors.textFaint,
    fontSize: 9,
    fontWeight: '800',
    marginHorizontal: 2,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
}));
