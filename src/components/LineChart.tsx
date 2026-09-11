import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '../theme';

export interface ChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: ChartPoint[];
  height?: number;
}

const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

export function LineChart({ points, height = 220 }: LineChartProps) {
  const [width, setWidth] = useState(0);

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min;

  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotH = height - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) => PAD_LEFT + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yFor = (v: number) => PAD_TOP + plotH - ((v - min) / range) * plotH;

  const polyPoints = points.map((p, i) => `${xFor(i)},${yFor(p.value)}`).join(' ');

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => min + (range * i) / gridLines);

  const labelEvery = Math.max(1, Math.ceil(points.length / 5));

  return (
    <View testID="line-chart" style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {gridValues.map((gv, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={yFor(gv)}
                y2={yFor(gv)}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText x={PAD_LEFT - 6} y={yFor(gv) + 4} fill={colors.textMuted} fontSize={10} textAnchor="end">
                {Number.isInteger(gv) ? gv : gv.toFixed(1)}
              </SvgText>
            </React.Fragment>
          ))}
          <Polyline points={polyPoints} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" />
          {points.map((p, i) => (
            <Circle key={i} cx={xFor(i)} cy={yFor(p.value)} r={4} fill={colors.primary} />
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <SvgText
                key={`l${i}`}
                x={xFor(i)}
                y={height - 8}
                fill={colors.textMuted}
                fontSize={10}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            ) : null
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    padding: spacing.md,
  },
});
