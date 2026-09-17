import type { Exercise } from '../types';

function asNumber(v: number | string): number | null {
  if (String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function setEffectiveWeight(ex: Exercise, weight: number | string): number | null {
  const w = asNumber(weight);
  if (w === null) return null;
  return (ex.hasBaseResistance ? ex.baseResistance ?? 0 : 0) + w;
}

export function bestEffectiveWeight(ex: Exercise): number | null {
  let best: number | null = null;
  for (const s of ex.sets) {
    const eff = setEffectiveWeight(ex, s.weight);
    if (eff !== null && (best === null || eff > best)) best = eff;
  }
  return best;
}

export function exerciseVolume(ex: Exercise): number {
  let total = 0;
  for (const s of ex.sets) {
    const w = asNumber(s.weight);
    const r = asNumber(s.reps);
    if (w !== null && r !== null && w > 0 && r > 0) total += w * r;
  }
  return total;
}

export function sessionVolume(exercises: Exercise[]): number {
  return exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

export function countSets(exercises: Exercise[]): number {
  return exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}
