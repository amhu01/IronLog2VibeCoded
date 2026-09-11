export interface SetEntry {
  weight: number | string;
  reps: number | string;
  rir?: boolean;
}

export interface Exercise {
  name: string;
  hasBaseResistance?: boolean;
  baseResistance?: number;
  sets: SetEntry[];
}

export interface Session {
  id: number;
  date: string; // YYYY-MM-DD
  exercises: Exercise[];
}

export interface ExerciseLastUse {
  name: string;
  hasBaseResistance?: boolean;
  baseResistance?: number;
  lastWeight: number | string;
  lastReps: number | string;
}

export interface PersonalBest {
  exerciseName: string;
  effectiveWeight: number;
  reps: number | string;
  date: string;
}

export interface StatsSummary {
  totalSessions: number;
  distinctExercises: number;
  sessionsLast7Days: number;
  weeksSinceFirstSession: number;
  mostTrainedExercise: { name: string; sessionCount: number } | null;
  personalBests: PersonalBest[];
}
