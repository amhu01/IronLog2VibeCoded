import { getDb } from './database';
import type { Exercise, ExerciseLastUse, PersonalBest, Session, SetEntry, StatsSummary } from '../types';
import { dateToString, parseDateString } from '../utils/date';

function toNumOrStr(v: string | null): number | string {
  if (v === null || v === undefined) return '';
  if (v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

function toStorable(v: number | string): string {
  return v === undefined || v === null ? '' : String(v);
}

interface SessionRow {
  id: number;
  date: string;
}

interface SessionExerciseRow {
  id: number;
  session_id: number;
  name: string;
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

async function insertExercisesForSession(db: Awaited<ReturnType<typeof getDb>>, sessionId: number, exercises: Exercise[]) {
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const seResult = await db.runAsync(
      `INSERT INTO session_exercises (session_id, name, has_base_resistance, base_resistance, position) VALUES (?, ?, ?, ?, ?)`,
      sessionId,
      ex.name,
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

export async function createSession(date: string, exercises: Exercise[]): Promise<number> {
  const db = await getDb();
  let newId = -1;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(`INSERT INTO sessions (date) VALUES (?)`, date);
    newId = result.lastInsertRowId;
    await insertExercisesForSession(db, newId, exercises);
  });
  return newId;
}

export async function updateSession(id: number, date: string, exercises: Exercise[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE sessions SET date = ? WHERE id = ?`, date, id);
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
  exerciseNames: string[];
}

export async function getSessionsList(): Promise<SessionListItem[]> {
  const db = await getDb();
  const sessions = await db.getAllAsync<SessionRow>(`SELECT id, date FROM sessions ORDER BY date DESC, id DESC`);
  const result: SessionListItem[] = [];
  for (const s of sessions) {
    const exs = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM session_exercises WHERE session_id = ? ORDER BY position ASC`,
      s.id
    );
    result.push({ id: s.id, date: s.date, exerciseNames: exs.map((e) => e.name) });
  }
  return result;
}

export async function getSessionDetail(id: number): Promise<Session | null> {
  const db = await getDb();
  const sessionRow = await db.getFirstAsync<SessionRow>(`SELECT id, date FROM sessions WHERE id = ?`, id);
  if (!sessionRow) return null;
  const exerciseRows = await db.getAllAsync<SessionExerciseRow>(
    `SELECT id, session_id, name, has_base_resistance, base_resistance, position FROM session_exercises WHERE session_id = ? ORDER BY position ASC`,
    id
  );
  const exercises: Exercise[] = [];
  for (const exRow of exerciseRows) {
    const setRows = await db.getAllAsync<SetRow>(
      `SELECT id, session_exercise_id, weight, reps, rir, position FROM sets WHERE session_exercise_id = ? ORDER BY position ASC`,
      exRow.id
    );
    const sets: SetEntry[] = setRows.map((r) => ({
      weight: toNumOrStr(r.weight),
      reps: toNumOrStr(r.reps),
      rir: !!r.rir,
    }));
    exercises.push({
      name: exRow.name,
      hasBaseResistance: !!exRow.has_base_resistance,
      baseResistance: exRow.base_resistance ?? undefined,
      sets,
    });
  }
  return { id: sessionRow.id, date: sessionRow.date, exercises };
}

export async function getAllExerciseNames(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name, MAX(id) as maxId FROM session_exercises GROUP BY name COLLATE NOCASE ORDER BY name COLLATE NOCASE ASC`
  );
  return rows.map((r) => r.name);
}

export async function getLastUseForExercise(name: string): Promise<ExerciseLastUse | null> {
  const db = await getDb();
  const exRow = await db.getFirstAsync<SessionExerciseRow & { date: string }>(
    `SELECT se.id, se.session_id, se.name, se.has_base_resistance, se.base_resistance, se.position, s.date
     FROM session_exercises se
     JOIN sessions s ON s.id = se.session_id
     WHERE se.name = ? COLLATE NOCASE
     ORDER BY s.date DESC, se.id DESC
     LIMIT 1`,
    name
  );
  if (!exRow) return null;
  const setRow = await db.getFirstAsync<SetRow>(
    `SELECT id, session_exercise_id, weight, reps, rir, position FROM sets WHERE session_exercise_id = ? ORDER BY position ASC LIMIT 1`,
    exRow.id
  );
  return {
    name: exRow.name,
    hasBaseResistance: !!exRow.has_base_resistance,
    baseResistance: exRow.base_resistance ?? undefined,
    lastWeight: setRow ? toNumOrStr(setRow.weight) : '',
    lastReps: setRow ? toNumOrStr(setRow.reps) : '',
  };
}

export interface ProgressPoint {
  date: string;
  effectiveWeight: number;
  reps: number | string;
}

export async function getProgressForExercise(name: string): Promise<ProgressPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionExerciseRow & { date: string }>(
    `SELECT se.id, se.session_id, se.name, se.has_base_resistance, se.base_resistance, se.position, s.date
     FROM session_exercises se
     JOIN sessions s ON s.id = se.session_id
     WHERE se.name = ? COLLATE NOCASE
     ORDER BY s.date ASC, se.id ASC`,
    name
  );
  const points: ProgressPoint[] = [];
  for (const row of rows) {
    const setRows = await db.getAllAsync<SetRow>(
      `SELECT id, session_exercise_id, weight, reps, rir, position FROM sets WHERE session_exercise_id = ? ORDER BY position ASC`,
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
      points.push({ date: row.date, effectiveWeight: best.effectiveWeight, reps: best.reps });
    }
  }
  return points;
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
  const last7Row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM sessions WHERE date >= ?`,
    sevenDaysAgoStr
  );
  const sessionsLast7Days = last7Row?.c ?? 0;

  const firstSessionRow = await db.getFirstAsync<{ date: string }>(`SELECT date FROM sessions ORDER BY date ASC LIMIT 1`);
  let weeksSinceFirstSession = 0;
  if (firstSessionRow) {
    const first = parseDateString(firstSessionRow.date);
    const now = new Date();
    const diffMs = now.getTime() - first.getTime();
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

  const exerciseNames = await getAllExerciseNames();
  const personalBests: PersonalBest[] = [];
  for (const name of exerciseNames) {
    const points = await getProgressForExercise(name);
    if (points.length === 0) continue;
    let best = points[0];
    for (const p of points) {
      if (p.effectiveWeight > best.effectiveWeight) best = p;
    }
    personalBests.push({ exerciseName: name, effectiveWeight: best.effectiveWeight, reps: best.reps, date: best.date });
  }
  personalBests.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

  return {
    totalSessions,
    distinctExercises,
    sessionsLast7Days,
    weeksSinceFirstSession,
    mostTrainedExercise,
    personalBests,
  };
}

export async function exportAllSessions(): Promise<Session[]> {
  const db = await getDb();
  const sessions = await db.getAllAsync<SessionRow>(`SELECT id, date FROM sessions ORDER BY date ASC, id ASC`);
  const result: Session[] = [];
  for (const s of sessions) {
    const detail = await getSessionDetail(s.id);
    if (detail) result.push(detail);
  }
  return result;
}

export async function replaceAllData(sessions: Omit<Session, 'id'>[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM sessions`);
    for (const s of sessions) {
      const result = await db.runAsync(`INSERT INTO sessions (date) VALUES (?)`, s.date);
      await insertExercisesForSession(db, result.lastInsertRowId, s.exercises);
    }
  });
}

export async function mergeData(sessions: Omit<Session, 'id'>[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const s of sessions) {
      const result = await db.runAsync(`INSERT INTO sessions (date) VALUES (?)`, s.date);
      await insertExercisesForSession(db, result.lastInsertRowId, s.exercises);
    }
  });
}
