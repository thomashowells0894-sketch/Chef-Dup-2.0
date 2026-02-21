/**
 * FuelIQ Wellness & Recovery Engine
 * Sleep scoring, recovery readiness, stress management,
 * meditation tracking, and holistic wellness scoring.
 */

// ============================================================================
// SLEEP SCORING
// ============================================================================

interface SleepData {
  duration?: number;
  bedtime?: string;
  wakeTime?: string;
  awakenings?: number;
  deepSleepPercent?: number;
  remSleepPercent?: number;
}

interface SleepScoreBreakdown {
  duration?: number;
  consistency?: number;
  stages?: number;
  disturbances?: number;
}

interface SleepScoreResult {
  score: number;
  breakdown: SleepScoreBreakdown;
  grade?: string;
  recommendations: string[];
}

/**
 * Calculate sleep quality score (0-100)
 */
function calculateSleepScore(sleepData: SleepData | null): SleepScoreResult {
  if (!sleepData) return { score: 0, breakdown: {}, recommendations: [] };

  const { duration = 0, bedtime, wakeTime, awakenings = 0, deepSleepPercent = 0, remSleepPercent = 0 } = sleepData;

  let score: number = 0;
  const breakdown: SleepScoreBreakdown = {};
  const recommendations: string[] = [];

  // Duration (0-35 points)
  const durationHours: number = duration / 60;
  if (durationHours >= 7 && durationHours <= 9) breakdown.duration = 35;
  else if (durationHours >= 6) breakdown.duration = 25;
  else if (durationHours >= 5) breakdown.duration = 15;
  else { breakdown.duration = 5; recommendations.push('Aim for 7-9 hours of sleep'); }
  score += breakdown.duration;

  // Consistency - bedtime (0-20 points)
  if (bedtime) {
    const bedHour: number = new Date(bedtime).getHours();
    if (bedHour >= 21 && bedHour <= 23) breakdown.consistency = 20;
    else if (bedHour >= 22 || bedHour <= 0) breakdown.consistency = 15;
    else { breakdown.consistency = 5; recommendations.push('Try to go to bed between 9-11 PM'); }
  } else {
    breakdown.consistency = 10;
  }
  score += breakdown.consistency;

  // Sleep stages (0-25 points)
  const stageScore: number = Math.min(15, (deepSleepPercent / 20) * 15) + Math.min(10, (remSleepPercent / 25) * 10);
  breakdown.stages = Math.round(stageScore);
  score += breakdown.stages;

  // Disturbances (0-20 points)
  if (awakenings === 0) breakdown.disturbances = 20;
  else if (awakenings <= 1) breakdown.disturbances = 15;
  else if (awakenings <= 3) breakdown.disturbances = 10;
  else { breakdown.disturbances = 5; recommendations.push('Reduce disruptions: darken room, avoid screens before bed'); }
  score += breakdown.disturbances;

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    breakdown,
    grade: score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Poor' : 'Very Poor',
    recommendations,
  };
}

// ============================================================================
// RECOVERY READINESS
// ============================================================================

interface RecoveryData {
  sleepScore?: number;
  restingHR?: number | null;
  hrv?: number | null;
  musclesSoreness?: number;
  stressLevel?: number;
  lastWorkoutHoursAgo?: number;
  mood?: number;
}

interface RecoveryScoreResult {
  score: number;
  status: string;
  recommendation: string;
  color?: string;
  trainingIntensity?: string;
}

/**
 * Calculate recovery readiness score (0-100)
 * Determines if user is ready for intense training
 */
function calculateRecoveryScore(data: RecoveryData | null): RecoveryScoreResult {
  if (!data) return { score: 50, status: 'unknown', recommendation: 'Log more data for accurate recovery assessment' };

  const { sleepScore = 50, restingHR = null, hrv = null, musclesSoreness = 0, stressLevel = 5, lastWorkoutHoursAgo = 24, mood = 5 } = data;

  let score: number = 0;

  // Sleep quality (0-30)
  score += (sleepScore / 100) * 30;

  // HRV if available (0-15)
  if (hrv !== null) {
    const hrvNormalized: number = Math.min(1, hrv / 80);
    score += hrvNormalized * 15;
  } else {
    score += 7.5; // Default mid-range
  }

  // Rest since last workout (0-15)
  const restScore: number = lastWorkoutHoursAgo >= 48 ? 15 : lastWorkoutHoursAgo >= 24 ? 12 : lastWorkoutHoursAgo >= 12 ? 8 : 4;
  score += restScore;

  // Muscle soreness (0-15, inverted)
  score += Math.max(0, 15 - (musclesSoreness * 1.5));

  // Stress level (0-15, inverted)
  score += Math.max(0, 15 - (stressLevel * 1.5));

  // Mood (0-10)
  score += (mood / 10) * 10;

  score = Math.min(100, Math.max(0, Math.round(score)));

  let status: string;
  let recommendation: string;
  if (score >= 80) { status = 'fully_recovered'; recommendation = 'Great recovery! Go all out today with high intensity training.'; }
  else if (score >= 60) { status = 'mostly_recovered'; recommendation = 'Good recovery. Moderate intensity training is ideal today.'; }
  else if (score >= 40) { status = 'partially_recovered'; recommendation = 'Still recovering. Light training, mobility work, or active recovery recommended.'; }
  else { status = 'needs_rest'; recommendation = 'Recovery is low. Focus on rest, sleep, and gentle movement today.'; }

  return {
    score,
    status,
    recommendation,
    color: score >= 80 ? '#00E676' : score >= 60 ? '#00D4FF' : score >= 40 ? '#FFB300' : '#FF5252',
    trainingIntensity: score >= 80 ? 'high' : score >= 60 ? 'moderate' : score >= 40 ? 'light' : 'rest',
  };
}

// ============================================================================
// STRESS MANAGEMENT
// ============================================================================

interface StressData {
  restingHR?: number | null;
  sleepQuality?: number;
  workoutIntensity?: number;
  selfReported?: number;
  screenTime?: number;
  caffeine?: number;
}

interface StressIndexResult {
  level: number;
  category: string;
  suggestions: string[];
  color?: string;
}

/**
 * Calculate stress index from biometric and self-reported data
 */
function calculateStressIndex(data: StressData | null): StressIndexResult {
  if (!data) return { level: 5, category: 'moderate', suggestions: [] };

  const { restingHR = null, sleepQuality = 5, workoutIntensity = 5, selfReported = 5, screenTime = 0, caffeine = 0 } = data;

  let stressPoints: number = 0;

  // Self-reported (0-30)
  stressPoints += (selfReported / 10) * 30;

  // Sleep quality (inverted, 0-25)
  stressPoints += ((10 - sleepQuality) / 10) * 25;

  // Resting HR deviation (0-15)
  if (restingHR !== null) {
    const deviation: number = Math.max(0, restingHR - 65); // Above 65 indicates stress
    stressPoints += Math.min(15, deviation * 0.75);
  }

  // Screen time (0-15)
  stressPoints += Math.min(15, (screenTime / 8) * 15);

  // Caffeine (0-15)
  stressPoints += Math.min(15, (caffeine / 400) * 15);

  const level: number = Math.min(10, Math.max(1, Math.round(stressPoints / 10)));
  const category: string = level <= 3 ? 'low' : level <= 6 ? 'moderate' : level <= 8 ? 'high' : 'critical';

  const suggestions: string[] = [];
  if (level >= 7) suggestions.push('Take 5 minutes for deep breathing (4-7-8 technique)');
  if (level >= 5) suggestions.push('Go for a 15-minute walk outside');
  if (sleepQuality < 6) suggestions.push('Prioritize 8 hours of sleep tonight');
  if (screenTime > 4) suggestions.push('Take regular screen breaks (20-20-20 rule)');
  if (caffeine > 200) suggestions.push('Consider reducing caffeine after 2 PM');
  suggestions.push('Try a 5-minute guided meditation');

  return { level, category, suggestions: suggestions.slice(0, 4), color: level <= 3 ? '#00E676' : level <= 6 ? '#FFB300' : '#FF5252' };
}

// ============================================================================
// BREATHING EXERCISES
// ============================================================================

interface BreathingPattern {
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  powerBreaths?: number;
  retention?: number;
  inhale2?: number;
}

interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  pattern: BreathingPattern;
  duration: number;
  benefits: string[];
  difficulty: string;
}

const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: 'box_breathing',
    name: 'Box Breathing',
    description: 'Navy SEAL technique for calm focus',
    pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
    duration: 4, // minutes
    benefits: ['Reduces stress', 'Improves focus', 'Lowers heart rate'],
    difficulty: 'beginner',
  },
  {
    id: '478_breathing',
    name: '4-7-8 Breathing',
    description: 'Dr. Andrew Weil\'s relaxation technique',
    pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
    duration: 5,
    benefits: ['Promotes sleep', 'Reduces anxiety', 'Calms nervous system'],
    difficulty: 'beginner',
  },
  {
    id: 'wim_hof',
    name: 'Wim Hof Method',
    description: 'Power breathing for energy and resilience',
    pattern: { inhale: 2, hold1: 0, exhale: 2, hold2: 0, powerBreaths: 30, retention: 90 },
    duration: 10,
    benefits: ['Boosts energy', 'Strengthens immune system', 'Increases cold tolerance'],
    difficulty: 'advanced',
  },
  {
    id: 'physiological_sigh',
    name: 'Physiological Sigh',
    description: 'Fastest way to calm down (Stanford research)',
    pattern: { inhale: 2, inhale2: 1, exhale: 6, hold2: 0, hold1: 0 },
    duration: 2,
    benefits: ['Instant calm', 'Reduces CO2', 'Works in 1-3 breaths'],
    difficulty: 'beginner',
  },
  {
    id: 'alternate_nostril',
    name: 'Alternate Nostril Breathing',
    description: 'Ancient yogic technique for balance',
    pattern: { inhale: 4, hold1: 2, exhale: 4, hold2: 2 },
    duration: 5,
    benefits: ['Balances nervous system', 'Improves focus', 'Reduces anxiety'],
    difficulty: 'intermediate',
  },
];

// ============================================================================
// GUIDED MEDITATION LIBRARY
// ============================================================================

interface MeditationEntry {
  id: string;
  name: string;
  duration: number;
  category: string;
  description: string;
  difficulty: string;
}

const MEDITATION_LIBRARY: MeditationEntry[] = [
  { id: 'body_scan', name: 'Body Scan', duration: 10, category: 'relaxation', description: 'Progressive muscle relaxation from head to toe', difficulty: 'beginner' },
  { id: 'gratitude', name: 'Gratitude Meditation', duration: 5, category: 'mindfulness', description: 'Reflect on things you\'re grateful for', difficulty: 'beginner' },
  { id: 'loving_kindness', name: 'Loving Kindness', duration: 10, category: 'compassion', description: 'Send love and kindness to yourself and others', difficulty: 'beginner' },
  { id: 'focus', name: 'Focus Training', duration: 15, category: 'concentration', description: 'Sharpen your concentration and mental clarity', difficulty: 'intermediate' },
  { id: 'pre_workout', name: 'Pre-Workout Visualization', duration: 5, category: 'performance', description: 'Visualize crushing your upcoming workout', difficulty: 'beginner' },
  { id: 'post_workout', name: 'Post-Workout Recovery', duration: 8, category: 'recovery', description: 'Deep relaxation for optimal recovery', difficulty: 'beginner' },
  { id: 'sleep', name: 'Sleep Meditation', duration: 20, category: 'sleep', description: 'Gentle guidance into deep, restful sleep', difficulty: 'beginner' },
  { id: 'stress_relief', name: 'Stress Release', duration: 10, category: 'stress', description: 'Let go of tension and find inner peace', difficulty: 'beginner' },
  { id: 'morning_energy', name: 'Morning Energy', duration: 7, category: 'energy', description: 'Start your day with intention and energy', difficulty: 'beginner' },
  { id: 'mindful_eating', name: 'Mindful Eating', duration: 5, category: 'nutrition', description: 'Practice presence and awareness while eating', difficulty: 'beginner' },
];

// ============================================================================
// JOURNALING PROMPTS
// ============================================================================

interface JournalPrompt {
  question: string;
  category: string;
}

function getDailyJournalPrompt(): JournalPrompt {
  const prompts: JournalPrompt[] = [
    { question: 'What are 3 things you\'re grateful for today?', category: 'gratitude' },
    { question: 'What is one thing you can do today to move closer to your goals?', category: 'goals' },
    { question: 'How does your body feel right now? Any areas of tension?', category: 'body_awareness' },
    { question: 'What food choice today will make you proud tonight?', category: 'nutrition' },
    { question: 'What workout are you looking forward to this week?', category: 'fitness' },
    { question: 'Who supported you this week? How can you support someone else?', category: 'social' },
    { question: 'Rate your energy 1-10. What would improve it?', category: 'energy' },
    { question: 'What habit are you building? What\'s your streak?', category: 'habits' },
    { question: 'What did you learn about your body this week?', category: 'self_discovery' },
    { question: 'Describe your ideal day. What small step can you take today?', category: 'visualization' },
  ];
  const dayOfYear: number = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return prompts[dayOfYear % prompts.length];
}

// ============================================================================
// HOLISTIC WELLNESS SCORE
// ============================================================================

interface WellnessData {
  nutritionScore?: number;
  fitnessScore?: number;
  sleepScore?: number;
  recoveryScore?: number;
  stressLevel?: number;
  hydrationPercent?: number;
  moodScore?: number;
  streakDays?: number;
}

interface WellnessDimension {
  score: number;
  weight: number;
  label: string;
}

interface WellnessScoreResult {
  score: number;
  dimensions: Record<string, WellnessDimension>;
  level: string;
  color: string;
}

/**
 * Calculate comprehensive wellness score combining all dimensions
 */
function calculateWellnessScore(data: WellnessData | null): WellnessScoreResult {
  const { nutritionScore = 50, fitnessScore = 50, sleepScore = 50, recoveryScore = 50, stressLevel = 5, hydrationPercent = 50, moodScore = 5, streakDays = 0 } = data || {};

  const dimensions: Record<string, WellnessDimension> = {
    nutrition: { score: nutritionScore, weight: 0.20, label: 'Nutrition' },
    fitness: { score: fitnessScore, weight: 0.20, label: 'Fitness' },
    sleep: { score: sleepScore, weight: 0.15, label: 'Sleep' },
    recovery: { score: recoveryScore, weight: 0.15, label: 'Recovery' },
    stress: { score: Math.max(0, 100 - stressLevel * 10), weight: 0.10, label: 'Stress Management' },
    hydration: { score: hydrationPercent, weight: 0.10, label: 'Hydration' },
    mood: { score: moodScore * 10, weight: 0.05, label: 'Mood' },
    consistency: { score: Math.min(100, streakDays * 5), weight: 0.05, label: 'Consistency' },
  };

  const totalScore: number = Object.values(dimensions).reduce((sum: number, dim: WellnessDimension) => sum + dim.score * dim.weight, 0);

  return {
    score: Math.round(totalScore),
    dimensions,
    level: totalScore >= 85 ? 'Thriving' : totalScore >= 70 ? 'Flourishing' : totalScore >= 55 ? 'Growing' : totalScore >= 40 ? 'Developing' : 'Starting',
    color: totalScore >= 85 ? '#00E676' : totalScore >= 70 ? '#00D4FF' : totalScore >= 55 ? '#FFB300' : '#FF6B35',
  };
}

export {
  calculateSleepScore,
  calculateRecoveryScore,
  calculateStressIndex,
  BREATHING_EXERCISES,
  MEDITATION_LIBRARY,
  getDailyJournalPrompt,
  calculateWellnessScore,
};
