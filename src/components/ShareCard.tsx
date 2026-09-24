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

// Dumbbell word art: every lift once (big, sized by work done), then repeated as faint
// filler until the words alone trace the dumbbell. No outline is drawn.
const DUMBBELL_HEIGHT = 470;
const WORD_MIN = 26;
const WORD_MAX = 96;
const HARD_MIN = 12;
const FILL_SIZES = [40, 34, 29, 25, 21, 18, 15, 13, 11];
const MAX_WORDS = 260;
// Cloud words are stretched to their box with textLength, so this only sets each
// word's aspect ratio. It sits between Roboto (~0.62) and wide serifs (~0.78) so the
// stretch is small on any font.
const NATURAL_CHAR = 0.7;
const LOCKUP_GAP = 0.16;
const CELL = 6; // raster resolution for the fit test, in card px (finer costs time on Hermes)
const CAP_HEIGHT = 0.74; // names are all caps, so the ink box is cap height with no descenders
const LINE_ADVANCE = 0.98;

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

interface CloudLine {
  text: string;
  size: number;
}

interface CloudWord {
  lines: CloudLine[];
  /** Ink width every line is stretched to (textLength). */
  width: number;
  isPR: boolean;
  cx: number;
  cy: number;
  vertical: boolean;
  opacity: number;
  /** A repeat used only to fill out the silhouette. */
  filler: boolean;
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

/** The silhouette as rectangles: outer plate, inner plate, collar per side, plus the handle. */
function dumbbellRects(w: number, h: number): Box[] {
  const outerW = 0.096 * w;
  const gap = 0.011 * w;
  const innerW = 0.139 * w;
  const collarW = 0.026 * w;
  const centred = (height: number) => ({ y0: (h - height) / 2, y1: (h + height) / 2 });
  const mirror = (b: Box): Box => ({ x0: w - b.x1, y0: b.y0, x1: w - b.x0, y1: b.y1 });
  const outer = { x0: 0, x1: outerW, ...centred(0.66 * h) };
  const inner = { x0: outerW + gap, x1: outerW + gap + innerW, y0: 0, y1: h };
  const collar = { x0: inner.x1, x1: inner.x1 + collarW, ...centred(0.34 * h) };
  const handle = { x0: collar.x1, x1: w - collar.x1, ...centred(0.24 * h) };
  return [outer, mirror(outer), inner, mirror(inner), collar, mirror(collar), handle];
}

/**
 * Free-space raster of the shape with a summed-area table, so "does this box sit
 * entirely on free cells inside the dumbbell?" is four lookups instead of a scan.
 */
class ShapeGrid {
  readonly gw: number;
  readonly gh: number;
  private free: Uint8Array;
  private sat: Int32Array;
  private order: number[];
  /** Box sizes already proven not to fit. Free space only shrinks, so these never fit later either. */
  private failed: { bw: number; bh: number }[] = [];

  constructor(width: number, height: number, shape: Box[]) {
    this.gw = Math.floor(width / CELL);
    this.gh = Math.floor(height / CELL);
    this.free = new Uint8Array(this.gw * this.gh);
    for (let gy = 0; gy < this.gh; gy++) {
      for (let gx = 0; gx < this.gw; gx++) {
        const x = (gx + 0.5) * CELL;
        const y = (gy + 0.5) * CELL;
        if (shape.some((b) => x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1)) this.free[gy * this.gw + gx] = 1;
      }
    }
    this.sat = new Int32Array((this.gw + 1) * (this.gh + 1));
    this.rebuild();
    // Candidate centres every other cell, nearest the middle first. Every cell
    // would pack marginally tighter at 4x the cost, and this runs on Hermes.
    const cx = this.gw / 2;
    const cy = this.gh / 2;
    const cells: number[] = [];
    for (let gy = 0; gy < this.gh; gy += 2) for (let gx = 0; gx < this.gw; gx += 2) cells.push(gy * this.gw + gx);
    const dist = (i: number) => (i % this.gw - cx) ** 2 + (Math.floor(i / this.gw) - cy) ** 2;
    this.order = cells.sort((a, b) => dist(a) - dist(b));
  }

  /** Rows above `fromRow` can't have changed, so their prefix sums are reused. */
  private rebuild(fromRow = 0) {
    const W = this.gw + 1;
    for (let gy = fromRow; gy < this.gh; gy++) {
      let row = 0;
      for (let gx = 0; gx < this.gw; gx++) {
        row += this.free[gy * this.gw + gx];
        this.sat[(gy + 1) * W + gx + 1] = this.sat[gy * W + gx + 1] + row;
      }
    }
  }

  private cellRange(b: Box) {
    return { x0: Math.floor(b.x0 / CELL), y0: Math.floor(b.y0 / CELL), x1: Math.ceil(b.x1 / CELL), y1: Math.ceil(b.y1 / CELL) };
  }

  fits(b: Box): boolean {
    const r = this.cellRange(b);
    if (r.x0 < 0 || r.y0 < 0 || r.x1 > this.gw || r.y1 > this.gh) return false;
    const W = this.gw + 1;
    const sum = this.sat[r.y1 * W + r.x1] - this.sat[r.y0 * W + r.x1] - this.sat[r.y1 * W + r.x0] + this.sat[r.y0 * W + r.x0];
    return sum === (r.x1 - r.x0) * (r.y1 - r.y0);
  }

  occupy(b: Box) {
    const r = this.cellRange(b);
    for (let gy = Math.max(0, r.y0); gy < Math.min(this.gh, r.y1); gy++)
      for (let gx = Math.max(0, r.x0); gx < Math.min(this.gw, r.x1); gx++) this.free[gy * this.gw + gx] = 0;
    this.rebuild(Math.max(0, r.y0));
  }

  /** Free spot for a bw×bh box nearest the middle, as a centre point, or null. */
  findSpot(bw: number, bh: number): { cx: number; cy: number; rank: number } | null {
    if (this.failed.some((f) => bw >= f.bw && bh >= f.bh)) return null;
    for (let k = 0; k < this.order.length; k++) {
      const i = this.order[k];
      const cx = (i % this.gw + 0.5) * CELL;
      const cy = (Math.floor(i / this.gw) + 0.5) * CELL;
      if (this.fits({ x0: cx - bw / 2, y0: cy - bh / 2, x1: cx + bw / 2, y1: cy + bh / 2 })) return { cx, cy, rank: k };
    }
    this.failed.push({ bw, bh });
    return null;
  }
}

interface Shaped {
  lines: CloudLine[];
  width: number;
  vertical: boolean;
  bw: number;
  bh: number;
}

function inkHeight(lines: CloudLine[]): number {
  return lines.reduce((h, l, i) => h + l.size * CAP_HEIGHT + (i > 0 ? lines[0].size * LOCKUP_GAP : 0), 0);
}

/**
 * Every way a name can be set at a size: one line, or a two-line poster lockup
 * where the shorter word is scaled up to the longer one's width (a huge "LAT" over
 * "PULLDOWN") so the block is a solid rectangle — each one flat or on its side.
 */
function shapesFor(name: string, size: number): Shaped[] {
  const pad = Math.max(3, size * 0.1);
  const variants: { lines: CloudLine[]; width: number }[] = [
    { lines: [{ text: name, size }], width: name.length * size * NATURAL_CHAR },
  ];
  if (name.includes(' ')) {
    const parts = splitInTwo(name);
    const longest = Math.max(...parts.map((t) => t.length));
    const width = longest * size * NATURAL_CHAR;
    variants.push({
      lines: parts.map((text) => ({ text, size: Math.min(size * 2.4, width / (text.length * NATURAL_CHAR)) })),
      width,
    });
  }
  const out: Shaped[] = [];
  for (const v of variants) {
    const ink = inkHeight(v.lines);
    out.push({ ...v, vertical: false, bw: v.width + pad, bh: ink + pad });
    out.push({ ...v, vertical: true, bw: ink + pad, bh: v.width + pad });
  }
  return out;
}

function tryPlace(grid: ShapeGrid, name: string, size: number) {
  let best: (Shaped & { cx: number; cy: number; rank: number }) | null = null;
  for (const shape of shapesFor(name, size)) {
    const spot = grid.findSpot(shape.bw, shape.bh);
    if (spot && (!best || spot.rank < best.rank)) best = { ...shape, ...spot };
  }
  return best;
}

/**
 * Lays the names out inside an invisible dumbbell. Each lift is placed once at
 * the biggest size that fits (sized by rank of work done); if any lift can't fit,
 * every target shrinks and the whole pass reruns, so no lift is ever dropped.
 * Then names repeat as small, faint filler until nothing more fits, which is what
 * makes the silhouette readable with only a handful of lifts.
 */
function layoutDumbbell(exercises: SummaryExercise[]): { words: CloudWord[]; height: number } {
  if (exercises.length === 0) return { words: [], height: 0 };

  const ranked = exercises
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => b.ex.setCount - a.ex.setCount || b.ex.volume - a.ex.volume || a.i - b.i)
    .map(({ ex }) => ex);
  const n = ranked.length;
  const shape = dumbbellRects(CONTENT_WIDTH, DUMBBELL_HEIGHT);
  const boxOf = (p: { cx: number; cy: number; bw: number; bh: number }): Box => ({
    x0: p.cx - p.bw / 2,
    y0: p.cy - p.bh / 2,
    x1: p.cx + p.bw / 2,
    y1: p.cy + p.bh / 2,
  });

  for (let shrink = 1; shrink > 0.2; shrink *= 0.82) {
    const grid = new ShapeGrid(CONTENT_WIDTH, DUMBBELL_HEIGHT, shape);
    const words: CloudWord[] = [];
    let smallest = Infinity;
    let allPlaced = true;

    for (let rank = 0; rank < n && allPlaced; rank++) {
      const ex = ranked[rank];
      const t = n === 1 ? 0 : rank / (n - 1);
      let size = (WORD_MAX - (WORD_MAX - WORD_MIN) * Math.pow(t, 0.75)) * shrink;
      let spot = null;
      for (; size >= HARD_MIN; size *= 0.92) {
        spot = tryPlace(grid, ex.name, size);
        if (spot) break;
      }
      if (!spot) {
        allPlaced = false;
        break;
      }
      grid.occupy(boxOf(spot));
      smallest = Math.min(smallest, size);
      words.push({ lines: spot.lines, width: spot.width, isPR: ex.isPR, cx: spot.cx, cy: spot.cy, vertical: spot.vertical, opacity: 1, filler: false });
    }
    if (!allPlaced) continue;

    // Filler never competes with the real names: always smaller, always faint.
    let next = 0;
    for (const fillSize of FILL_SIZES.filter((f) => f < smallest * 0.95)) {
      let misses = 0;
      while (misses < n && words.length < MAX_WORDS) {
        const ex = ranked[next++ % n];
        const spot = tryPlace(grid, ex.name, fillSize);
        if (!spot) {
          misses++;
          continue;
        }
        misses = 0;
        grid.occupy(boxOf(spot));
        words.push({
          lines: spot.lines,
          width: spot.width,
          isPR: false,
          cx: spot.cx,
          cy: spot.cy,
          vertical: spot.vertical,
          opacity: 0.2 + 0.16 * (fillSize / FILL_SIZES[0]),
          filler: true,
        });
      }
    }

    return { words: words.map((w) => ({ ...w, cx: w.cx + PAD })), height: DUMBBELL_HEIGHT };
  }
  return { words: [], height: DUMBBELL_HEIGHT };
}

/** A cloud word or lockup, stretched to its box and optionally rotated, with a drop shadow. */
function CloudText({ word, offsetY }: { word: CloudWord; offsetY: number }) {
  const cy = word.cy + offsetY;
  const total = inkHeight(word.lines);
  const baselines: number[] = [];
  let top = cy - total / 2;
  word.lines.forEach((line, i) => {
    if (i > 0) top += word.lines[0].size * LOCKUP_GAP;
    top += line.size * CAP_HEIGHT;
    baselines.push(top);
  });
  const rotate = word.vertical ? `rotate(-90, ${word.cx}, ${cy})` : undefined;
  const glyphs = (fill: string, opacity: number) =>
    word.lines.map((line, i) => (
      <SvgText
        key={i}
        x={word.cx}
        y={baselines[i]}
        fontSize={line.size}
        fontWeight="800"
        textAnchor="middle"
        textLength={word.width}
        lengthAdjust="spacingAndGlyphs"
        fill={fill}
        opacity={opacity}
      >
        {line.text}
      </SvgText>
    ));
  if (word.filler) return <G transform={rotate}>{glyphs(WHITE, word.opacity)}</G>;
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
  cloud: ReturnType<typeof layoutDumbbell>;
  footerY: number;
  height: number;
}

const layoutCache = new WeakMap<SessionSummary, Layout>();

/**
 * Single source of truth for vertical positions, so cardHeight can never drift from
 * the render. Cached per summary: the dumbbell fill is a real search, and both
 * cardHeight and every re-render (e.g. the PANEL/CLEAR toggle) ask for it.
 */
function computeLayout(summary: SessionSummary): Layout {
  const cached = layoutCache.get(summary);
  if (cached) return cached;
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
  const cloud = layoutDumbbell(summary.exercises);

  // Keep the canvas an integer so the rasteriser is happy.
  const footerY = Math.round(cloudY + cloud.height + 76);
  const layout = { titleSize, titleText, pillsY, pills, statsY, stats, dividerY, cloudY, cloud, footerY, height: footerY + 56 };
  layoutCache.set(summary, layout);
  return layout;
}

export function cardHeight(summary: SessionSummary): number {
  return computeLayout(summary).height;
}

/**
 * Does the (cached) dumbbell layout. It's a real search, so the summary screen
 * calls this after it has painted rather than during render.
 */
export function prepareCard(summary: SessionSummary): void {
  computeLayout(summary);
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
        <CloudText key={`${word.lines.map((l) => l.text).join(' ')}-${i}`} word={word} offsetY={L.cloudY} />
      ))}

      <Barbell x={PAD} y={L.footerY - 22} scale={0.62} />
      <Shadowed x={PAD + 76} y={L.footerY + 8} fontSize={26} fontWeight="800" opacity={0.6} letterSpacing={4}>
        IRON LOG
      </Shadowed>
    </Svg>
  );
});
