import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type Svg from 'react-native-svg';
import { Button } from '../components/Button';
import { Card, CardTitle } from '../components/Card';
import { CARD_WIDTH, ShareCard, cardHeight } from '../components/ShareCard';
import { getSessionSummary } from '../db/repository';
import type { HistoryStackParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import type { SessionSummary } from '../types';
import { formatDateDisplay } from '../utils/date';
import { formatVolume, formatWeight } from '../utils/format';

type Props = NativeStackScreenProps<HistoryStackParamList, 'SessionSummary'>;

function summaryToText(summary: SessionSummary): string {
  const lines: string[] = [];
  lines.push(`IRON LOG — ${summary.name || 'WORKOUT'}`);
  lines.push(formatDateDisplay(summary.date));
  lines.push('');
  lines.push(`${formatVolume(summary.volume)} kg volume · ${summary.setCount} sets · ${summary.exerciseCount} exercises`);
  if (summary.muscleGroups.length > 0) lines.push(summary.muscleGroups.join(' · '));
  lines.push('');
  for (const ex of summary.exercises) {
    const bits = [ex.name];
    if (ex.machine) bits.push(`(${ex.machine})`);
    let line = `${bits.join(' ')} — ${ex.topSet}`;
    if (ex.isPR) line += `  PR${ex.prDelta !== null ? ` +${formatWeight(ex.prDelta)}` : ''}`;
    lines.push(line);
  }
  return lines.join('\n');
}

export function SessionSummaryScreen({ route }: Props) {
  const { sessionId } = route.params;
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [sharing, setSharing] = useState(false);
  const [scrim, setScrim] = useState(true);
  const svgRef = useRef<React.ElementRef<typeof Svg> | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      getSessionSummary(sessionId).then(setSummary);
    }, [sessionId])
  );

  async function handleShareImage() {
    const node = svgRef.current;
    if (!node || !summary) return;
    setSharing(true);
    try {
      const height = cardHeight(summary);
      const base64 = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Rendering the image timed out.')), 10000);
        try {
          node.toDataURL(
            (data: string) => {
              clearTimeout(timer);
              resolve(data);
            },
            { width: CARD_WIDTH, height }
          );
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      });

      const file = new File(Paths.cache, `iron-log-${summary.date}.png`);
      if (file.exists) file.delete();
      file.create();
      file.write(base64.replace(/^data:image\/png;base64,/, ''), { encoding: 'base64' });

      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: 'Share workout', UTI: 'public.png' });
    } catch (e) {
      Alert.alert('Could not share image', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  }

  async function handleShareText() {
    if (!summary) return;
    try {
      await Share.share({ message: summaryToText(summary) });
    } catch (e) {
      Alert.alert('Could not share', String(e));
    }
  }

  if (!summary) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  const previewWidth = screenWidth - spacing.md * 2 - spacing.md * 2;
  const scale = previewWidth / CARD_WIDTH;
  const fullHeight = cardHeight(summary);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <CardTitle
            title="Shareable card"
            right={
              <View style={styles.segment}>
                {([true, false] as const).map((value) => (
                  <Pressable
                    key={String(value)}
                    style={[styles.segmentBtn, scrim === value && styles.segmentBtnActive]}
                    onPress={() => setScrim(value)}
                  >
                    <Text style={[styles.segmentText, scrim === value && styles.segmentTextActive]}>
                      {value ? 'PANEL' : 'CLEAR'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            }
          />
          <Text style={styles.hint}>
            {scrim
              ? 'PNG with a see-through dark panel — the photo shows through but the text stays readable.'
              : 'Fully transparent PNG. Best over a dark photo; white text can disappear on a light one.'}
          </Text>
          <View style={styles.previewFrame}>
            <View style={[styles.checkerboard, { height: fullHeight * scale }]}>
              {Array.from({ length: Math.ceil((fullHeight * scale) / 24) }).map((_, row) => (
                <View key={row} style={styles.checkRow}>
                  {Array.from({ length: Math.ceil(previewWidth / 24) }).map((__, col) => (
                    <View key={col} style={[styles.checkCell, (row + col) % 2 === 0 && styles.checkCellAlt]} />
                  ))}
                </View>
              ))}
            </View>
            <View style={[styles.previewClip, { width: previewWidth, height: fullHeight * scale }]}>
              <View style={{ width: CARD_WIDTH, height: fullHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
                <ShareCard ref={svgRef} summary={summary} width={CARD_WIDTH} height={fullHeight} scrim={scrim} />
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button title="Share image" icon="image-outline" onPress={handleShareImage} loading={sharing} />
          <View style={styles.gap} />
          <Button title="Share as text" variant="secondary" icon="text-outline" onPress={handleShareText} />
        </View>

        <Card>
          <CardTitle title="Breakdown" />
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatVolume(summary.volume)}</Text>
              <Text style={styles.statLabel}>VOLUME (KG)</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.setCount}</Text>
              <Text style={styles.statLabel}>SETS</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.workingSets}</Text>
              <Text style={styles.statLabel}>WORKING</Text>
            </View>
          </View>
          {summary.exercises.map((ex, i) => (
            <View key={`${ex.name}-${i}`} style={[styles.exRow, i === summary.exercises.length - 1 && styles.exRowLast]}>
              <View style={styles.exLeft}>
                <Text style={styles.exName}>{ex.name}</Text>
                {(ex.machine || ex.muscleGroup) && (
                  <Text style={styles.exSub}>{[ex.machine, ex.muscleGroup].filter(Boolean).join(' · ')}</Text>
                )}
              </View>
              {ex.isPR && (
                <View style={styles.prBadge}>
                  <Ionicons name="trophy" size={11} color={colors.primary} />
                  <Text style={styles.prText}>{ex.prDelta !== null ? `+${formatWeight(ex.prDelta)}` : 'PR'}</Text>
                </View>
              )}
              <Text style={[styles.exSet, ex.isPR && styles.exSetPr]}>{ex.topSet}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    color: colors.textMuted,
    padding: spacing.md,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: colors.primaryText,
  },
  previewFrame: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  checkerboard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  checkRow: {
    flexDirection: 'row',
    height: 24,
  },
  checkCell: {
    width: 24,
    height: 24,
    backgroundColor: '#20242e',
  },
  checkCellAlt: {
    backgroundColor: '#171a22',
  },
  previewClip: {
    overflow: 'hidden',
  },
  actions: {
    marginBottom: spacing.md,
  },
  gap: {
    height: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 1,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exRowLast: {
    borderBottomWidth: 0,
  },
  exLeft: {
    flex: 1,
  },
  exName: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  exSub: {
    color: colors.textFaint,
    fontSize: fontSize.tiny,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  prText: {
    color: colors.primary,
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  exSet: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  exSetPr: {
    color: colors.primary,
  },
});
