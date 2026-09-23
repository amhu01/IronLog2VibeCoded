import React, { forwardRef } from 'react';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import type { SessionSummary } from '../types';
import { formatDateDisplay } from '../utils/date';
import { formatVolume } from '../utils/format';

export const CARD_WIDTH = 1080;

const PAD = 72;
const ORANGE = '#ff8a3d';
const ORANGE_LIGHT = '#ffb27a';
const WHITE = '#ffffff';
const MAX_ROWS = 7;
const ROW_H = 104;

/**
 * Rough advance width; SVG has no text metrics, so boxes are sized from character
 * count. Deliberately generous — overflowing a pill looks broken, extra padding
 * does not.
 */
function textWidth(text: string, fontSize: number, weight = 700): number {
  return text.length * fontSize * (weight >= 800 ? 0.74 : 0.68);
}

function truncateToWidth(text: string, fontSize: number, weight: number, maxWidth: number): string {
  if (textWidth(text, fontSize, weight) <= maxWidth) return text;
  let out = text;
  while (out.length > 4 && textWidth(`${out}…`, fontSize, weight) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/** White text is unreadable on a light photo, so every glyph gets a dark under-layer. */
function Shadowed({
  children,
  x,
  y,
  fontSize,
  fontWeight = '700',
  fill = WHITE,
  textAnchor = 'start',
  letterSpacing,
  opacity = 1,
}: {
  children: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: string;
  fill?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  letterSpacing?: number;
  opacity?: number;
}) {
  const common = { fontSize, fontWeight, textAnchor, letterSpacing };
  return (
    <G>
      <SvgText {...common} x={x} y={y + 3} fill="#000000" opacity={0.5 * opacity}>
        {children}
      </SvgText>
      <SvgText {...common} x={x} y={y} fill={fill} opacity={opacity}>
        {children}
      </SvgText>
    </G>
  );
}

function Barbell({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = (n: number) => n * scale;
  return (
    <G x={x} y={y} opacity={0.95}>
      <Rect x={s(0)} y={s(14)} width={s(96)} height={s(8)} rx={s(4)} fill={ORANGE} />
      <Rect x={s(10)} y={s(2)} width={s(10)} height={s(32)} rx={s(4)} fill={ORANGE} />
      <Rect x={s(24)} y={s(7)} width={s(8)} height={s(22)} rx={s(3)} fill={ORANGE_LIGHT} />
      <Rect x={s(76)} y={s(2)} width={s(10)} height={s(32)} rx={s(4)} fill={ORANGE} />
      <Rect x={s(64)} y={s(7)} width={s(8)} height={s(22)} rx={s(3)} fill={ORANGE_LIGHT} />
    </G>
  );
}

export function cardHeight(summary: SessionSummary): number {
  const rows = Math.min(summary.exercises.length, MAX_ROWS);
  const overflow = summary.exercises.length > MAX_ROWS ? 54 : 0;
  const pills = summary.muscleGroups.length > 0 ? 84 : 0;
  return 300 + pills + 210 + rows * ROW_H + overflow + 120;
}

interface ShareCardProps {
  summary: SessionSummary;
  width: number;
  height: number;
  /** Translucent dark panel behind the text. Off = fully transparent, but white text dies on a light photo. */
  scrim?: boolean;
}

export const ShareCard = forwardRef<React.ElementRef<typeof Svg>, ShareCardProps>(function ShareCard(
  { summary, width, height, scrim = true },
  ref
) {
  const title = summary.name || 'WORKOUT';
  let y = 96;

  const headerEls: React.ReactNode[] = [];
  headerEls.push(
    <Shadowed key="eyebrow" x={PAD} y={y} fontSize={30} fontWeight="800" fill={ORANGE} letterSpacing={8}>
      IRON LOG
    </Shadowed>
  );
  y += 86;
  const titleText = title.toUpperCase();
  const titleRoom = CARD_WIDTH - PAD * 2;
  const titleSize = titleText.length > 26 ? 44 : titleText.length > 18 ? 56 : 72;
  headerEls.push(
    <Shadowed key="title" x={PAD} y={y} fontSize={titleSize} fontWeight="800">
      {truncateToWidth(titleText, titleSize, 800, titleRoom)}
    </Shadowed>
  );
  y += 54;
  headerEls.push(
    <Shadowed key="date" x={PAD} y={y} fontSize={32} fontWeight="600" opacity={0.82}>
      {formatDateDisplay(summary.date)}
    </Shadowed>
  );
  y += 60;

  const pillEls: React.ReactNode[] = [];
  if (summary.muscleGroups.length > 0) {
    let px = PAD;
    for (const group of summary.muscleGroups) {
      const w = textWidth(group, 26, 800) + 52;
      if (px + w > CARD_WIDTH - PAD) break;
      pillEls.push(
        <G key={group}>
          <Rect x={px} y={y} width={w} height={52} rx={26} fill={ORANGE} opacity={0.22} />
          <Rect x={px} y={y} width={w} height={52} rx={26} fill="none" stroke={ORANGE} strokeWidth={2} opacity={0.9} />
          <SvgText x={px + w / 2} y={y + 35} fontSize={26} fontWeight="800" fill={ORANGE_LIGHT} textAnchor="middle" letterSpacing={1.5}>
            {group}
          </SvgText>
        </G>
      );
      px += w + 14;
    }
    y += 84;
  }

  const stats: { value: string; label: string }[] = [
    { value: formatVolume(summary.volume), label: 'VOLUME KG' },
    { value: String(summary.setCount), label: 'SETS' },
    { value: String(summary.exerciseCount), label: 'LIFTS' },
  ];
  if (summary.prCount > 0) stats.push({ value: String(summary.prCount), label: summary.prCount === 1 ? 'NEW PR' : 'NEW PRS' });

  const colWidth = (CARD_WIDTH - PAD * 2) / stats.length;
  const statsY = y + 80;
  const statEls = stats.map((s, i) => (
    <G key={s.label}>
      <Shadowed x={PAD + colWidth * i} y={statsY} fontSize={66} fontWeight="800" fill={s.label.includes('PR') ? ORANGE : WHITE}>
        {s.value}
      </Shadowed>
      <Shadowed x={PAD + colWidth * i} y={statsY + 42} fontSize={22} fontWeight="800" opacity={0.72} letterSpacing={1.2}>
        {s.label}
      </Shadowed>
    </G>
  ));
  y = statsY + 90;

  const dividerY = y;
  y += 56;

  const rows = summary.exercises.slice(0, MAX_ROWS);
  const rowEls = rows.map((ex, i) => {
    const rowY = y + i * ROW_H;
    const sub = [ex.machine, ex.muscleGroup].filter(Boolean).join('  ·  ');
    const prW = 92;
    const setX = ex.isPR ? CARD_WIDTH - PAD - prW - 20 : CARD_WIDTH - PAD;
    const nameX = PAD + 36;
    const nameRoom = setX - textWidth(ex.topSet, 38, 800) - nameX - 28;
    return (
      <G key={`${ex.name}-${i}`}>
        <Circle cx={PAD + 10} cy={rowY + 26} r={7} fill={ex.isPR ? ORANGE : WHITE} opacity={ex.isPR ? 1 : 0.55} />
        <Shadowed x={nameX} y={rowY + 36} fontSize={38} fontWeight="700">
          {truncateToWidth(ex.name, 38, 700, nameRoom)}
        </Shadowed>
        {sub ? (
          <Shadowed x={nameX} y={rowY + 72} fontSize={24} fontWeight="600" opacity={0.62}>
            {truncateToWidth(sub, 24, 600, nameRoom + 20)}
          </Shadowed>
        ) : null}
        <Shadowed x={setX} y={rowY + 36} fontSize={38} fontWeight="800" textAnchor="end" fill={ex.isPR ? ORANGE : WHITE}>
          {ex.topSet}
        </Shadowed>
        {ex.isPR ? (
          <G>
            <Rect x={CARD_WIDTH - PAD - prW} y={rowY + 6} width={prW} height={40} rx={20} fill={ORANGE} />
            <SvgText x={CARD_WIDTH - PAD - prW / 2} y={rowY + 34} fontSize={24} fontWeight="800" fill="#1a0e05" textAnchor="middle" letterSpacing={1.5}>
              PR
            </SvgText>
          </G>
        ) : null}
      </G>
    );
  });
  y += rows.length * ROW_H;

  const overflowCount = summary.exercises.length - rows.length;
  const overflowEl =
    overflowCount > 0 ? (
      <Shadowed x={PAD + 36} y={y + 34} fontSize={28} fontWeight="700" opacity={0.6}>
        {`+ ${overflowCount} more exercise${overflowCount === 1 ? '' : 's'}`}
      </Shadowed>
    ) : null;
  if (overflowCount > 0) y += 54;

  const footerY = y + 58;

  return (
    <Svg ref={ref} width={width} height={height} viewBox={`0 0 ${CARD_WIDTH} ${cardHeight(summary)}`}>
      {scrim ? (
        <Rect x={0} y={0} width={CARD_WIDTH} height={cardHeight(summary)} rx={48} fill="#0b0d12" opacity={0.62} />
      ) : null}
      {headerEls}
      {pillEls}
      {statEls}
      <Rect x={PAD} y={dividerY} width={CARD_WIDTH - PAD * 2} height={2} fill={WHITE} opacity={0.28} />
      {rowEls}
      {overflowEl}
      <Barbell x={PAD} y={footerY - 22} scale={0.62} />
      <Shadowed x={PAD + 76} y={footerY + 8} fontSize={26} fontWeight="800" opacity={0.6} letterSpacing={4}>
        IRON LOG
      </Shadowed>
    </Svg>
  );
});
