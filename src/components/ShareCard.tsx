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

// Word cloud: bigger = more work done (sets, then volume); every third word runs vertically.
const WORD_MIN = 30;
const WORD_MAX = 80;
const CAP_HEIGHT = 0.74; // names are all caps, so the ink box is cap height with no descenders
const LINE_ADVANCE = 0.98;
const BOX_PAD = 12;
const MAX_VERTICAL = 420; // a vertical word longer than this towers over the rest of the card
const MAX_SCALE_UP = 1.4;

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
  lines: string[];
  size: number;
  isPR: boolean;
  cx: number;
  cy: number;
  vertical: boolean;
  opacity: number;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function splitInTwo(text: string): string[] {
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index ?? 0);
  if (spaces.length === 0) return [text];
  const mid = text.length / 2;
  const at = spaces.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best), spaces[0]);
  return [text.slice(0, at), text.slice(at + 1)];
}

/**
 * Wordle-style cloud: words are placed biggest first, each walking an elliptical
 * spiral out from the centre until its bounding box clears everything already
 * placed. The finished cloud is then scaled to the card width, so it grows rather
 * than dropping lifts however many there are.
 */
function layoutCloud(exercises: SummaryExercise[]): { words: CloudWord[]; height: number } {
  if (exercises.length === 0) return { words: [], height: 0 };

  // Rank rather than raw set count: when every lift has 3 sets, sizing by value
  // would make them all identical; ranking still gives the cloud a hero word.
  const ranked = exercises
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => b.ex.setCount - a.ex.setCount || b.ex.volume - a.ex.volume || a.i - b.i);
  const n = ranked.length;

  const placed: (CloudWord & { box: Box })[] = [];
  let verticalCandidates = 0;
  ranked.forEach(({ ex }, rank) => {
    const t = n === 1 ? 0 : rank / (n - 1);
    let size = Math.round(WORD_MAX - (WORD_MAX - WORD_MIN) * Math.pow(t, 0.75));
    let lines = [ex.name];
    let width = textWidth(ex.name, size, 800);
    // Exercise names are phrases, and long thin strips stack like a list instead of
    // interlocking. Breaking them into squarer two-line blocks lets them pack.
    if (width > CONTENT_WIDTH * 0.42 && ex.name.includes(' ')) {
      lines = splitInTwo(ex.name);
      width = Math.max(...lines.map((l) => textWidth(l, size, 800)));
    }
    if (width > CONTENT_WIDTH * 0.92) {
      size = Math.max(20, Math.floor((size * CONTENT_WIDTH * 0.92) / width));
      width = Math.max(...lines.map((l) => textWidth(l, size, 800)));
    }
    const inkHeight = size * CAP_HEIGHT + (lines.length - 1) * size * LINE_ADVANCE;
    // Turn every other short, single-line name on its side (never the hero word).
    const canTurn = rank > 0 && lines.length === 1 && width <= MAX_VERTICAL;
    const vertical = canTurn && verticalCandidates++ % 2 === 0;
    const bw = (vertical ? inkHeight : width) + BOX_PAD;
    const bh = (vertical ? width : inkHeight) + BOX_PAD;

    const startAngle = rank * 2.39996; // golden angle: spreads successive words around the centre
    let cx = 0;
    let cy = 0;
    for (let step = 0; step < 20000; step++) {
      const theta = step * 0.12;
      const r = 3.2 * theta;
      cx = r * Math.cos(theta + startAngle);
      cy = r * Math.sin(theta + startAngle) * 0.4; // strongly flattened: try beside the hero before above/below
      const x0 = cx - bw / 2;
      const y0 = cy - bh / 2;
      const x1 = cx + bw / 2;
      const y1 = cy + bh / 2;
      if (!placed.some((p) => x0 < p.box.x1 && x1 > p.box.x0 && y0 < p.box.y1 && y1 > p.box.y0)) break;
    }
    placed.push({
      lines,
      size,
      isPR: ex.isPR,
      cx,
      cy,
      vertical,
      opacity: ex.isPR ? 1 : 1 - 0.38 * t,
      box: { x0: cx - bw / 2, y0: cy - bh / 2, x1: cx + bw / 2, y1: cy + bh / 2 },
    });
  });

  const minX = Math.min(...placed.map((p) => p.box.x0));
  const maxX = Math.max(...placed.map((p) => p.box.x1));
  const minY = Math.min(...placed.map((p) => p.box.y0));
  const maxY = Math.max(...placed.map((p) => p.box.y1));
  const scale = Math.min(MAX_SCALE_UP, CONTENT_WIDTH / (maxX - minX));
  const midX = (minX + maxX) / 2;

  return {
    words: placed.map(({ box: _box, ...w }) => ({
      ...w,
      size: w.size * scale,
      cx: PAD + CONTENT_WIDTH / 2 + (w.cx - midX) * scale,
      cy: (w.cy - minY) * scale,
    })),
    height: (maxY - minY) * scale,
  };
}

/** A cloud word (one or two lines, optionally rotated) with its drop shadow. */
function CloudText({ word, offsetY }: { word: CloudWord; offsetY: number }) {
  const cy = word.cy + offsetY;
  const capHeight = word.size * CAP_HEIGHT;
  const advance = word.size * LINE_ADVANCE;
  const inkHeight = capHeight + (word.lines.length - 1) * advance;
  const firstBaseline = cy - inkHeight / 2 + capHeight;
  const rotate = word.vertical ? `rotate(-90, ${word.cx}, ${cy})` : undefined;
  const glyphs = (fill: string, opacity: number) =>
    word.lines.map((line, i) => (
      <SvgText
        key={i}
        x={word.cx}
        y={firstBaseline + i * advance}
        fontSize={word.size}
        fontWeight="800"
        textAnchor="middle"
        fill={fill}
        opacity={opacity}
      >
        {line}
      </SvgText>
    ));
  return (
    <G>
      <G transform="translate(0, 3)">
        <G transform={rotate}>{glyphs('#000000', 0.5 * word.opacity)}</G>
      </G>
      <G transform={rotate}>{glyphs(word.isPR ? ORANGE : WHITE, word.opacity)}</G>
    </G>
  );
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
        <CloudText key={`${word.lines.join(' ')}-${i}`} word={word} offsetY={L.cloudY} />
      ))}

      <Barbell x={PAD} y={L.footerY - 22} scale={0.62} />
      <Shadowed x={PAD + 76} y={L.footerY + 8} fontSize={26} fontWeight="800" opacity={0.6} letterSpacing={4}>
        IRON LOG
      </Shadowed>
    </Svg>
  );
});
