import * as SQLite from 'expo-sqlite';

const DB_NAME = 'ironlog.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      has_base_resistance INTEGER NOT NULL DEFAULT 0,
      base_resistance REAL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
      weight TEXT,
      reps TEXT,
      rir INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_session_exercises_session_id ON session_exercises(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_exercises_name ON session_exercises(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_sets_session_exercise_id ON sets(session_exercise_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
  `);

  // Exercise names are stored uppercase; fold any rows written before that rule.
  await db.runAsync(`UPDATE session_exercises SET name = UPPER(name) WHERE name <> UPPER(name)`);

  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}
