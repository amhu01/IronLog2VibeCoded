import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Stop, Text as SvgText } from 'react-native-svg';
import { colors, fontSize, spacing } from '../theme';
import { formatWeight } from '../utils/format';

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
  const baseline = PAD_TOP + plotH;

  const xFor = (i: number) => PAD_LEFT + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yFor = (v: number) => PAD_TOP + plotH - ((v - min) / range) * plotH;

  const polyPoints = points.map((p, i) => `${xFor(i)},${yFor(p.value)}`).join(' ');
  const areaPoints = `${xFor(0)},${baseline} ${polyPoints} ${xFor(points.length - 1)},${baseline}`;

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => min + (range * i) / gridLines);

  const labelEvery = Math.max(1, Math.ceil(points.length / 5));
  const lastIndex = points.length - 1;

  return (
    <View testID="line-chart" style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {gridValues.map((gv, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={yFor(gv)}
                y2={yFor(gv)}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray={i === 0 ? undefined : '3 4'}
              />
              <SvgText
                x={PAD_LEFT - 8}
                y={yFor(gv) + 4}
                fill={colors.textFaint}
                fontSize={fontSize.tiny}
                fontWeight="600"
                textAnchor="end"
              >
                {formatWeight(Math.round(gv * 10) / 10)}
              </SvgText>
            </React.Fragment>
          ))}
          {points.length > 1 && <Polygon points={areaPoints} fill="url(#area)" />}
          <Polyline
            points={polyPoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={xFor(i)}
              cy={yFor(p.value)}
              r={i === lastIndex ? 5 : 3.5}
              fill={i === lastIndex ? colors.primary : colors.surface}
              stroke={colors.primary}
              strokeWidth={2}
            />
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === lastIndex ? (
              <SvgText
                key={`l${i}`}
                x={xFor(i)}
                y={height - 8}
                fill={colors.textMuted}
                fontSize={fontSize.tiny}
                textAnchor={i === lastIndex && points.length > 1 ? 'end' : i === 0 ? 'start' : 'middle'}
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
