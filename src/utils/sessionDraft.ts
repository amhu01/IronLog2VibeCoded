import type { Exercise, SetEntry } from '../types';

export interface DraftSet {
  weight: string;
  reps: string;
  ws: boolean;
}

export interface DraftExercise {
  key: string;
  name: string;
  muscleGroup: string;
  machine: string;
  notes: string;
  /** The last note logged for this lift, offered as a tap-to-reuse hint (never saved from here). */
  lastNote: string;
  hasBaseResistance: boolean;
  baseResistance: string;
  sets: DraftSet[];
}

let keyCounter = 0;
export function nextKey(): string {
  keyCounter += 1;
  return `ex-${Date.now()}-${keyCounter}`;
}

export function makeDraftSet(weight: string = '', reps: string = '', ws: boolean = false): DraftSet {
  return { weight, reps, ws };
}

export function makeDraftExercise(name: string): DraftExercise {
  return {
    key: nextKey(),
    name,
    muscleGroup: '',
    machine: '',
    notes: '',
    lastNote: '',
    hasBaseResistance: false,
    baseResistance: '',
    sets: [makeDraftSet()],
  };
}

/**
 * `notesAsHint` is for repeating a session: last time's note becomes the hint rather
 * than being copied into the new session as if it had been written today.
 */
export function exerciseToDraft(ex: Exercise, notesAsHint = false): DraftExercise {
  return {
    key: nextKey(),
    name: ex.name,
    muscleGroup: ex.muscleGroup ?? '',
    machine: ex.machine ?? '',
    notes: notesAsHint ? '' : ex.notes ?? '',
    lastNote: notesAsHint ? ex.notes ?? '' : '',
    hasBaseResistance: !!ex.hasBaseResistance,
    baseResistance: ex.baseResistance !== undefined ? String(ex.baseResistance) : '',
    sets:
      ex.sets.length > 0
        ? ex.sets.map((s) => makeDraftSet(String(s.weight ?? ''), String(s.reps ?? ''), !!s.ws))
        : [makeDraftSet()],
  };
}

function parseSetValue(v: string): number | string {
  const trimmed = v.trim();
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}

export function draftsToExercises(drafts: DraftExercise[]): Exercise[] {
  return drafts
    .filter((d) => d.name.trim() !== '')
    .map((d) => {
      const sets: SetEntry[] = d.sets
        .filter((s) => s.weight.trim() !== '' || s.reps.trim() !== '')
        .map((s) => ({ weight: parseSetValue(s.weight), reps: parseSetValue(s.reps), ws: s.ws }));
      const exercise: Exercise = { name: d.name.trim().toUpperCase(), sets };
      const muscleGroup = d.muscleGroup.trim().toUpperCase();
      const machine = d.machine.trim().toUpperCase();
      if (muscleGroup) exercise.muscleGroup = muscleGroup;
      if (machine) exercise.machine = machine;
      const notes = d.notes.trim();
      if (notes) exercise.notes = notes;
      if (d.hasBaseResistance) {
        exercise.hasBaseResistance = true;
        const br = Number(d.baseResistance);
        exercise.baseResistance = Number.isNaN(br) ? 0 : br;
      }
      return exercise;
    })
    .filter((ex) => ex.sets.length > 0);
}
