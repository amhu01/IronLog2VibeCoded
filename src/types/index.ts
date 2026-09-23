export const MUSCLE_GROUPS = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'CORE',
  'CARDIO',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface SetEntry {
  weight: number | string;
  reps: number | string;
  /** Working set — the set taken at the top of the working range. */
  ws?: boolean;
}

export interface Exercise {
  name: string;
  muscleGroup?: string;
  machine?: string;
  hasBaseResistance?: boolean;
  baseResistance?: number;
  sets: SetEntry[];
}

export interface Session {
  id: number;
  date: string; // YYYY-MM-DD
  name?: string;
  exercises: Exercise[];
}

export interface SessionTemplate {
  name: string;
  exercises: Exercise[];
}

export interface ExerciseLastUse {
  name: string;
  muscleGroup: string;
  machine: string;
  hasBaseResistance?: boolean;
  baseResistance?: number;
  lastWeight: number | string;
  lastReps: number | string;
}

export interface ExerciseCatalogEntry {
  name: string;
  muscleGroup: string;
  machines: string[];
}

export interface PersonalBest {
  exerciseName: string;
  machine: string;
  effectiveWeight: number;
  reps: number | string;
  date: string;
}

export interface MuscleGroupSets {
  muscleGroup: string;
  sets: number;
}

export interface StatsSummary {
  totalSessions: number;
  distinctExercises: number;
  sessionsLast7Days: number;
  weeksSinceFirstSession: number;
  mostTrainedExercise: { name: string; sessionCount: number } | null;
  personalBests: PersonalBest[];
  setsByMuscleGroupLast7Days: MuscleGroupSets[];
  setsByMuscleGroupAllTime: MuscleGroupSets[];
}

export interface SummaryExercise {
  name: string;
  machine: string;
  muscleGroup: string;
  setCount: number;
  topSet: string;
  bestWeight: number | null;
  volume: number;
  isPR: boolean;
  prDelta: number | null;
}

export interface SessionSummary {
  id: number;
  date: string;
  name: string;
  exerciseCount: number;
  setCount: number;
  workingSets: number;
  volume: number;
  muscleGroups: string[];
  exercises: SummaryExercise[];
  prCount: number;
}
