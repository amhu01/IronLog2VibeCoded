/**
 * Geometry for the front/back muscle map, shared by the in-app MuscleMap and the
 * share card. Each view is VIEW_W × VIEW_H; parts are drawn for the figure's
 * left half (viewer's left) and mirrored about the centre line unless `center`.
 */

export const VIEW_W = 200;
export const VIEW_H = 420;

export type MuscleRegion =
  | 'chest'
  | 'delts'
  | 'traps'
  | 'upperBack'
  | 'lats'
  | 'lowerBack'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'adductors'
  | 'calves';

export interface BodyPart {
  d: string;
  /** Omitted for non-muscle parts (head, hands, knees, feet), which are always drawn neutral. */
  region?: MuscleRegion;
  /** Drawn once, already symmetric. */
  center?: boolean;
}

const HEAD = 'M100,6 C112,6 118,16 118,28 C118,40 112,50 100,50 C88,50 82,40 82,28 C82,16 88,6 100,6 Z';
const NECK = 'M91,48 L109,48 L110,60 L90,60 Z';
const HAND = 'M41,203 C46,201 52,203 53,209 C54,217 51,225 46,226 C41,226 38,219 38,212 C38,207 39,204 41,203 Z';
const KNEE = 'M74,302 C80,299 90,299 94,303 C95,309 93,316 88,318 C82,319 76,317 74,312 Z';
const FOOT = 'M74,386 C80,383 90,384 92,388 C93,394 92,400 86,402 C78,403 70,401 70,396 C70,391 71,388 74,386 Z';

// Shapes shared by both views (arms and lower legs sit in the same place front and back).
const DELT = 'M88,61 C76,59 62,62 55,72 C49,81 48,92 50,102 C55,97 61,91 68,86 C74,82 80,77 84,71 Z';
const UPPER_ARM = 'M50,106 C47,118 46,131 48,144 C53,147 59,146 63,142 C65,129 66,115 66,103 C61,99 54,101 50,106 Z';
const FOREARM = 'M47,149 C43,163 40,180 41,198 C45,200 50,200 53,198 C57,183 61,166 63,148 C58,151 52,151 47,149 Z';

export const FRONT_PARTS: BodyPart[] = [
  { d: HEAD, center: true },
  { d: NECK, center: true },
  // Front traps: the slope from neck to shoulder.
  { d: 'M91,53 C85,58 77,62 68,64 C76,69 87,69 92,65 Z', region: 'traps' },
  { d: DELT, region: 'delts' },
  { d: 'M98,68 L86,68 C78,74 72,84 72,96 C76,106 88,110 98,106 Z', region: 'chest' },
  { d: UPPER_ARM, region: 'biceps' },
  { d: FOREARM, region: 'forearms' },
  { d: HAND },
  // Six-pack: three blocks per side, then the lower abs tapering down.
  { d: 'M88,112 L98,112 L98,131 L88,131 Q87,121 88,112 Z', region: 'abs' },
  { d: 'M88,134 L98,134 L98,154 L88,154 Z', region: 'abs' },
  { d: 'M88,157 L98,157 L98,177 L88,177 Z', region: 'abs' },
  { d: 'M88,180 L98,180 L98,202 C93,200 90,194 88,188 Z', region: 'abs' },
  { d: 'M84,110 C78,122 76,140 77,158 C78,174 81,186 85,194 L85,112 Z', region: 'obliques' },
  { d: 'M77,206 C71,228 69,258 73,288 C76,296 83,299 89,296 C92,272 93,244 92,214 C88,208 82,205 77,206 Z', region: 'quads' },
  { d: 'M93,208 C97,212 99,220 99,234 C98,248 96,260 94,268 C94,248 94,226 93,208 Z', region: 'adductors' },
  { d: KNEE },
  { d: 'M74,322 C70,338 70,358 74,378 L81,378 C80,358 80,340 81,322 Z', region: 'calves' },
  { d: 'M83,321 L91,321 C91,344 89,364 86,382 L83,382 Z' },
  { d: FOOT },
];

export const BACK_PARTS: BodyPart[] = [
  { d: HEAD, center: true },
  { d: NECK, center: true },
  // Traps: a diamond from the neck down the spine (left half; the mirror completes it).
  // Traps: neck to shoulder, then down the spine between the shoulder blades.
  { d: 'M100,50 L90,56 C82,61 75,64 70,66 L98,112 L100,112 Z', region: 'traps' },
  { d: DELT, region: 'delts' },
  // Upper back (rhomboids/teres) fills the wedge under the trap's lower edge; no overlap.
  { d: 'M70,71 L95,110 C87,109 79,106 73,102 C69,94 68,82 70,71 Z', region: 'upperBack' },
  { d: 'M73,107 C71,120 72,135 78,148 C84,160 92,168 97,172 L97,116 C88,114 80,111 73,107 Z', region: 'lats' },
  { d: 'M88,168 C90,178 92,188 93,196 L98,196 L98,176 C95,174 91,171 88,168 Z', region: 'lowerBack' },
  { d: UPPER_ARM, region: 'triceps' },
  { d: FOREARM, region: 'forearms' },
  { d: HAND },
  { d: 'M80,200 C73,210 72,228 78,240 C86,248 96,246 99,236 L99,202 C94,197 86,196 80,200 Z', region: 'glutes' },
  { d: 'M76,246 C71,264 71,284 76,298 L91,298 C95,282 97,264 96,248 C89,250 82,250 76,246 Z', region: 'hamstrings' },
  { d: KNEE },
  { d: 'M75,322 C69,336 70,354 77,368 C82,360 84,344 84,324 Z', region: 'calves' },
  { d: 'M86,322 C86,344 88,358 92,368 C97,354 97,336 92,322 Z', region: 'calves' },
  { d: 'M80,370 L90,370 L89,384 L81,384 Z' },
  { d: FOOT },
];

/**
 * Primary-only mapping: an exercise lights exactly the regions of its one muscle
 * group. General tags (BACK, SHOULDERS) light every part they cover; the specific
 * tags (LATS, TRAPS, LOWER BACK) light just theirs. CARDIO has no region.
 */
export const GROUP_REGIONS: Record<string, MuscleRegion[]> = {
  CHEST: ['chest'],
  SHOULDERS: ['delts'],
  TRAPS: ['traps'],
  BACK: ['upperBack', 'lats'],
  LATS: ['lats'],
  'LOWER BACK': ['lowerBack'],
  BICEPS: ['biceps'],
  TRICEPS: ['triceps'],
  FOREARMS: ['forearms'],
  ABS: ['abs'],
  OBLIQUES: ['obliques'],
  QUADS: ['quads'],
  HAMSTRINGS: ['hamstrings'],
  GLUTES: ['glutes'],
  ADDUCTORS: ['adductors'],
  CALVES: ['calves'],
};

/** Which muscle groups light a region (for tap-to-explain on the map). */
export function groupsForRegion(region: MuscleRegion): string[] {
  return Object.keys(GROUP_REGIONS).filter((g) => GROUP_REGIONS[g].includes(region));
}

/**
 * Set count per muscle group → intensity 0–4 per region, relative to the busiest
 * region. A region lit by two tags (lats via BACK and LATS) sums them.
 */
export function regionLevels(setsByGroup: Record<string, number>): Partial<Record<MuscleRegion, number>> {
  const totals: Partial<Record<MuscleRegion, number>> = {};
  for (const [group, sets] of Object.entries(setsByGroup)) {
    for (const region of GROUP_REGIONS[group] ?? []) totals[region] = (totals[region] ?? 0) + sets;
  }
  const max = Math.max(0, ...Object.values(totals).map((v) => v ?? 0));
  const levels: Partial<Record<MuscleRegion, number>> = {};
  for (const [region, sets] of Object.entries(totals) as [MuscleRegion, number][]) {
    if (sets > 0) levels[region] = Math.max(1, Math.ceil((sets / max) * 4));
  }
  return levels;
}
