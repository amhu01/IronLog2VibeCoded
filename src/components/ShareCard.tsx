import React, { forwardRef } from 'react';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import type { SessionSummary, SummaryExercise } from '../types';
import { formatDateDisplay } from '../utils/date';
import { formatVolume } from '../utils/format';

export const CARD_WIDTH = 1080;

const PAD = 72;
const CONTENT_WIDTH = CARD_WIDTH - PAD * 2;
const ORANGE = '#ff8a3d';
const ORANGE_LIGHT = '#ffb27a';
const WHITE = '#ffffff';

// Word cloud sizing: bigger word = more sets on that exercise.
const WORD_MIN = 28;
const WORD_MAX = 66;
const WORD_GAP = 28;
const LINE_RATIO = 1.32;

/**
 * Rough advance width; SVG has no text metrics, so boxes are sized from character
 * count. Calibrated by rendering sample strings and measuring the trimmed bitmap:
 * the worst per-character factor was 0.82 for bold uppercase in a wide serif, so
 * these sit just above that. Overestimating only adds whitespace; underestimating
 * makes word-cloud entries overlap, so bias high.
 */
function textWidth(text: string, fontSize: number, weight = 700): number {
  return text.length * fontSize * (weight >= 800 ? 0.86 : 0.78);
}

function truncateToWidth(text: string, fontSize: number, weight: number, maxWidth: number): string {
  if (textWidth(text, fontSize, weight) <= maxWidth) return text;
  let out = text;
  while (out.length > 4 && textWidth(`${out}…`, fontSize, weight) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

interface CloudWord {
  text: string;
  size: number;
  isPR: boolean;
  x: number;
  baseline: number;
}

/**
 * Centre-packed tag cloud of exercise names — no weights or reps, and it grows by
 * wrapping rather than truncating, so a long session still shows every lift.
 */
function layoutCloud(exercises: SummaryExercise[]): { words: CloudWord[]; height: number } {
  if (exercises.length === 0) return { words: [], height: 0 };

  const counts = exercises.map((e) => Math.max(1, e.setCount));
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const sizeFor = (count: number) =>
    max === min ? Math.round((WORD_MIN + WORD_MAX) / 2) : Math.round(WORD_MIN + ((count - min) / (max - min)) * (WORD_MAX - WORD_MIN));

  const items = exercises.map((ex) => {
    let size = sizeFor(Math.max(1, ex.setCount));
    let width = textWidth(ex.name, size, 800);
    if (width > CONTENT_WIDTH) {
      size = Math.max(20, Math.floor((size * CONTENT_WIDTH) / width));
      width = textWidth(ex.name, size, 800);
    }
    return { text: ex.name, size, isPR: ex.isPR, width };
  });

  const words: CloudWord[] = [];
  let row: typeof items = [];
  let rowWidth = 0;
  let y = 0;

  const flushRow = () => {
    if (row.length === 0) return;
    const tallest = Math.max(...row.map((i) => i.size));
    let x = PAD + (CONTENT_WIDTH - rowWidth) / 2;
    for (const item of row) {
      words.push({ text: item.text, size: item.size, isPR: item.isPR, x, baseline: y + tallest * 0.92 });
      x += item.width + WORD_GAP;
    }
    y += tallest * LINE_RATIO;
    row = [];
    rowWidth = 0;
  };

  for (const item of items) {
    const candidate = row.length === 0 ? item.width : rowWidth + WORD_GAP + item.width;
    if (row.length > 0 && candidate > CONTENT_WIDTH) {
      flushRow();
      rowWidth = item.width;
    } else {
      rowWidth = candidate;
    }
    row.push(item);
  }
  flushRow();

  return { words, height: y };
}

interface Pill {
  text: string;
  x: number;
  w: number;
}

/** Muscle-group pills wrap onto more rows rather than getting dropped off the end. */
function layoutPills(groups: string[]): { rows: Pill[][]; height: number } {
  if (groups.length === 0) return { rows: [], height: 0 };
  const rows: Pill[][] = [];
  let row: Pill[] = [];
  let rowWidth = 0;
  for (const text of groups) {
    const w = textWidth(text, 26, 800) + 52;
    const candidate = row.length === 0 ? w : rowWidth + 14 + w;
    if (row.length > 0 && candidate > CONTENT_WIDTH) {
      rows.push(row);
      row = [];
      rowWidth = w;
    } else {
      rowWidth = candidate;
    }
    row.push({ text, w, x: 0 });
  }
  if (row.length > 0) rows.push(row);
  for (const r of rows) {
    let x = PAD;
    for (const pill of r) {
      pill.x = x;
      x += pill.w + 14;
    }
  }
  return { rows, height: rows.length * 52 + (rows.length - 1) * 14 + 32 };
}

interface Layout {
  titleSize: number;
  titleText: string;
  pillsY: number;
  pills: ReturnType<typeof layoutPills>;
  statsY: number;
  stats: { value: string; label: string }[];
  dividerY: number;
  cloudY: number;
  cloud: ReturnType<typeof layoutCloud>;
  footerY: number;
  height: number;
}

/** Single source of truth for vertical positions, so cardHeight can never drift from the render. */
function computeLayout(summary: SessionSummary): Layout {
  const titleText = (summary.name || 'WORKOUT').toUpperCase();
  const titleSize = titleText.length > 26 ? 44 : titleText.length > 18 ? 56 : 72;

  const pills = layoutPills(summary.muscleGroups);
  let y = 236 + 60; // eyebrow + title + date block
  const pillsY = y;
  y += pills.height;

  const stats: { value: string; label: string }[] = [
    { value: formatVolume(summary.volume), label: 'VOLUME KG' },
    { value: String(summary.setCount), label: 'SETS' },
    { value: String(summary.exerciseCount), label: 'LIFTS' },
  ];
  if (summary.prCount > 0) stats.push({ value: String(summary.prCount), label: summary.prCount === 1 ? 'NEW PR' : 'NEW PRS' });

  const statsY = y + 80;
  y = statsY + 90;

  const dividerY = y;
  const cloudY = y + 56;
  const cloud = layoutCloud(summary.exercises);

  // Row heights are fractional; keep the canvas an integer so the rasteriser is happy.
  const footerY = Math.round(cloudY + cloud.height + 76);
  return { titleSize, titleText, pillsY, pills, statsY, stats, dividerY, cloudY, cloud, footerY, height: footerY + 56 };
}

export function cardHeight(summary: SessionSummary): number {
  return computeLayout(summary).height;
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
  const L = computeLayout(summary);

  const pillEls = L.pills.rows.flatMap((row, rowIndex) => {
    const rowY = L.pillsY + rowIndex * 66;
    return row.map((pill) => (
      <G key={pill.text}>
        <Rect x={pill.x} y={rowY} width={pill.w} height={52} rx={26} fill={ORANGE} opacity={0.22} />
        <Rect x={pill.x} y={rowY} width={pill.w} height={52} rx={26} fill="none" stroke={ORANGE} strokeWidth={2} opacity={0.9} />
        <SvgText
          x={pill.x + pill.w / 2}
          y={rowY + 35}
          fontSize={26}
          fontWeight="800"
          fill={ORANGE_LIGHT}
          textAnchor="middle"
          letterSpacing={1.5}
        >
          {pill.text}
        </SvgText>
      </G>
    ));
  });

  const colWidth = CONTENT_WIDTH / L.stats.length;

  return (
    <Svg ref={ref} width={width} height={height} viewBox={`0 0 ${CARD_WIDTH} ${L.height}`}>
      {scrim ? <Rect x={0} y={0} width={CARD_WIDTH} height={L.height} rx={48} fill="#0b0d12" opacity={0.62} /> : null}

      <Shadowed x={PAD} y={96} fontSize={30} fontWeight="800" fill={ORANGE} letterSpacing={8}>
        IRON LOG
      </Shadowed>
      <Shadowed x={PAD} y={182} fontSize={L.titleSize} fontWeight="800">
        {truncateToWidth(L.titleText, L.titleSize, 800, CONTENT_WIDTH)}
      </Shadowed>
      <Shadowed x={PAD} y={236} fontSize={32} fontWeight="600" opacity={0.82}>
        {formatDateDisplay(summary.date)}
      </Shadowed>

      {pillEls}

      {L.stats.map((s, i) => (
        <G key={s.label}>
          <Shadowed x={PAD + colWidth * i} y={L.statsY} fontSize={66} fontWeight="800" fill={s.label.includes('PR') ? ORANGE : WHITE}>
            {s.value}
          </Shadowed>
          <Shadowed x={PAD + colWidth * i} y={L.statsY + 42} fontSize={22} fontWeight="800" opacity={0.72} letterSpacing={1.2}>
            {s.label}
          </Shadowed>
        </G>
      ))}

      <Rect x={PAD} y={L.dividerY} width={CONTENT_WIDTH} height={2} fill={WHITE} opacity={0.28} />

      {L.cloud.words.map((word, i) => (
        <Shadowed
          key={`${word.text}-${i}`}
          x={word.x}
          y={L.cloudY + word.baseline}
          fontSize={word.size}
          fontWeight="800"
          fill={word.isPR ? ORANGE : WHITE}
          opacity={word.isPR ? 1 : 0.9}
        >
          {word.text}
        </Shadowed>
      ))}

      <Barbell x={PAD} y={L.footerY - 22} scale={0.62} />
      <Shadowed x={PAD + 76} y={L.footerY + 8} fontSize={26} fontWeight="800" opacity={0.6} letterSpacing={4}>
        IRON LOG
      </Shadowed>
    </Svg>
  );
});
