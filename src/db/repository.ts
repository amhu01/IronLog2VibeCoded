import { getDb } from './database';
import type {
  Exercise,
  ExerciseCatalogEntry,
  ExerciseLastUse,
  MuscleGroupSets,
  PersonalBest,
  Session,
  SetEntry,
  StatsSummary,
} from '../types';
import { dateToString, parseDateString } from '../utils/date';
import { bestEffectiveWeight } from '../utils/stats';

type Db = Awaited<ReturnType<typeof getDb>>;

function toNumOrStr(v: string | null): number | string {
  if (v === null || v === undefined) return '';
  if (v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

function toStorable(v: number | string): string {
  return v === undefined || v === null ? '' : String(v);
}

function normTag(v: string | undefined | null): string {
  return (v ?? '').trim().toUpperCase();
}

interface SessionRow {
  id: number;
  date: string;
  name: string;
}

interface SessionExerciseRow {
  id: number;
  session_id: number;
  name: string;
  muscle_group: string;
  machine: string;
  has_base_resistance: number;
  base_resistance: number | null;
  position: number;
}

interface SetRow {
  id: number;
  session_exercise_id: number;
  weight: string | null;
  reps: string | null;
  rir: number;
  position: number;
}

const EXERCISE_COLS = `id, session_id, name, muscle_group, machine, has_base_resistance, base_resistance, position`;
const SET_COLS = `id, session_exercise_id, weight, reps, rir, position`;

function rowsToSets(rows: SetRow[]): SetEntry[] {
  return rows.map((r) => ({ weight: toNumOrStr(r.weight), reps: toNumOrStr(r.reps), rir: !!r.rir }));
}

function rowToExercise(row: SessionExerciseRow, sets: SetEntry[]): Exercise {
  return {
    name: row.name,
    muscleGroup: row.muscle_group,
    machine: row.machine,
    hasBaseResistance: !!row.has_base_resistance,
    baseResistance: row.base_resistance ?? undefined,
    sets,
  };
}

async function insertExercisesForSession(db: Db, sessionId: number, exercises: Exercise[]) {
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const seResult = await db.runAsync(
      `INSERT INTO session_exercises (session_id, name, muscle_group, machine, has_base_resistance, base_resistance, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      normTag(ex.name),
      normTag(ex.muscleGroup),
      normTag(ex.machine),
      ex.hasBaseResistance ? 1 : 0,
      ex.hasBaseResistance && ex.baseResistance !== undefined ? ex.baseResistance : null,
      i
    );
    const sessionExerciseId = seResult.lastInsertRowId;
    for (let j = 0; j < ex.sets.length; j++) {
      const s = ex.sets[j];
      await db.runAsync(
        `INSERT INTO sets (session_exercise_id, weight, reps, rir, position) VALUES (?, ?, ?, ?, ?)`,
        sessionExerciseId,
        toStorable(s.weight),
        toStorable(s.reps),
        s.rir ? 1 : 0,
        j
      );
    }
  }
}

export async function createSession(date: string, exercises: Exercise[], name: string = ''): Promise<number> {
  const db = await getDb();
  let newId = -1;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(`INSERT INTO sessions (date, name) VALUES (?, ?)`, date, name.trim());
    newId = result.lastInsertRowId;
    await insertExercisesForSession(db, newId, exercises);
  });
  return newId;
}

export async function updateSession(id: number, date: string, exercises: Exercise[], name: string = ''): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE sessions SET date = ?, name = ? WHERE id = ?`, date, name.trim(), id);
    await db.runAsync(`DELETE FROM session_exercises WHERE session_id = ?`, id);
    await insertExercisesForSession(db, id, exercises);
  });
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sessions WHERE id = ?`, id);
}

export interface SessionListItem {
  id: number;
  date: string;
  name: string;
  exerciseNames: string[];
  muscleGroups: string[];
  setCount: number;
  volume: number;
}

export async function getSessionsList(): Promise<SessionListItem[]> {
  const db = await getDb();
  const sessions = await db.getAllAsync<SessionRow>(`SELECT id, date, name FROM sessions ORDER BY date DESC, id DESC`);
  const exRows = await db.getAllAsync<{ session_id: number; name: string; muscle_group: string }>(
    `SELECT session_id, name, muscle_group FROM session_exercises ORDER BY session_id ASC, position ASC`
  );
  const setRows = await db.getAllAsync<{ session_id: number; weight: string | null; reps: string | null }>(
    `SELECT se.session_id, st.weight, st.reps
     FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id`
  );

  const bySession = new Map<number, SessionListItem>();
  for (const s of sessions) {
    bySession.set(s.id, { id: s.id, date: s.date, name: s.name, exerciseNames: [], muscleGroups: [], setCount: 0, volume: 0 });
  }
  for (const r of exRows) {
    const item = bySession.get(r.session_id);
    if (!item) continue;
    item.exerciseNames.push(r.name);
    if (r.muscle_group && !item.muscleGroups.includes(r.muscle_group)) item.muscleGroups.push(r.muscle_group);
  }
  for (const r of setRows) {
    const item = bySession.get(r.session_id);
    if (!item) continue;
    item.setCount += 1;
    const w = Number(r.weight);
    const reps = Number(r.reps);
    if (r.weight && r.reps && !Number.isNaN(w) && !Number.isNaN(reps) && w > 0 && reps > 0) item.volume += w * reps;
  }
  return sessions.map((s) => bySession.get(s.id)!);
}

export async function getSessionDetail(id: number): Promise<Session | null> {
  const db = await getDb();
  const sessionRow = await db.getFirstAsync<SessionRow>(`SELECT id, date, name FROM sessions WHERE id = ?`, id);
  if (!sessionRow) return null;
  const exerciseRows = await db.getAllAsync<SessionExerciseRow>(
    `SELECT ${EXERCISE_COLS} FROM session_exercises WHERE session_id = ? ORDER BY position ASC`,
    id
  );
  const exercises: Exercise[] = [];
  for (const exRow of exerciseRows) {
    const setRows = await db.getAllAsync<SetRow>(
      `SELECT ${SET_COLS} FROM sets WHERE session_exercise_id = ? ORDER BY position ASC`,
      exRow.id
    );
    exercises.push(rowToExercise(exRow, rowsToSets(setRows)));
  }
  return { id: sessionRow.id, date: sessionRow.date, name: sessionRow.name, exercises };
}

export async function getAllExerciseNames(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name, MAX(id) as maxId FROM session_exercises GROUP BY name COLLATE NOCASE ORDER BY name COLLATE NOCASE ASC`
  );
  return rows.map((r) => r.name);
}

/** Every exercise ever logged, with its most recent muscle group and the machines it has been done on (newest first). */
export async function getExerciseCatalog(): Promise<ExerciseCatalogEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string; muscle_group: string; machine: string }>(
    `SELECT se.name, se.muscle_group, se.machine
     FROM session_exercises se JOIN sessions s ON s.id = se.session_id
     ORDER BY s.date DESC, se.id DESC`
  );
  const byName = new Map<string, ExerciseCatalogEntry>();
  for (const r of rows) {
    const key = r.name.toUpperCase();
    let entry = byName.get(key);
    if (!entry) {
      entry = { name: r.name, muscleGroup: '', machines: [] };
      byName.set(key, entry);
    }
    if (!entry.muscleGroup && r.muscle_group) entry.muscleGroup = r.muscle_group;
    if (r.machine && !entry.machines.includes(r.machine)) entry.machines.push(r.machine);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllMachines(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ machine: string }>(
    `SELECT DISTINCT machine FROM session_exercises WHERE machine <> '' ORDER BY machine ASC`
  );
  return rows.map((r) => r.machine);
}

export async function getRecentSessionNames(limit: number = 8): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name, MAX(date) as d FROM sessions WHERE name <> '' GROUP BY name COLLATE NOCASE ORDER BY d DESC, name ASC LIMIT ?`,
    limit
  );
  return rows.map((r) => r.name);
}

/**
 * Most recent use of an exercise. When `machine` is given, only a use on that exact
 * machine counts (so the caller can decide whether to re-fill weights for it).
 */
export async function getLastUseForExercise(name: string, machine?: string): Promise<ExerciseLastUse | null> {
  const db = await getDb();
  const base = `SELECT se.${EXERCISE_COLS.replace(/, /g, ', se.')}, s.date
     FROM session_exercises se JOIN sessions s ON s.id = se.session_id
     WHERE se.name = ? COLLATE NOCASE`;
  const exRow =
    machine === undefined
      ? await db.getFirstAsync<SessionExerciseRow & { date: string }>(`${base} ORDER BY s.date DESC, se.id DESC LIMIT 1`, name)
      : await db.getFirstAsync<SessionExerciseRow & { date: string }>(
          `${base} AND se.machine = ? COLLATE NOCASE ORDER BY s.date DESC, se.id DESC LIMIT 1`,
          name,
          normTag(machine)
        );
  if (!exRow) return null;
  const setRow = await db.getFirstAsync<SetRow>(
    `SELECT ${SET_COLS} FROM sets WHERE session_exercise_id = ? ORDER BY position ASC LIMIT 1`,
    exRow.id
  );
  return {
    name: exRow.name,
    muscleGroup: exRow.muscle_group,
    machine: exRow.machine,
    hasBaseResistance: !!exRow.has_base_resistance,
    baseResistance: exRow.base_resistance ?? undefined,
    lastWeight: setRow ? toNumOrStr(setRow.weight) : '',
    lastReps: setRow ? toNumOrStr(setRow.reps) : '',
  };
}

export interface ProgressPoint {
  date: string;
  sessionName: string;
  machine: string;
  effectiveWeight: number;
  reps: number | string;
}

/** Best effective weight per session for an exercise, oldest first, across every machine. */
export async function getProgressForExercise(name: string): Promise<ProgressPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionExerciseRow & { date: string; session_name: string }>(
    `SELECT se.${EXERCISE_COLS.replace(/, /g, ', se.')}, s.date, s.name AS session_name
     FROM session_exercises se JOIN sessions s ON s.id = se.session_id
     WHERE se.name = ? COLLATE NOCASE
     ORDER BY s.date ASC, se.id ASC`,
    name
  );
  const points: ProgressPoint[] = [];
  for (const row of rows) {
    const setRows = await db.getAllAsync<SetRow>(
      `SELECT ${SET_COLS} FROM sets WHERE session_exercise_id = ? ORDER BY position ASC`,
      row.id
    );
    const base = row.has_base_resistance ? row.base_resistance ?? 0 : 0;
    let best: { effectiveWeight: number; reps: number | string } | null = null;
    for (const sr of setRows) {
      const w = Number(sr.weight);
      const effective = base + (Number.isNaN(w) ? 0 : w);
      if (!best || effective > best.effectiveWeight) {
        best = { effectiveWeight: effective, reps: toNumOrStr(sr.reps) };
      }
    }
    if (best) {
      points.push({ date: row.date, sessionName: row.session_name, machine: row.machine, ...best });
    }
  }
  return points;
}

export interface NewPR {
  name: string;
  machine: string;
  effectiveWeight: number;
  previousBest: number;
}

/** Call BEFORE saving: which of these exercises beat their stored best on the same machine? */
export async function findNewPRs(exercises: Exercise[]): Promise<NewPR[]> {
  const prs: NewPR[] = [];
  for (const ex of exercises) {
    const best = bestEffectiveWeight(ex);
    if (best === null) continue;
    const machine = normTag(ex.machine);
    const prior = (await getProgressForExercise(ex.name)).filter((p) => p.machine === machine);
    if (prior.length === 0) continue;
    const previousBest = Math.max(...prior.map((p) => p.effectiveWeight));
    if (best > previousBest) prs.push({ name: normTag(ex.name), machine, effectiveWeight: best, previousBest });
  }
  return prs;
}

async function setsByMuscleGroup(db: Db, sinceDate?: string): Promise<MuscleGroupSets[]> {
  const where = sinceDate ? `WHERE s.date >= ?` : ``;
  const rows = await db.getAllAsync<{ muscleGroup: string; sets: number }>(
    `SELECT se.muscle_group AS muscleGroup, COUNT(st.id) AS sets
     FROM sets st
     JOIN session_exercises se ON se.id = st.session_exercise_id
     JOIN sessions s ON s.id = se.session_id
     ${where}
     GROUP BY se.muscle_group
     ORDER BY sets DESC, muscleGroup ASC`,
    ...(sinceDate ? [sinceDate] : [])
  );
  return rows;
}

export async function getStats(): Promise<StatsSummary> {
  const db = await getDb();

  const totalSessionsRow = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM sessions`);
  const totalSessions = totalSessionsRow?.c ?? 0;

  const distinctExercisesRow = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(DISTINCT name COLLATE NOCASE) as c FROM session_exercises`
  );
  const distinctExercises = distinctExercisesRow?.c ?? 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = dateToString(sevenDaysAgo);
  const last7Row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM sessions WHERE date >= ?`, sevenDaysAgoStr);
  const sessionsLast7Days = last7Row?.c ?? 0;

  const firstSessionRow = await db.getFirstAsync<{ date: string }>(`SELECT date FROM sessions ORDER BY date ASC LIMIT 1`);
  let weeksSinceFirstSession = 0;
  if (firstSessionRow) {
    const first = parseDateString(firstSessionRow.date);
    const diffMs = Date.now() - first.getTime();
    weeksSinceFirstSession = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)));
  }

  const mostTrainedRow = await db.getFirstAsync<{ name: string; sessionCount: number }>(
    `SELECT name, COUNT(DISTINCT session_id) as sessionCount
     FROM session_exercises
     GROUP BY name COLLATE NOCASE
     ORDER BY sessionCount DESC, name ASC
     LIMIT 1`
  );
  const mostTrainedExercise = mostTrainedRow ? { name: mostTrainedRow.name, sessionCount: mostTrainedRow.sessionCount } : null;

  const personalBests: PersonalBest[] = [];
  for (const name of await getAllExerciseNames()) {
    const byMachine = new Map<string, ProgressPoint>();
    for (const p of await getProgressForExercise(name)) {
      const current = byMachine.get(p.machine);
      if (!current || p.effectiveWeight > current.effectiveWeight) byMachine.set(p.machine, p);
    }
    for (const [machine, best] of byMachine) {
      personalBests.push({ exerciseName: name, machine, effectiveWeight: best.effectiveWeight, reps: best.reps, date: best.date });
    }
  }
  personalBests.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName) || a.machine.localeCompare(b.machine));

  return {
    totalSessions,
    distinctExercises,
    sessionsLast7Days,
    weeksSinceFirstSession,
    mostTrainedExercise,
    personalBests,
    setsByMuscleGroupLast7Days: await setsByMuscleGroup(db, sevenDaysAgoStr),
    setsByMuscleGroupAllTime: await setsByMuscleGroup(db),
  };
}

export async function exportAllSessions(): Promise<Session[]> {
  const db = await getDb();
  const sessions = await db.getAllAsync<SessionRow>(`SELECT id, date, name FROM sessions ORDER BY date ASC, id ASC`);
  const result: Session[] = [];
  for (const s of sessions) {
    const detail = await getSessionDetail(s.id);
    if (detail) result.push(detail);
  }
  return result;
}

async function insertSessions(db: Db, sessions: Omit<Session, 'id'>[]) {
  for (const s of sessions) {
    const result = await db.runAsync(`INSERT INTO sessions (date, name) VALUES (?, ?)`, s.date, (s.name ?? '').trim());
    await insertExercisesForSession(db, result.lastInsertRowId, s.exercises);
  }
}

export async function replaceAllData(sessions: Omit<Session, 'id'>[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM sessions`);
    await insertSessions(db, sessions);
  });
}

export async function mergeData(sessions: Omit<Session, 'id'>[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await insertSessions(db, sessions);
  });
}
