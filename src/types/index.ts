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
  rir?: boolean;
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
