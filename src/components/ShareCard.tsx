import React, { forwardRef } from 'react';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import type { SessionSummary, SummaryExercise } from '../types';
import { FIGURE_H, FIGURE_W, MuscleFigure, muscleScale } from './MuscleMap';
import { GROUP_REGIONS, regionLevels } from './muscleMapShapes';
import { formatDateDisplay } from '../utils/date';
import { formatVolume } from '../utils/format';
import { muscleLabel, t } from '../i18n';
import { colors } from '../theme';

export const CARD_WIDTH = 1080;

const PAD = 72;
const CONTENT_WIDTH = CARD_WIDTH - PAD * 2;
// The card follows the app's accent colour; read at render time since it can change.
const accent = () => colors.primary;
/** The accent mixed 45% toward white, for pill text and the barbell's inner plates. */
function accentLight(): string {
  const n = parseInt(colors.primary.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * 0.45);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
const WHITE = '#ffffff';
const MAP_WIDTH = 380;


// Word art: every lift once (big, sized by work done), then repeated as faint filler
// until the words alone trace a shape (dumbbell, kettlebell…). No outline is drawn.
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

export type CardShape = 'dumbbell' | 'kettlebell' | 'plate' | 'trophy' | 'heart';

interface ShapeDef {
  label: string;
  w: number;
  h: number;
  /** Is the point (in shape-local px) inside the silhouette? */
  inside: (x: number, y: number) => boolean;
}

const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

/** Outer plate, gap, full-height inner plate, collar per side, plus the handle. */
function dumbbell(w: number, h: number): ShapeDef['inside'] {
  const outerW = 0.096 * w;
  const gap = 0.011 * w;
  const innerW = 0.139 * w;
  const collarW = 0.026 * w;
  return (px, y) => {
    const x = px < w / 2 ? px : w - px; // mirror: test the left half only
    const band = (frac: number) => Math.abs(y - h / 2) < (frac * h) / 2;
    if (x < outerW) return band(0.66);
    if (x < outerW + gap) return false;
    if (x < outerW + gap + innerW) return true;
    if (x < outerW + gap + innerW + collarW) return band(0.34);
    return band(0.24);
  };
}

const SHAPES: Record<CardShape, ShapeDef> = {
  dumbbell: { label: 'DUMBBELL', w: CONTENT_WIDTH, h: 470, inside: dumbbell(CONTENT_WIDTH, 470) },
  kettlebell: {
    label: 'KETTLEBELL',
    w: 700,
    h: 820,
    // Round body with a flat base, and an arched handle whose window stays open above the body.
    inside: (x, y) =>
      (inEllipse(x, y, 350, 565, 255, 255) && y < 800) ||
      (inEllipse(x, y, 350, 235, 240, 235) && !inEllipse(x, y, 350, 250, 135, 145)),
  },
  plate: {
    label: 'PLATE',
    w: 800,
    h: 800,
    // A bumper plate: disc, centre hole, and a groove ring that the words leave as a gap.
    inside: (x, y) => {
      const r = Math.hypot(x - 400, y - 400) / 400;
      return r <= 1 && r > 0.25 && (r < 0.7 || r > 0.76);
    },
  },
  trophy: {
    label: 'TROPHY',
    w: 760,
    h: 800,
    inside: (x, y) => {
      const dx = Math.abs(x - 380);
      // Bowl: full width at the rim, curving in to the stem.
      if (y < 440) {
        const half = 230 * Math.sqrt(Math.max(0, 1 - (y / 470) ** 2));
        if (dx <= half) return true;
        // Ring handles either side of the bowl.
        const hx = Math.abs(dx - 230);
        const r = Math.hypot(hx, y - 150);
        return dx > 200 && r <= 128 && r >= 66 && y < 300;
      }
      if (y < 610) return dx <= 40; // stem
      if (y < 670) return dx <= 150; // plinth top
      return dx <= 210; // base
    },
  },
  heart: {
    label: 'HEART',
    w: 860,
    h: 760,
    // (x² + y² − 1)³ − x²y³ ≤ 0, mapped so the curve's bounds fill the box.
    inside: (px, py) => {
      const x = (px / 860 - 0.5) * 2 * 1.14;
      const y = 1.24 - (py / 760) * 2.26;
      const a = x * x + y * y - 1;
      return a * a * a - x * x * y * y * y <= 0;
    },
  },
};

export const CARD_SHAPES: { id: CardShape; label: string }[] = (Object.keys(SHAPES) as CardShape[]).map((id) => ({
  id,
  label: SHAPES[id].label,
}));

/**
 * Free-space raster of the shape with a summed-area table, so "does this box sit
 * entirely on free cells inside the shape?" is four lookups instead of a scan.
 */
class ShapeGrid {
  readonly gw: number;
  readonly gh: number;
  private free: Uint8Array;
  private sat: Int32Array;
  private order: number[];
  /** Box sizes already proven not to fit. Free space only shrinks, so these never fit later either. */
  private failed: { bw: number; bh: number }[] = [];

  constructor(width: number, height: number, inside: ShapeDef['inside']) {
    this.gw = Math.floor(width / CELL);
    this.gh = Math.floor(height / CELL);
    this.free = new Uint8Array(this.gw * this.gh);
    for (let gy = 0; gy < this.gh; gy++) {
      for (let gx = 0; gx < this.gw; gx++) {
        const x = (gx + 0.5) * CELL;
        const y = (gy + 0.5) * CELL;
        if (inside(x, y)) this.free[gy * this.gw + gx] = 1;
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
 * Lays the names out inside an invisible shape. Each lift is placed once at
 * the biggest size that fits (sized by rank of work done); if any lift can't fit,
 * every target shrinks and the whole pass reruns, so no lift is ever dropped.
 * Then names repeat as small, faint filler until nothing more fits, which is what
 * makes the silhouette readable with only a handful of lifts.
 */
function layoutShape(exercises: SummaryExercise[], def: ShapeDef): { words: CloudWord[]; height: number } {
  if (exercises.length === 0) return { words: [], height: 0 };

  const ranked = exercises
    .map((ex, i) => ({ ex, i }))
    .sort((a, b) => b.ex.setCount - a.ex.setCount || b.ex.volume - a.ex.volume || a.i - b.i)
    .map(({ ex }) => ex);
  const n = ranked.length;
  const left = PAD + (CONTENT_WIDTH - def.w) / 2;
  // WORD_MAX was tuned on the 470 px dumbbell; taller shapes get a proportionally bigger hero.
  const wordMax = WORD_MAX * Math.sqrt(def.h / SHAPES.dumbbell.h);
  const boxOf = (p: { cx: number; cy: number; bw: number; bh: number }): Box => ({
    x0: p.cx - p.bw / 2,
    y0: p.cy - p.bh / 2,
    x1: p.cx + p.bw / 2,
    y1: p.cy + p.bh / 2,
  });

  for (let shrink = 1; shrink > 0.2; shrink *= 0.82) {
    const grid = new ShapeGrid(def.w, def.h, def.inside);
    const words: CloudWord[] = [];
    let smallest = Infinity;
    let allPlaced = true;

    for (let rank = 0; rank < n && allPlaced; rank++) {
      const ex = ranked[rank];
      const t = n === 1 ? 0 : rank / (n - 1);
      let size = (wordMax - (wordMax - WORD_MIN) * Math.pow(t, 0.75)) * shrink;
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

    return { words: words.map((w) => ({ ...w, cx: w.cx + left })), height: def.h };
  }
  return { words: [], height: def.h };
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
      <G transform={rotate}>{glyphs(word.isPR ? accent() : WHITE, word.opacity)}</G>
    </G>
  );
}

interface Pill {
  text: string;
  x: number;
  w: number;
}

/** Muscle-group pills wrap onto more rows rather than getting dropped off the end. */
function layoutPills(groups: string[], maxWidth: number): { rows: Pill[][]; height: number } {
  if (groups.length === 0) return { rows: [], height: 0 };
  const rows: Pill[][] = [];
  let row: Pill[] = [];
  let rowWidth = 0;
  for (const text of groups) {
    const w = textWidth(text, 26, 800) + 52;
    const candidate = row.length === 0 ? w : rowWidth + 14 + w;
    if (row.length > 0 && candidate > maxWidth) {
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
  titleWidth: number;
  /** Front/back muscle map in the top-right corner, or null when nothing tagged maps to the body. */
  map: { x: number; y: number; size: number; levels: ReturnType<typeof regionLevels> } | null;
  titleText: string;
  pillsY: number;
  pills: ReturnType<typeof layoutPills>;
  statsY: number;
  stats: { value: string; label: string; pr?: boolean }[];
  dividerY: number;
  cloudY: number;
  cloud: ReturnType<typeof layoutShape>;
  footerY: number;
  height: number;
}

const layoutCache = new WeakMap<SessionSummary, Map<CardShape, Layout>>();

/**
 * Single source of truth for vertical positions, so cardHeight can never drift from
 * the render. Cached per summary and shape: the fill is a real search, and both
 * cardHeight and every re-render (e.g. the PANEL/CLEAR toggle) ask for it.
 */
function computeLayout(summary: SessionSummary, shape: CardShape): Layout {
  let perShape = layoutCache.get(summary);
  if (!perShape) {
    perShape = new Map();
    layoutCache.set(summary, perShape);
  }
  const cached = perShape.get(shape);
  if (cached) return cached;
  // Muscle map top-right: sets per group this session, primary muscle only. Skipped when
  // nothing in the session is tagged with a group the body map knows.
  const setsByGroup: Record<string, number> = {};
  for (const ex of summary.exercises) {
    if (GROUP_REGIONS[ex.muscleGroup]) setsByGroup[ex.muscleGroup] = (setsByGroup[ex.muscleGroup] ?? 0) + ex.setCount;
  }
  const mapSize = MAP_WIDTH / FIGURE_W;
  const map =
    Object.keys(setsByGroup).length > 0
      ? { x: CARD_WIDTH - PAD - MAP_WIDTH, y: 64, size: mapSize, levels: regionLevels(setsByGroup) }
      : null;

  // Title, date and pills share the row with the map, so they get what's left of it.
  const titleWidth = map ? CONTENT_WIDTH - MAP_WIDTH - 36 : CONTENT_WIDTH;
  const titleText = (summary.name || t('WORKOUT')).toUpperCase();
  const titleSize = [72, 56, 44].find((size) => textWidth(titleText, size, 800) <= titleWidth) ?? 44;

  const pills = layoutPills(summary.muscleGroups.map(muscleLabel), titleWidth);
  let y = 236 + 60; // eyebrow + title + date block
  const pillsY = y;
  y += pills.height;
  if (map) y = Math.max(y, map.y + FIGURE_H * mapSize + 8);

  const stats: { value: string; label: string; pr?: boolean }[] = [
    { value: formatVolume(summary.volume), label: t('VOLUME KG') },
    { value: String(summary.setCount), label: t('SETS') },
    { value: String(summary.exerciseCount), label: t('LIFTS') },
  ];
  if (summary.prCount > 0) stats.push({ value: String(summary.prCount), label: summary.prCount === 1 ? t('NEW PR') : t('NEW PRS'), pr: true });

  const statsY = y + 80;
  y = statsY + 90;

  const dividerY = y;
  const cloudY = y + 56;
  const cloud = layoutShape(summary.exercises, SHAPES[shape]);

  // Keep the canvas an integer so the rasteriser is happy.
  const footerY = Math.round(cloudY + cloud.height + 76);
  const layout = { titleSize, titleWidth, titleText, map, pillsY, pills, statsY, stats, dividerY, cloudY, cloud, footerY, height: footerY + 56 };
  perShape.set(shape, layout);
  return layout;
}

export function cardHeight(summary: SessionSummary, shape: CardShape): number {
  return computeLayout(summary, shape).height;
}

/** Has this shape's layout already been built (so rendering it now won't stall)? */
export function isCardPrepared(summary: SessionSummary, shape: CardShape): boolean {
  return layoutCache.get(summary)?.has(shape) ?? false;
}

/**
 * Does the (cached) word-art layout. It's a real search, so the summary screen
 * calls this after it has painted rather than during render.
 */
export function prepareCard(summary: SessionSummary, shape: CardShape): void {
  computeLayout(summary, shape);
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
      <Rect x={s(0)} y={s(14)} width={s(96)} height={s(8)} rx={s(4)} fill={accent()} />
      <Rect x={s(10)} y={s(2)} width={s(10)} height={s(32)} rx={s(4)} fill={accent()} />
      <Rect x={s(24)} y={s(7)} width={s(8)} height={s(22)} rx={s(3)} fill={accentLight()} />
      <Rect x={s(76)} y={s(2)} width={s(10)} height={s(32)} rx={s(4)} fill={accent()} />
      <Rect x={s(64)} y={s(7)} width={s(8)} height={s(22)} rx={s(3)} fill={accentLight()} />
    </G>
  );
}

interface ShareCardProps {
  summary: SessionSummary;
  shape: CardShape;
  width: number;
  height: number;
  /** Translucent dark panel behind the text. Off = fully transparent, but white text dies on a light photo. */
  scrim?: boolean;
}

export const ShareCard = forwardRef<React.ElementRef<typeof Svg>, ShareCardProps>(function ShareCard(
  { summary, shape, width, height, scrim = true },
  ref
) {
  const L = computeLayout(summary, shape);

  const pillEls = L.pills.rows.flatMap((row, rowIndex) => {
    const rowY = L.pillsY + rowIndex * 66;
    return row.map((pill) => (
      <G key={pill.text}>
        <Rect x={pill.x} y={rowY} width={pill.w} height={52} rx={26} fill={accent()} opacity={0.22} />
        <Rect x={pill.x} y={rowY} width={pill.w} height={52} rx={26} fill="none" stroke={accent()} strokeWidth={2} opacity={0.9} />
        <SvgText
          x={pill.x + pill.w / 2}
          y={rowY + 35}
          fontSize={26}
          fontWeight="800"
          fill={accentLight()}
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

      <Shadowed x={PAD} y={96} fontSize={30} fontWeight="800" fill={accent()} letterSpacing={8}>
        IRON LOG
      </Shadowed>
      <Shadowed x={PAD} y={182} fontSize={L.titleSize} fontWeight="800">
        {truncateToWidth(L.titleText, L.titleSize, 800, L.titleWidth)}
      </Shadowed>
      <Shadowed x={PAD} y={236} fontSize={32} fontWeight="600" opacity={0.82}>
        {formatDateDisplay(summary.date)}
      </Shadowed>

      {pillEls}

      {L.map && (
        <MuscleFigure
          x={L.map.x}
          y={L.map.y}
          size={L.map.size}
          levels={L.map.levels}
          scale={muscleScale('#4a5263', accent())}
          neutral="#2a303d"
          labelColor={WHITE}
          labels={false}
        />
      )}

      {L.stats.map((s, i) => (
        <G key={s.label}>
          <Shadowed x={PAD + colWidth * i} y={L.statsY} fontSize={66} fontWeight="800" fill={s.pr ? accent() : WHITE}>
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
