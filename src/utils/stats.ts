import type { Exercise } from '../types';
import { parseCount, weightToKg } from './weight';

export function setEffectiveWeight(ex: Exercise, weight: number | string): number | null {
  const kg = weightToKg(weight);
  if (kg === null) return null;
  return (ex.hasBaseResistance ? ex.baseResistance ?? 0 : 0) + kg;
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
    const kg = weightToKg(s.weight);
    const reps = parseCount(s.reps);
    if (kg !== null && reps !== null && kg > 0 && reps > 0) total += kg * reps;
  }
  return total;
}

export function sessionVolume(exercises: Exercise[]): number {
  return exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

export function countSets(exercises: Exercise[]): number {
  return exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}
