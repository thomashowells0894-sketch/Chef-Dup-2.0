/**
 * VibeFit Advanced Workout Engine
 * Progressive overload tracking, 1RM calculations, volume analysis,
 * periodization, muscle group heatmaps, and workout scoring.
 */

// ============================================================================
// 1RM CALCULATIONS
// ============================================================================

interface OneRMResult {
  estimated1RM: number;
  formulas: Record<string, number>;
  confidence: string;
  reps?: number;
  weight?: number;
}

/**
 * Calculate estimated 1 Rep Max using multiple formulas and take average
 */
function calculate1RM(weight: number, reps: number): OneRMResult | null {
  if (!weight || !reps || reps < 1) return null;
  if (reps === 1) return { estimated1RM: weight, formulas: {}, confidence: 'exact' };

  // Multiple formulas for better accuracy
  const epley: number = weight * (1 + reps / 30);
  const brzycki: number = weight * (36 / (37 - reps));
  const lander: number = (100 * weight) / (101.3 - 2.67123 * reps);
  const lombardi: number = weight * Math.pow(reps, 0.1);
  const oconner: number = weight * (1 + 0.025 * reps);

  const formulas: Record<string, number> = { epley: Math.round(epley), brzycki: Math.round(brzycki), lander: Math.round(lander), lombardi: Math.round(lombardi), oconner: Math.round(oconner) };
  const values: number[] = Object.values(formulas);
  const estimated1RM: number = Math.round(values.reduce((s: number, v: number) => s + v, 0) / values.length);
  const confidence: string = reps <= 5 ? 'high' : reps <= 10 ? 'medium' : 'low';

  return { estimated1RM, formulas, confidence, reps, weight };
}

/**
 * Calculate working weight for target reps based on 1RM
 */
function calculateWorkingWeight(oneRM: number, targetReps: number, intensity: number = 1.0): number | null {
  if (!oneRM || !targetReps) return null;
  // Brzycki formula reversed
  const weight: number = oneRM * ((37 - targetReps) / 36) * intensity;
  return Math.round(weight / 2.5) * 2.5; // Round to nearest 2.5
}

interface TrainingLoad {
  percent: number;
  weight: number;
  reps: number;
  purpose: string;
}

/**
 * Generate percentage-based training loads
 */
function generateTrainingLoads(oneRM: number): TrainingLoad[] {
  if (!oneRM) return [];
  return [
    { percent: 100, weight: oneRM, reps: 1, purpose: 'Max Effort' },
    { percent: 95, weight: Math.round(oneRM * 0.95), reps: 2, purpose: 'Strength Peak' },
    { percent: 90, weight: Math.round(oneRM * 0.90), reps: 3, purpose: 'Heavy Strength' },
    { percent: 85, weight: Math.round(oneRM * 0.85), reps: 5, purpose: 'Strength' },
    { percent: 80, weight: Math.round(oneRM * 0.80), reps: 6, purpose: 'Strength-Hypertrophy' },
    { percent: 75, weight: Math.round(oneRM * 0.75), reps: 8, purpose: 'Hypertrophy' },
    { percent: 70, weight: Math.round(oneRM * 0.70), reps: 10, purpose: 'Hypertrophy' },
    { percent: 65, weight: Math.round(oneRM * 0.65), reps: 12, purpose: 'Endurance' },
    { percent: 60, weight: Math.round(oneRM * 0.60), reps: 15, purpose: 'Endurance' },
    { percent: 50, weight: Math.round(oneRM * 0.50), reps: 20, purpose: 'Warmup / Light' },
  ];
}

// ============================================================================
// PROGRESSIVE OVERLOAD TRACKING
// ============================================================================

interface ExerciseHistoryEntry {
  name: string;
  reps: number;
  sets: number;
  weight: number;
  targetReps: number;
  rpe?: number;
}

interface OverloadSuggestion {
  type: string;
  message: string;
  newWeight?: number;
  confidence: string;
}

interface OverloadOpportunity {
  exercise: string;
  suggestions: OverloadSuggestion[];
  lastPerformance: ExerciseHistoryEntry;
}

/**
 * Detect progressive overload opportunities
 */
function detectOverloadOpportunity(exerciseHistory: ExerciseHistoryEntry[]): OverloadOpportunity | null {
  if (!exerciseHistory || exerciseHistory.length < 2) return null;

  const recent: ExerciseHistoryEntry[] = exerciseHistory.slice(-5);
  const latest: ExerciseHistoryEntry = recent[recent.length - 1];
  const previous: ExerciseHistoryEntry = recent[recent.length - 2];

  if (!latest || !previous) return null;

  const suggestions: OverloadSuggestion[] = [];

  // Weight progression
  if (latest.reps >= latest.targetReps && latest.rpe && latest.rpe < 8) {
    const increment: number = latest.weight > 100 ? 5 : 2.5;
    suggestions.push({
      type: 'weight',
      message: `Increase weight by ${increment} lbs`,
      newWeight: latest.weight + increment,
      confidence: 'high',
    });
  }

  // Volume progression (add reps)
  if (latest.sets >= previous.sets && latest.reps < latest.targetReps + 2) {
    suggestions.push({
      type: 'reps',
      message: `Try ${latest.reps + 1}-${latest.reps + 2} reps at ${latest.weight} lbs`,
      confidence: 'medium',
    });
  }

  // Set progression
  if (latest.sets < 5 && latest.reps >= latest.targetReps) {
    suggestions.push({
      type: 'sets',
      message: `Add 1 more set at ${latest.weight} lbs`,
      confidence: 'medium',
    });
  }

  return { exercise: latest.name, suggestions, lastPerformance: latest };
}

// ============================================================================
// VOLUME ANALYSIS
// ============================================================================

interface MuscleVolume {
  sets: number;
  totalReps: number;
  totalVolume: number;
  exercises: number;
}

interface VolumeRange {
  min: number;
  optimal: number;
  max: number;
}

interface VolumeRecommendation {
  muscle: string;
  type: string;
  message: string;
  priority: string;
}

interface WeeklyVolumeResult {
  byMuscle: Record<string, MuscleVolume>;
  recommendations: VolumeRecommendation[];
  totalSets: number;
}

interface WorkoutLogEntry {
  exercises?: Array<{
    muscle_group?: string;
    muscleGroup?: string;
    sets?: number;
    reps?: number;
    weight?: number;
  }>;
}

/**
 * Calculate weekly training volume per muscle group
 */
function calculateWeeklyVolume(workoutLogs: WorkoutLogEntry[]): WeeklyVolumeResult {
  const volumeByMuscle: Record<string, MuscleVolume> = {};
  const MUSCLE_SETS_MAP: Record<string, VolumeRange> = {
    chest: { min: 10, optimal: 15, max: 22 },
    back: { min: 10, optimal: 17, max: 23 },
    shoulders: { min: 8, optimal: 14, max: 20 },
    biceps: { min: 6, optimal: 10, max: 16 },
    triceps: { min: 6, optimal: 10, max: 16 },
    quadriceps: { min: 10, optimal: 15, max: 22 },
    hamstrings: { min: 8, optimal: 12, max: 18 },
    glutes: { min: 8, optimal: 14, max: 20 },
    calves: { min: 8, optimal: 12, max: 16 },
    abs: { min: 6, optimal: 10, max: 16 },
  };

  if (!workoutLogs) return { byMuscle: volumeByMuscle, recommendations: [], totalSets: 0 };

  workoutLogs.forEach((log: WorkoutLogEntry) => {
    if (!log.exercises) return;
    log.exercises.forEach((ex) => {
      const muscle: string = (ex.muscle_group || ex.muscleGroup || 'other').toLowerCase();
      if (!volumeByMuscle[muscle]) volumeByMuscle[muscle] = { sets: 0, totalReps: 0, totalVolume: 0, exercises: 0 };
      volumeByMuscle[muscle].sets += ex.sets || 0;
      volumeByMuscle[muscle].totalReps += (ex.sets || 0) * (ex.reps || 0);
      volumeByMuscle[muscle].totalVolume += (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0);
      volumeByMuscle[muscle].exercises += 1;
    });
  });

  const recommendations: VolumeRecommendation[] = [];
  for (const [muscle, volume] of Object.entries(volumeByMuscle)) {
    const range: VolumeRange | undefined = MUSCLE_SETS_MAP[muscle];
    if (!range) continue;
    if (volume.sets < range.min) {
      recommendations.push({ muscle, type: 'under', message: `${muscle}: ${volume.sets} sets (min ${range.min}). Consider adding ${range.min - volume.sets} more sets.`, priority: 'high' });
    } else if (volume.sets > range.max) {
      recommendations.push({ muscle, type: 'over', message: `${muscle}: ${volume.sets} sets (max ${range.max}). Consider reducing to prevent overtraining.`, priority: 'medium' });
    }
  }

  const totalSets: number = Object.values(volumeByMuscle).reduce((s: number, v: MuscleVolume) => s + v.sets, 0);
  return { byMuscle: volumeByMuscle, recommendations, totalSets };
}

// ============================================================================
// MUSCLE GROUP HEATMAP
// ============================================================================

const MUSCLE_GROUPS: string[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs',
  'forearms', 'traps', 'lats', 'obliques', 'hip_flexors',
];

interface MuscleHeatmapEntry {
  sets: number;
  intensity: number;
  lastWorked: string | null;
  daysRest: number | null;
  normalizedIntensity?: number;
}

interface HeatmapWorkoutLog {
  date?: string;
  created_at?: string;
  exercises?: Array<{
    muscle_group?: string;
    muscleGroup?: string;
    sets?: number;
    rpe?: number;
  }>;
}

/**
 * Generate muscle group heatmap data from workout history
 */
function generateMuscleHeatmap(workoutLogs: HeatmapWorkoutLog[], days: number = 7): Record<string, MuscleHeatmapEntry> {
  const heatmap: Record<string, MuscleHeatmapEntry> = {};
  MUSCLE_GROUPS.forEach((mg: string) => { heatmap[mg] = { sets: 0, intensity: 0, lastWorked: null, daysRest: null }; });

  if (!workoutLogs) return heatmap;

  const cutoff: Date = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  workoutLogs.forEach((log: HeatmapWorkoutLog) => {
    const logDate: Date = new Date(log.date || log.created_at || '');
    if (logDate < cutoff) return;

    (log.exercises || []).forEach((ex) => {
      const muscle: string = (ex.muscle_group || ex.muscleGroup || '').toLowerCase();
      if (!heatmap[muscle]) return;
      heatmap[muscle].sets += ex.sets || 0;
      heatmap[muscle].intensity = Math.max(heatmap[muscle].intensity, ex.rpe || 0);
      if (!heatmap[muscle].lastWorked || logDate > new Date(heatmap[muscle].lastWorked!)) {
        heatmap[muscle].lastWorked = logDate.toISOString();
      }
    });
  });

  // Calculate days since last worked
  const now: Date = new Date();
  for (const muscle of Object.keys(heatmap)) {
    if (heatmap[muscle].lastWorked) {
      heatmap[muscle].daysRest = Math.floor((now.getTime() - new Date(heatmap[muscle].lastWorked!).getTime()) / (1000 * 60 * 60 * 24));
    }
    // Normalize intensity to 0-1 scale
    heatmap[muscle].normalizedIntensity = Math.min(1, heatmap[muscle].sets / 15);
  }

  return heatmap;
}

// ============================================================================
// PERIODIZATION TEMPLATES
// ============================================================================

interface LinearWeek {
  week: number;
  sets: number;
  reps: string;
  intensity: number;
  focus: string;
}

interface UndulatingDay {
  day: string;
  sets: number;
  reps: string;
  intensity: number;
  focus: string;
}

interface BlockPhase {
  block: number;
  weeks: number;
  focus: string;
  description: string;
  reps: string;
  intensity: number;
}

interface PeriodizationTemplate {
  name: string;
  description: string;
  weeks?: LinearWeek[];
  days?: UndulatingDay[];
  blocks?: BlockPhase[];
}

const PERIODIZATION_TEMPLATES: Record<string, PeriodizationTemplate> = {
  linear: {
    name: 'Linear Periodization',
    description: 'Gradually increase intensity while decreasing volume over 4 weeks',
    weeks: [
      { week: 1, sets: 4, reps: '12-15', intensity: 0.65, focus: 'Endurance Base' },
      { week: 2, sets: 4, reps: '10-12', intensity: 0.72, focus: 'Hypertrophy' },
      { week: 3, sets: 4, reps: '8-10', intensity: 0.78, focus: 'Strength-Hypertrophy' },
      { week: 4, sets: 3, reps: '4-6', intensity: 0.85, focus: 'Strength Peak' },
    ],
  },
  undulating: {
    name: 'Daily Undulating Periodization',
    description: 'Vary intensity and volume within each week for maximum adaptation',
    days: [
      { day: 'Monday', sets: 5, reps: '5', intensity: 0.85, focus: 'Strength' },
      { day: 'Wednesday', sets: 4, reps: '10-12', intensity: 0.72, focus: 'Hypertrophy' },
      { day: 'Friday', sets: 3, reps: '15-20', intensity: 0.60, focus: 'Endurance' },
    ],
  },
  block: {
    name: 'Block Periodization',
    description: 'Focus on one quality per mesocycle for elite-level programming',
    blocks: [
      { block: 1, weeks: 3, focus: 'Accumulation', description: 'High volume, moderate intensity', reps: '10-15', intensity: 0.65 },
      { block: 2, weeks: 3, focus: 'Transmutation', description: 'Moderate volume, high intensity', reps: '6-8', intensity: 0.78 },
      { block: 3, weeks: 2, focus: 'Realization', description: 'Low volume, peak intensity', reps: '1-3', intensity: 0.90 },
      { block: 4, weeks: 1, focus: 'Deload', description: 'Recovery and adaptation', reps: '8-10', intensity: 0.55 },
    ],
  },
};

// ============================================================================
// WORKOUT SCORING
// ============================================================================

interface WorkoutScoreBreakdown {
  duration?: number;
  volume?: number;
  intensity?: number;
  variety?: number;
  completion?: number;
}

interface WorkoutScoreResult {
  score: number;
  breakdown: WorkoutScoreBreakdown;
  grade?: string;
}

interface WorkoutData {
  duration?: number;
  exercises?: Array<{
    sets?: number;
    rpe?: number;
    muscle_group?: string;
    muscleGroup?: string;
  }>;
  plannedExercises?: number;
}

/**
 * Score a workout session (0-100)
 */
function scoreWorkout(workout: WorkoutData): WorkoutScoreResult {
  if (!workout) return { score: 0, breakdown: {} };

  let score: number = 0;
  const breakdown: WorkoutScoreBreakdown = {};

  // Duration (0-20)
  const duration: number = workout.duration || 0;
  breakdown.duration = duration >= 45 ? 20 : duration >= 30 ? 15 : duration >= 15 ? 10 : 5;
  score += breakdown.duration;

  // Volume (0-25) - total sets
  const totalSets: number = (workout.exercises || []).reduce((s: number, e) => s + (e.sets || 0), 0);
  breakdown.volume = Math.min(25, totalSets * 2);
  score += breakdown.volume;

  // Intensity (0-25) - average RPE
  const rpes: number[] = (workout.exercises || []).map((e) => e.rpe).filter(Boolean) as number[];
  const avgRPE: number = rpes.length > 0 ? rpes.reduce((s: number, r: number) => s + r, 0) / rpes.length : 5;
  breakdown.intensity = Math.min(25, Math.round(avgRPE * 2.5));
  score += breakdown.intensity;

  // Exercise variety (0-15)
  const uniqueMuscles: Set<string> = new Set((workout.exercises || []).map((e) => e.muscle_group || e.muscleGroup).filter(Boolean) as string[]);
  breakdown.variety = Math.min(15, uniqueMuscles.size * 3);
  score += breakdown.variety;

  // Completion (0-15)
  const planned: number = workout.plannedExercises || (workout.exercises || []).length;
  const completed: number = (workout.exercises || []).length;
  breakdown.completion = planned > 0 ? Math.round((completed / planned) * 15) : 15;
  score += breakdown.completion;

  return { score: Math.min(100, score), breakdown, grade: score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D' };
}

// ============================================================================
// SUPERSET & TRI-SET SUPPORT
// ============================================================================

export interface SupersetGroup {
  id: string;
  type: 'superset' | 'triset' | 'giant_set';
  exercises: string[]; // exercise IDs in this group
  restBetweenExercises: number; // seconds (typically 0-15 for supersets)
  restAfterGroup: number; // seconds (typically 60-90)
  rounds: number; // how many times to cycle through
}

export function createSuperset(exerciseA: string, exerciseB: string, rounds: number = 3): SupersetGroup {
  return {
    id: `ss-${Date.now()}`,
    type: 'superset',
    exercises: [exerciseA, exerciseB],
    restBetweenExercises: 0,
    restAfterGroup: 90,
    rounds,
  };
}

export function createTriset(exerciseA: string, exerciseB: string, exerciseC: string, rounds: number = 3): SupersetGroup {
  return {
    id: `ts-${Date.now()}`,
    type: 'triset',
    exercises: [exerciseA, exerciseB, exerciseC],
    restBetweenExercises: 0,
    restAfterGroup: 120,
    rounds,
  };
}

// Common antagonist pairings for smart superset suggestions
export const ANTAGONIST_PAIRS: [string, string][] = [
  ['bench-press', 'barbell-row'],
  ['overhead-press', 'pull-ups'],
  ['bicep-curl', 'tricep-pushdown'],
  ['leg-extension', 'leg-curl'],
  ['chest-fly', 'reverse-fly'],
  ['lat-pulldown', 'dumbbell-shoulder-press'],
  ['hammer-curl', 'skull-crushers'],
  ['incline-bench-press', 'seated-row'],
];

export function suggestSupersets(exercises: string[]): SupersetGroup[] {
  const groups: SupersetGroup[] = [];
  const used = new Set<string>();

  for (const [a, b] of ANTAGONIST_PAIRS) {
    if (exercises.includes(a) && exercises.includes(b) && !used.has(a) && !used.has(b)) {
      groups.push(createSuperset(a, b));
      used.add(a);
      used.add(b);
    }
  }

  return groups;
}

// ============================================================================
// REST TIMER INTELLIGENCE
// ============================================================================

/**
 * Get recommended rest time based on exercise type and goals
 */
function getRecommendedRest(exerciseType: string, goal: string, rpe: number = 7): number {
  const restMap: Record<string, Record<string, number>> = {
    compound: { strength: 180, hypertrophy: 90, endurance: 45 },
    isolation: { strength: 120, hypertrophy: 60, endurance: 30 },
    cardio: { strength: 60, hypertrophy: 45, endurance: 20 },
  };

  const type: string = exerciseType || 'compound';
  const baseRest: number = restMap[type]?.[goal] || 90;

  // Adjust for RPE
  const rpeMultiplier: number = rpe >= 9 ? 1.3 : rpe >= 7 ? 1.0 : 0.8;
  return Math.round(baseRest * rpeMultiplier);
}

export {
  calculate1RM,
  calculateWorkingWeight,
  generateTrainingLoads,
  detectOverloadOpportunity,
  calculateWeeklyVolume,
  generateMuscleHeatmap,
  PERIODIZATION_TEMPLATES,
  MUSCLE_GROUPS,
  scoreWorkout,
  getRecommendedRest,
};
