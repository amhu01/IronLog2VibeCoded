import type { Exercise, Session, SetEntry } from '../types';

export type ImportedSession = Omit<Session, 'id'>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseBackup(raw: unknown): ImportedSession[] {
  const list = Array.isArray(raw) ? raw : isPlainObject(raw) && Array.isArray(raw.sessions) ? raw.sessions : null;
  if (!list) throw new Error('Backup must be a JSON array of sessions (or an object with a "sessions" array).');

  return list.map((s, i) => {
    if (!isPlainObject(s) || typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
      throw new Error(`Session ${i + 1} is missing a valid date (YYYY-MM-DD).`);
    }
    const exercisesRaw = Array.isArray(s.exercises) ? s.exercises : [];
    const exercises: Exercise[] = exercisesRaw.map((e, j) => {
      if (!isPlainObject(e) || typeof e.name !== 'string' || !e.name.trim()) {
        throw new Error(`Session ${i + 1}, exercise ${j + 1} is missing a name.`);
      }
      const setsRaw = Array.isArray(e.sets) ? e.sets : [];
      const sets: SetEntry[] = setsRaw.map((st) => {
        const o = isPlainObject(st) ? st : {};
        const weight = typeof o.weight === 'number' || typeof o.weight === 'string' ? o.weight : '';
        const reps = typeof o.reps === 'number' || typeof o.reps === 'string' ? o.reps : '';
        // "rir" is what pre-v4 exports called this flag; keep reading it.
        return { weight, reps, ws: !!(o.ws ?? o.rir) };
      });
      const ex: Exercise = { name: e.name.trim().toUpperCase(), sets };
      if (typeof e.muscleGroup === 'string' && e.muscleGroup.trim()) ex.muscleGroup = e.muscleGroup.trim().toUpperCase();
      if (typeof e.machine === 'string' && e.machine.trim()) ex.machine = e.machine.trim().toUpperCase();
      if (e.hasBaseResistance) {
        ex.hasBaseResistance = true;
        ex.baseResistance = typeof e.baseResistance === 'number' ? e.baseResistance : Number(e.baseResistance) || 0;
      }
      return ex;
    });
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    return { date: s.date, name, exercises };
  });
}
