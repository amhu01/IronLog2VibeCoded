import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { colors, fontSize, muscle, spacing } from '../theme';
import { BACK_PARTS, FRONT_PARTS, VIEW_H, VIEW_W, groupsForRegion, type BodyPart, type MuscleRegion } from './muscleMapShapes';

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Solid fills for levels 0–4, blended from the idle grey to the hot colour.
 * Translucent orange over a dark background reads as brown — darker than an
 * untrained muscle — so the map uses opaque blends where more is always brighter.
 */
export function muscleScale(idle: string, hot: string): string[] {
  const a = hexToRgb(idle);
  const b = hexToRgb(hot);
  return [0, 0.38, 0.6, 0.8, 1].map((t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(', ')})`);
}

const APP_SCALE = muscleScale(muscle.idle, colors.primary);

/** Horizontal gap between the front and back figures, in view units. */
const VIEW_GAP = 24;
export const FIGURE_W = VIEW_W * 2 + VIEW_GAP;
const LABEL_H = 22;
export const FIGURE_H = VIEW_H + LABEL_H;

interface FigureProps {
  levels: Partial<Record<MuscleRegion, number>>;
  /** Fills for intensity 0 (untrained) to 4, e.g. from muscleScale(). */
  scale: string[];
  /** Non-muscle parts: head, hands, knees, feet. */
  neutral: string;
  labelColor: string;
  /** FRONT / BACK captions above the figures. */
  labels?: boolean;
  x?: number;
  y?: number;
  /** Uniform scale of the whole figure (1 = FIGURE_W wide). */
  size?: number;
  onPressRegion?: (region: MuscleRegion) => void;
}

function View_({ parts, offsetX, props }: { parts: BodyPart[]; offsetX: number; props: FigureProps }) {
  const fillOf = (p: BodyPart) => (p.region ? props.scale[props.levels[p.region] ?? 0] : props.neutral);
  const press = (p: BodyPart) => (p.region && props.onPressRegion ? () => props.onPressRegion!(p.region!) : undefined);
  return (
    <G transform={`translate(${offsetX}, ${LABEL_H})`}>
      {parts.map((p, i) => (
        <Path key={`l${i}`} d={p.d} fill={fillOf(p)} onPress={press(p)} />
      ))}
      <G transform={`translate(${VIEW_W}, 0) scale(-1, 1)`}>
        {parts.map((p, i) => (p.center ? null : <Path key={`r${i}`} d={p.d} fill={fillOf(p)} onPress={press(p)} />))}
      </G>
    </G>
  );
}

/** Front and back views side by side, as an SVG group, so it can sit inside any Svg (incl. the share card). */
export function MuscleFigure(props: FigureProps) {
  const { x = 0, y = 0, size = 1, labelColor, labels = true } = props;
  return (
    <G transform={`translate(${x}, ${y}) scale(${size})`}>
      {labels && (
        <>
      <SvgText x={VIEW_W / 2} y={14} fontSize={13} fontWeight="800" fill={labelColor} textAnchor="middle" letterSpacing={2}>
        FRONT
      </SvgText>
      <SvgText x={VIEW_W + VIEW_GAP + VIEW_W / 2} y={14} fontSize={13} fontWeight="800" fill={labelColor} textAnchor="middle" letterSpacing={2}>
        BACK
      </SvgText>
        </>
      )}
      <View_ parts={FRONT_PARTS} offsetX={0} props={props} />
      <View_ parts={BACK_PARTS} offsetX={VIEW_W + VIEW_GAP} props={props} />
    </G>
  );
}

interface MuscleMapProps {
  levels: Partial<Record<MuscleRegion, number>>;
  /** Cap on the drawn width; it otherwise fills its container. */
  maxWidth?: number;
  /** Tap a muscle to see what it is; `describe` turns the tapped region into the caption. */
  describe?: (region: MuscleRegion, groups: string[]) => string;
}

/** The in-app map: themed colours, tap a muscle for a caption underneath. */
export function MuscleMap({ levels, maxWidth = 360, describe }: MuscleMapProps) {
  const [caption, setCaption] = useState<string | null>(null);
  const [available, setAvailable] = useState(0);
  const width = Math.min(available, maxWidth);
  const height = (width / FIGURE_W) * FIGURE_H;
  return (
    <View onLayout={(e) => setAvailable(e.nativeEvent.layout.width)} style={styles.wrap}>
      {width > 0 && (
        <Svg width={width} height={height} viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`}>
          <MuscleFigure
            levels={levels}
            scale={APP_SCALE}
            neutral={muscle.neutral}
            labelColor={colors.textFaint}
            onPressRegion={describe ? (r) => setCaption(describe(r, groupsForRegion(r))) : undefined}
          />
        </Svg>
      )}
      {describe && <Text style={styles.caption}>{caption ?? 'Tap a muscle'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
