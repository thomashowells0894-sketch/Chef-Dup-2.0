/**
 * VibeFit Elite AI Coaching System
 * Personalized training periodization, injury prevention, deload recommendations,
 * plateau-breaking strategies, and long-term programming intelligence.
 */

// ============================================================================
// TYPES
// ============================================================================

interface UserData {
  goal?: string;
  level?: number;
  daysPerWeek?: number;
  weeksDuration?: number;
  equipment?: string[];
  injuries?: string;
}

interface TrainingPhase {
  name: string;
  weeks: [number, number];
  duration: number;
  focus: string;
  intensity: string;
  volume: string;
  restPeriods: string;
  rpe: string;
  tips: string[];
}

interface SplitDay {
  day: string;
  focus: string;
  muscles: string[];
}

interface PeriodizedPlan {
  goal: string;
  level: number;
  daysPerWeek: number;
  weeksDuration: number;
  phases: TrainingPhase[];
  weeklySplit: SplitDay[];
  estimatedCaloriesBurnedPerWeek: number;
}

interface TrainingData {
  weeksSinceDeload?: number;
  sleepQuality?: number;
  performanceTrend?: string;
  mood?: number;
  soreness?: number;
  motivation?: number;
}

interface DeloadResult {
  shouldDeload: boolean;
  urgency: 'high' | 'moderate' | 'low';
  score: number;
  reasons: string[];
  recommendation: string;
}

interface InjuryArea {
  riskFactors: string[];
  preventiveExercises: string[];
  warmUpFocus: string;
  exercises_to_modify: string[];
}

interface InjuryPreventionPlan {
  areas: string[];
  plans: Record<string, InjuryArea>;
  generalTips: string[];
}

interface PlateauStrategy {
  name: string;
  description: string;
  implementation: string;
}

interface SupplementEntry {
  name: string;
  category: string;
  evidenceLevel: string;
  dosage: string;
  timing: string;
  benefits: string[];
  sideEffects: string[];
  interactions: string[];
  costEffectiveness: string;
  goalRelevance: Record<string, number>;
}

interface SupplementWithRelevance extends SupplementEntry {
  relevance: number;
}

// ============================================================================
// TRAINING PERIODIZATION
// ============================================================================

/**
 * Generate a periodized training plan based on user goals and history
 */
function generatePeriodizedPlan(userData: UserData): PeriodizedPlan {
  const {
    goal = 'hypertrophy',
    level = 3,
    daysPerWeek = 4,
    weeksDuration = 12,
    equipment = [],
    injuries = '',
  } = userData;

  const phases: TrainingPhase[] = [];
  let currentWeek: number = 1;

  if (weeksDuration >= 12) {
    // Phase 1: Anatomical Adaptation (2-3 weeks)
    phases.push({
      name: 'Anatomical Adaptation',
      weeks: [currentWeek, currentWeek + 2],
      duration: 3,
      focus: 'Build movement quality, connective tissue strength, and work capacity',
      intensity: '55-65% 1RM',
      volume: 'Moderate (3 sets x 12-15 reps)',
      restPeriods: '60-90 seconds',
      rpe: '5-6',
      tips: [
        'Focus on perfect form over weight',
        'Build mind-muscle connection',
        'Gradually increase training volume',
      ],
    });
    currentWeek += 3;

    // Phase 2: Hypertrophy (4 weeks)
    phases.push({
      name: 'Hypertrophy',
      weeks: [currentWeek, currentWeek + 3],
      duration: 4,
      focus: 'Maximize muscle growth through progressive overload and metabolic stress',
      intensity: '65-75% 1RM',
      volume: 'High (4 sets x 8-12 reps)',
      restPeriods: '60-120 seconds',
      rpe: '7-8',
      tips: [
        'Aim to add weight or reps each session',
        'Use controlled eccentrics (3-4 seconds)',
        'Include both compound and isolation work',
      ],
    });
    currentWeek += 4;

    // Deload week
    phases.push({
      name: 'Deload',
      weeks: [currentWeek, currentWeek],
      duration: 1,
      focus: 'Active recovery to allow supercompensation',
      intensity: '50-60% 1RM',
      volume: 'Low (2 sets x 10 reps)',
      restPeriods: 'As needed',
      rpe: '4-5',
      tips: [
        'Reduce volume by 40-50%',
        'Maintain movement patterns but reduce load',
        'Focus on mobility and flexibility',
        'Prioritize sleep and nutrition',
      ],
    });
    currentWeek += 1;

    // Phase 3: Strength (3 weeks)
    phases.push({
      name: 'Strength',
      weeks: [currentWeek, currentWeek + 2],
      duration: 3,
      focus: 'Build maximal strength through heavy compound movements',
      intensity: '80-90% 1RM',
      volume: 'Moderate (4-5 sets x 3-6 reps)',
      restPeriods: '2-4 minutes',
      rpe: '8-9',
      tips: [
        'Prioritize big compound lifts (squat, bench, deadlift, OHP)',
        'Full recovery between sets is critical',
        'Reduce isolation work to preserve recovery capacity',
      ],
    });
    currentWeek += 3;

    // Deload week
    phases.push({
      name: 'Deload',
      weeks: [currentWeek, currentWeek],
      duration: 1,
      focus: 'Recovery and peak preparation',
      intensity: '50-60% 1RM',
      volume: 'Very Low',
      restPeriods: 'As needed',
      rpe: '3-4',
      tips: ['Light movement only', 'Focus on sleep and stress reduction'],
    });
  } else {
    // Shorter plan - simplified periodization
    const halfPoint: number = Math.floor(weeksDuration / 2);
    phases.push({
      name: 'Foundation',
      weeks: [1, halfPoint],
      duration: halfPoint,
      focus: 'Build base fitness and movement quality',
      intensity: '60-75% 1RM',
      volume: 'Moderate-High',
      restPeriods: '60-120 seconds',
      rpe: '6-7',
      tips: ['Focus on consistency', 'Progressive overload weekly'],
    });
    phases.push({
      name: 'Intensification',
      weeks: [halfPoint + 1, weeksDuration],
      duration: weeksDuration - halfPoint,
      focus: 'Increase intensity and push performance',
      intensity: '75-85% 1RM',
      volume: 'Moderate',
      restPeriods: '90-180 seconds',
      rpe: '7-9',
      tips: ['Push harder on main lifts', 'Maintain form under fatigue'],
    });
  }

  // Generate weekly split based on days per week
  const split: SplitDay[] = generateWeeklySplit(daysPerWeek, goal);

  return {
    goal,
    level,
    daysPerWeek,
    weeksDuration,
    phases,
    weeklySplit: split,
    estimatedCaloriesBurnedPerWeek: estimateWeeklyCalories(daysPerWeek, goal, level),
  };
}

function generateWeeklySplit(days: number, goal: string): SplitDay[] {
  const splits: Record<number, SplitDay[]> = {
    2: [
      { day: 'Day 1', focus: 'Upper Body', muscles: ['chest', 'back', 'shoulders', 'arms'] },
      { day: 'Day 2', focus: 'Lower Body', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
    ],
    3: [
      { day: 'Day 1', focus: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
      { day: 'Day 2', focus: 'Pull', muscles: ['back', 'biceps', 'rear delts'] },
      { day: 'Day 3', focus: 'Legs', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
    ],
    4: [
      { day: 'Day 1', focus: 'Upper Push', muscles: ['chest', 'shoulders', 'triceps'] },
      { day: 'Day 2', focus: 'Lower Strength', muscles: ['quadriceps', 'hamstrings', 'glutes'] },
      { day: 'Day 3', focus: 'Upper Pull', muscles: ['back', 'biceps', 'rear delts'] },
      { day: 'Day 4', focus: 'Lower Hypertrophy', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
    ],
    5: [
      { day: 'Day 1', focus: 'Chest & Triceps', muscles: ['chest', 'triceps'] },
      { day: 'Day 2', focus: 'Back & Biceps', muscles: ['back', 'biceps'] },
      { day: 'Day 3', focus: 'Legs', muscles: ['quadriceps', 'hamstrings', 'glutes'] },
      { day: 'Day 4', focus: 'Shoulders & Arms', muscles: ['shoulders', 'biceps', 'triceps'] },
      { day: 'Day 5', focus: 'Full Body / Weak Points', muscles: ['all'] },
    ],
    6: [
      { day: 'Day 1', focus: 'Push (Heavy)', muscles: ['chest', 'shoulders', 'triceps'] },
      { day: 'Day 2', focus: 'Pull (Heavy)', muscles: ['back', 'biceps'] },
      { day: 'Day 3', focus: 'Legs (Heavy)', muscles: ['quadriceps', 'hamstrings', 'glutes'] },
      { day: 'Day 4', focus: 'Push (Volume)', muscles: ['chest', 'shoulders', 'triceps'] },
      { day: 'Day 5', focus: 'Pull (Volume)', muscles: ['back', 'biceps'] },
      { day: 'Day 6', focus: 'Legs (Volume)', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
    ],
  };
  return splits[days] || splits[4];
}

function estimateWeeklyCalories(days: number, goal: string, level: number): number {
  const basePerSession: Record<string, number> = {
    hypertrophy: 350,
    strength: 300,
    endurance: 450,
    hiit: 500,
    yoga: 200,
    flexibility: 150,
  };
  const levelMultiplier: number = 0.7 + (level * 0.1);
  return Math.round((basePerSession[goal] || 350) * days * levelMultiplier);
}

// ============================================================================
// DELOAD DETECTION
// ============================================================================

/**
 * Determine if user needs a deload week
 */
function shouldDeload(trainingData: TrainingData): DeloadResult {
  const { weeksSinceDeload = 0, sleepQuality = 7, performanceTrend = 'stable', mood = 7, soreness = 3, motivation = 7 } = trainingData;

  let deloadScore: number = 0;
  const reasons: string[] = [];

  // Time-based (0-30)
  if (weeksSinceDeload >= 6) { deloadScore += 30; reasons.push('6+ weeks without a deload'); }
  else if (weeksSinceDeload >= 4) { deloadScore += 15; reasons.push('4+ weeks of continuous training'); }

  // Performance (0-25)
  if (performanceTrend === 'declining') { deloadScore += 25; reasons.push('Performance is declining'); }
  else if (performanceTrend === 'stagnant') { deloadScore += 15; reasons.push('Performance has stagnated'); }

  // Recovery markers (0-25)
  if (sleepQuality < 5) { deloadScore += 15; reasons.push('Poor sleep quality'); }
  if (soreness > 7) { deloadScore += 10; reasons.push('High muscle soreness'); }

  // Mental state (0-20)
  if (mood < 5) { deloadScore += 10; reasons.push('Low mood/energy'); }
  if (motivation < 4) { deloadScore += 10; reasons.push('Low training motivation'); }

  const shouldDeloadNow: boolean = deloadScore >= 50;

  return {
    shouldDeload: shouldDeloadNow,
    urgency: deloadScore >= 70 ? 'high' : deloadScore >= 50 ? 'moderate' : 'low',
    score: deloadScore,
    reasons,
    recommendation: shouldDeloadNow
      ? 'Take a deload week: reduce volume 40-50%, keep intensity moderate, prioritize sleep and nutrition.'
      : `Continue training. Next suggested deload in ~${Math.max(1, 6 - weeksSinceDeload)} weeks.`,
  };
}

// ============================================================================
// INJURY PREVENTION
// ============================================================================

const COMMON_INJURY_AREAS: Record<string, InjuryArea> = {
  lower_back: {
    riskFactors: ['Poor hip mobility', 'Weak core', 'Excessive spinal flexion under load'],
    preventiveExercises: ['Bird dogs', 'Dead bugs', 'Pallof press', 'Hip hinges', 'McGill big 3'],
    warmUpFocus: 'Hip mobility and core activation',
    exercises_to_modify: ['Deadlifts', 'Squats', 'Bent-over rows'],
  },
  knees: {
    riskFactors: ['Weak VMO', 'Tight IT band', 'Poor ankle mobility', 'Valgus collapse'],
    preventiveExercises: ['Terminal knee extensions', 'Wall sits', 'Ankle mobility drills', 'Single-leg balance'],
    warmUpFocus: 'Quad activation and ankle mobility',
    exercises_to_modify: ['Deep squats', 'Lunges', 'Jump training'],
  },
  shoulders: {
    riskFactors: ['Poor scapular stability', 'Tight chest/lats', 'Excessive overhead pressing'],
    preventiveExercises: ['Band pull-aparts', 'Face pulls', 'External rotations', 'Scapular push-ups'],
    warmUpFocus: 'Rotator cuff activation and scapular mobility',
    exercises_to_modify: ['Overhead press', 'Bench press', 'Upright rows'],
  },
  wrists: {
    riskFactors: ['Poor wrist mobility', 'Excessive gripping', 'Improper front rack position'],
    preventiveExercises: ['Wrist circles', 'Prayer stretches', 'Wrist curls', 'Finger extensions'],
    warmUpFocus: 'Wrist mobilization',
    exercises_to_modify: ['Front squats', 'Clean & press', 'Push-ups'],
  },
  hips: {
    riskFactors: ['Prolonged sitting', 'Weak glutes', 'Tight hip flexors'],
    preventiveExercises: ['Hip 90/90 stretches', 'Clamshells', 'Glute bridges', 'Pigeon pose'],
    warmUpFocus: 'Hip opening and glute activation',
    exercises_to_modify: ['Squats', 'Deadlifts', 'Lunges'],
  },
};

function getInjuryPreventionPlan(injuryAreas: string[] = []): InjuryPreventionPlan {
  if (!injuryAreas || injuryAreas.length === 0) {
    return { areas: Object.keys(COMMON_INJURY_AREAS), plans: COMMON_INJURY_AREAS, generalTips: getGeneralInjuryPreventionTips() };
  }
  const plans: Record<string, InjuryArea> = {};
  for (const area of injuryAreas) {
    const key: string = area.toLowerCase().replace(/\s+/g, '_');
    if (COMMON_INJURY_AREAS[key]) plans[key] = COMMON_INJURY_AREAS[key];
  }
  return { areas: Object.keys(plans), plans, generalTips: getGeneralInjuryPreventionTips() };
}

function getGeneralInjuryPreventionTips(): string[] {
  return [
    'Always warm up for 5-10 minutes before training',
    'Progress weight by no more than 5-10% per week',
    'Include mobility work 3-4 times per week',
    'Prioritize sleep (7-9 hours) for tissue recovery',
    'Stay hydrated - dehydrated tissues are more injury-prone',
    'Listen to sharp pain - stop the exercise immediately',
    'Ensure 48-72 hours rest between training the same muscle group',
    'Use proper breathing technique (exhale on exertion)',
  ];
}

// ============================================================================
// PLATEAU-BREAKING STRATEGIES
// ============================================================================

function getPlateauBreakingStrategies(plateauType: string, currentProgram: Record<string, unknown> = {}): PlateauStrategy[] {
  const strategies: Record<string, PlateauStrategy[]> = {
    strength: [
      { name: 'Pause Reps', description: 'Add 2-3 second pause at the bottom of each rep to eliminate momentum and build starting strength', implementation: 'Use 80-85% of normal working weight with 2-3 second pause at sticking point' },
      { name: 'Cluster Sets', description: 'Break a heavy set into mini-sets with 15-20 second rests between', implementation: '5 x 1 with 15-20 seconds rest = 1 cluster set. Do 3-4 cluster sets.' },
      { name: 'Accommodating Resistance', description: 'Add bands or chains to change the strength curve', implementation: 'Add light bands to compound lifts for 2-3 weeks' },
      { name: 'Eccentric Overload', description: 'Use heavier than normal weight for the lowering phase', implementation: 'Use 110-120% 1RM for 3-5 second eccentrics with spotter' },
    ],
    hypertrophy: [
      { name: 'Drop Sets', description: 'Immediately reduce weight and continue for more reps', implementation: 'After final working set, drop weight 20-30% and go to failure. Repeat 2-3 times.' },
      { name: 'Mechanical Drop Sets', description: 'Switch to an easier variation instead of reducing weight', implementation: 'Incline press \u2192 Flat press \u2192 Decline press, same weight' },
      { name: 'Time Under Tension', description: 'Slow down the eccentric and pause at peak contraction', implementation: '4-0-2-1 tempo (4s down, 0 pause, 2s up, 1s squeeze)' },
      { name: 'Antagonist Supersets', description: 'Pair opposing muscle groups for greater neural drive', implementation: 'Bench press + Rows, Curls + Pushdowns' },
    ],
    weight_loss: [
      { name: 'Refeed Day', description: 'Increase carbs to maintenance for 1-2 days to reset leptin', implementation: 'Eat at maintenance calories with 60% carbs for 1 day per week' },
      { name: 'Reverse Diet', description: 'Gradually increase calories by 100/week to raise metabolic rate', implementation: 'Add 100 calories per week for 4-6 weeks, then resume deficit' },
      { name: 'NEAT Increase', description: 'Boost Non-Exercise Activity Thermogenesis', implementation: 'Add 2,000 daily steps, take stairs, stand more, fidget more' },
      { name: 'Diet Break', description: 'Eat at maintenance for 1-2 weeks to prevent metabolic adaptation', implementation: 'Full 2 weeks at calculated TDEE, then resume deficit' },
    ],
  };

  return strategies[plateauType] || strategies.hypertrophy;
}

// ============================================================================
// SUPPLEMENT INTELLIGENCE
// ============================================================================

const SUPPLEMENT_DATABASE: Record<string, SupplementEntry> = {
  creatine: {
    name: 'Creatine Monohydrate',
    category: 'performance',
    evidenceLevel: 'A+',
    dosage: '3-5g daily',
    timing: 'Any time (consistency matters more than timing)',
    benefits: ['Increased strength', 'More muscle mass', 'Better recovery', 'Cognitive benefits'],
    sideEffects: ['Water retention (1-3 lbs)', 'Possible stomach discomfort at high doses'],
    interactions: [],
    costEffectiveness: 'Excellent',
    goalRelevance: { strength: 10, hypertrophy: 10, endurance: 5, weight_loss: 3 },
  },
  protein_powder: {
    name: 'Whey Protein',
    category: 'nutrition',
    evidenceLevel: 'A+',
    dosage: '20-40g per serving, 1-2 times daily',
    timing: 'Post-workout or between meals',
    benefits: ['Convenient protein source', 'Fast absorption', 'Supports muscle recovery'],
    sideEffects: ['Possible digestive issues for lactose intolerant'],
    interactions: [],
    costEffectiveness: 'Good',
    goalRelevance: { strength: 8, hypertrophy: 9, endurance: 5, weight_loss: 8 },
  },
  caffeine: {
    name: 'Caffeine',
    category: 'performance',
    evidenceLevel: 'A',
    dosage: '3-6mg per kg bodyweight, 30-60 min pre-workout',
    timing: '30-60 minutes before training',
    benefits: ['Increased alertness', 'Better endurance', 'Enhanced fat oxidation', 'Reduced perceived effort'],
    sideEffects: ['Sleep disruption if taken late', 'Tolerance buildup', 'Anxiety at high doses'],
    interactions: ['Avoid with stimulant medications'],
    costEffectiveness: 'Excellent',
    goalRelevance: { strength: 7, hypertrophy: 6, endurance: 9, weight_loss: 8 },
  },
  vitamin_d: {
    name: 'Vitamin D3',
    category: 'health',
    evidenceLevel: 'A',
    dosage: '2000-5000 IU daily',
    timing: 'With a meal containing fat',
    benefits: ['Bone health', 'Immune function', 'Mood regulation', 'Testosterone support'],
    sideEffects: ['Toxicity at very high doses (>10,000 IU/day long-term)'],
    interactions: [],
    costEffectiveness: 'Excellent',
    goalRelevance: { strength: 5, hypertrophy: 5, endurance: 5, weight_loss: 4 },
  },
  omega3: {
    name: 'Fish Oil (Omega-3)',
    category: 'health',
    evidenceLevel: 'A',
    dosage: '2-3g EPA+DHA combined daily',
    timing: 'With meals',
    benefits: ['Reduced inflammation', 'Heart health', 'Joint support', 'Brain health'],
    sideEffects: ['Fishy taste', 'Possible GI discomfort'],
    interactions: ['Blood thinners'],
    costEffectiveness: 'Good',
    goalRelevance: { strength: 4, hypertrophy: 5, endurance: 6, weight_loss: 5 },
  },
  magnesium: {
    name: 'Magnesium (Glycinate)',
    category: 'health',
    evidenceLevel: 'A',
    dosage: '200-400mg before bed',
    timing: 'Evening/before bed',
    benefits: ['Better sleep', 'Muscle relaxation', 'Reduced cramps', 'Stress relief'],
    sideEffects: ['Loose stools at high doses'],
    interactions: [],
    costEffectiveness: 'Excellent',
    goalRelevance: { strength: 5, hypertrophy: 5, endurance: 5, weight_loss: 4 },
  },
  ashwagandha: {
    name: 'Ashwagandha (KSM-66)',
    category: 'recovery',
    evidenceLevel: 'B+',
    dosage: '300-600mg daily',
    timing: 'Morning or before bed',
    benefits: ['Reduced cortisol', 'Better sleep', 'Increased testosterone', 'Stress resilience'],
    sideEffects: ['Drowsiness', 'Thyroid hormone changes'],
    interactions: ['Thyroid medications', 'Sedatives'],
    costEffectiveness: 'Good',
    goalRelevance: { strength: 6, hypertrophy: 6, endurance: 4, weight_loss: 5 },
  },
};

function getRecommendedSupplements(goal: string, budget: string = 'moderate'): SupplementWithRelevance[] {
  const supplements: SupplementWithRelevance[] = Object.values(SUPPLEMENT_DATABASE)
    .map((s: SupplementEntry) => ({ ...s, relevance: s.goalRelevance[goal] || 0 }))
    .sort((a: SupplementWithRelevance, b: SupplementWithRelevance) => b.relevance - a.relevance);

  if (budget === 'minimal') return supplements.filter((s: SupplementWithRelevance) => s.costEffectiveness === 'Excellent').slice(0, 3);
  if (budget === 'moderate') return supplements.slice(0, 5);
  return supplements;
}

export {
  generatePeriodizedPlan,
  shouldDeload,
  getInjuryPreventionPlan,
  getGeneralInjuryPreventionTips,
  getPlateauBreakingStrategies,
  COMMON_INJURY_AREAS,
  SUPPLEMENT_DATABASE,
  getRecommendedSupplements,
};
