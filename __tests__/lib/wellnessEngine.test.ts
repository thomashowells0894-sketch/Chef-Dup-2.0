import {
  calculateSleepScore,
  calculateRecoveryScore,
  calculateStressIndex,
  calculateWellnessScore,
  BREATHING_EXERCISES,
  MEDITATION_LIBRARY,
  getDailyJournalPrompt,
} from '../../lib/wellnessEngine';

// =============================================================================
// calculateSleepScore
// =============================================================================

describe('calculateSleepScore', () => {
  it('returns zero score for null input', () => {
    const result = calculateSleepScore(null);
    expect(result.score).toBe(0);
    expect(result.recommendations).toEqual([]);
  });

  it('scores 7-9 hour duration as full duration points (35)', () => {
    const result = calculateSleepScore({ duration: 480 }); // 8 hours in minutes
    expect(result.breakdown.duration).toBe(35);
  });

  it('scores 6-hour duration as 25 points', () => {
    const result = calculateSleepScore({ duration: 360 }); // 6 hours
    expect(result.breakdown.duration).toBe(25);
  });

  it('scores 5-hour duration as 15 points', () => {
    const result = calculateSleepScore({ duration: 300 }); // 5 hours
    expect(result.breakdown.duration).toBe(15);
  });

  it('scores below 5 hours as 5 points with recommendation', () => {
    const result = calculateSleepScore({ duration: 240 }); // 4 hours
    expect(result.breakdown.duration).toBe(5);
    expect(result.recommendations).toContain('Aim for 7-9 hours of sleep');
  });

  it('scores bedtime between 9-11 PM as 20 consistency points', () => {
    const result = calculateSleepScore({
      duration: 480,
      bedtime: '2026-02-13T22:00:00.000Z', // 10 PM
    });
    expect(result.breakdown.consistency).toBe(20);
  });

  it('scores late bedtime (after 11 PM) as 15 points', () => {
    const result = calculateSleepScore({
      duration: 480,
      // midnight bedtime
      bedtime: '2026-02-14T00:00:00.000Z',
    });
    expect(result.breakdown.consistency).toBe(15);
  });

  it('gives default consistency of 10 when no bedtime', () => {
    const result = calculateSleepScore({ duration: 480 });
    expect(result.breakdown.consistency).toBe(10);
  });

  it('scores zero awakenings as 20 disturbance points', () => {
    const result = calculateSleepScore({ duration: 480, awakenings: 0 });
    expect(result.breakdown.disturbances).toBe(20);
  });

  it('scores 1 awakening as 15 disturbance points', () => {
    const result = calculateSleepScore({ duration: 480, awakenings: 1 });
    expect(result.breakdown.disturbances).toBe(15);
  });

  it('scores 2-3 awakenings as 10 disturbance points', () => {
    const result = calculateSleepScore({ duration: 480, awakenings: 2 });
    expect(result.breakdown.disturbances).toBe(10);
  });

  it('scores 4+ awakenings as 5 points with recommendation', () => {
    const result = calculateSleepScore({ duration: 480, awakenings: 5 });
    expect(result.breakdown.disturbances).toBe(5);
    expect(result.recommendations).toContain('Reduce disruptions: darken room, avoid screens before bed');
  });

  it('calculates sleep stages score from deep and REM percentages', () => {
    const result = calculateSleepScore({
      duration: 480,
      deepSleepPercent: 20,
      remSleepPercent: 25,
    });
    // deep: min(15, (20/20)*15) = 15, rem: min(10, (25/25)*10) = 10
    expect(result.breakdown.stages).toBe(25);
  });

  it('assigns grade "Excellent" for score >= 90', () => {
    const result = calculateSleepScore({
      duration: 480,
      bedtime: '2026-02-13T22:00:00.000Z',
      awakenings: 0,
      deepSleepPercent: 20,
      remSleepPercent: 25,
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe('Excellent');
  });

  it('assigns grade "Good" for score >= 75', () => {
    // duration: 480 (8h) = 35pts, bedtime 22:00 = 20pts, awakenings 1 = 15pts
    // stages: min(15, (15/20)*15) + min(10, (20/25)*10) = 11.25 + 8 = 19.25, rounded to 19
    // Total: 35+20+19+15 = 89 -> Excellent. Need less for "Good".
    // Target: 75-89 range
    // duration: 360 (6h) = 25pts, no bedtime = 10pts, awakenings 1 = 15pts
    // stages: min(15, (15/20)*15) + min(10, (15/25)*10) = 11.25+6=17.25 -> 17
    // Total: 25+10+17+15 = 67 -> Fair (< 75). Need to hit 75+.
    // duration: 480 (8h) = 35pts, no bedtime = 10pts, awakenings 0 = 20pts
    // stages: min(15, (10/20)*15) + min(10, (10/25)*10) = 7.5+4=11.5 -> 12
    // Total: 35+10+12+20 = 77 -> Good
    const result = calculateSleepScore({
      duration: 480,
      awakenings: 0,
      deepSleepPercent: 10,
      remSleepPercent: 10,
    });
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.score).toBeLessThan(90);
    expect(result.grade).toBe('Good');
  });

  it('clamps score between 0 and 100', () => {
    // Even with max everything, shouldn't exceed 100
    const result = calculateSleepScore({
      duration: 540,
      bedtime: '2026-02-13T21:30:00.000Z',
      awakenings: 0,
      deepSleepPercent: 30,
      remSleepPercent: 30,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// calculateRecoveryScore
// =============================================================================

describe('calculateRecoveryScore', () => {
  it('returns default score of 50 for null input', () => {
    const result = calculateRecoveryScore(null);
    expect(result.score).toBe(50);
    expect(result.status).toBe('unknown');
  });

  it('returns "fully_recovered" for score >= 80', () => {
    const result = calculateRecoveryScore({
      sleepScore: 90,
      hrv: 80,
      musclesSoreness: 0,
      stressLevel: 1,
      lastWorkoutHoursAgo: 48,
      mood: 9,
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.status).toBe('fully_recovered');
    expect(result.trainingIntensity).toBe('high');
    expect(result.color).toBe('#00E676');
  });

  it('returns "mostly_recovered" for score 60-79', () => {
    const result = calculateRecoveryScore({
      sleepScore: 70,
      hrv: 50,
      musclesSoreness: 3,
      stressLevel: 4,
      lastWorkoutHoursAgo: 24,
      mood: 6,
    });
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThan(80);
    expect(result.status).toBe('mostly_recovered');
    expect(result.trainingIntensity).toBe('moderate');
  });

  it('returns "partially_recovered" for score 40-59', () => {
    // sleep: (50/100)*30=15, hrv=null: 7.5, rest(12h): 8, soreness: max(0,15-5*1.5)=7.5, stress: max(0,15-6*1.5)=6, mood: (4/10)*10=4
    // Total: 15+7.5+8+7.5+6+4 = 48
    const result = calculateRecoveryScore({
      sleepScore: 50,
      musclesSoreness: 5,
      stressLevel: 6,
      lastWorkoutHoursAgo: 12,
      mood: 4,
    });
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(60);
    expect(result.status).toBe('partially_recovered');
  });

  it('returns "needs_rest" for score < 40', () => {
    const result = calculateRecoveryScore({
      sleepScore: 10,
      hrv: 10,
      musclesSoreness: 10,
      stressLevel: 10,
      lastWorkoutHoursAgo: 4,
      mood: 1,
    });
    expect(result.score).toBeLessThan(40);
    expect(result.status).toBe('needs_rest');
    expect(result.trainingIntensity).toBe('rest');
    expect(result.color).toBe('#FF5252');
  });

  it('uses default mid-range HRV when not provided', () => {
    const withHRV = calculateRecoveryScore({ hrv: null, sleepScore: 50 });
    // hrv=null should give 7.5 default
    expect(withHRV.score).toBeGreaterThan(0);
  });

  it('clamps score between 0 and 100', () => {
    const result = calculateRecoveryScore({
      sleepScore: 100,
      hrv: 100,
      musclesSoreness: 0,
      stressLevel: 0,
      lastWorkoutHoursAgo: 100,
      mood: 10,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// calculateStressIndex
// =============================================================================

describe('calculateStressIndex', () => {
  it('returns default moderate stress for null input', () => {
    const result = calculateStressIndex(null);
    expect(result.level).toBe(5);
    expect(result.category).toBe('moderate');
  });

  it('returns "low" for minimal stress indicators', () => {
    const result = calculateStressIndex({
      selfReported: 1,
      sleepQuality: 9,
      screenTime: 0,
      caffeine: 0,
    });
    expect(result.level).toBeLessThanOrEqual(3);
    expect(result.category).toBe('low');
    expect(result.color).toBe('#00E676');
  });

  it('returns "high" for significant stress indicators', () => {
    const result = calculateStressIndex({
      selfReported: 8,
      sleepQuality: 3,
      restingHR: 85,
      screenTime: 6,
      caffeine: 300,
    });
    expect(result.level).toBeGreaterThanOrEqual(7);
    expect(result.category).toBe('high');
    expect(result.color).toBe('#FF5252');
  });

  it('returns "critical" for extreme stress', () => {
    const result = calculateStressIndex({
      selfReported: 10,
      sleepQuality: 1,
      restingHR: 100,
      screenTime: 10,
      caffeine: 500,
    });
    expect(result.level).toBeGreaterThanOrEqual(9);
    expect(result.category).toBe('critical');
  });

  it('includes breathing suggestion for high stress', () => {
    const result = calculateStressIndex({
      selfReported: 9,
      sleepQuality: 1,
      restingHR: 90,
      screenTime: 8,
      caffeine: 400,
    });
    expect(result.level).toBeGreaterThanOrEqual(7);
    expect(result.suggestions.some(s => s.includes('deep breathing'))).toBe(true);
  });

  it('suggests reducing caffeine when intake is high', () => {
    const result = calculateStressIndex({
      selfReported: 7,
      sleepQuality: 3,
      caffeine: 400,
    });
    expect(result.suggestions.some(s => s.includes('caffeine'))).toBe(true);
  });

  it('limits suggestions to 4 entries', () => {
    const result = calculateStressIndex({
      selfReported: 10,
      sleepQuality: 1,
      screenTime: 10,
      caffeine: 500,
    });
    expect(result.suggestions.length).toBeLessThanOrEqual(4);
  });

  it('clamps level between 1 and 10', () => {
    const lowResult = calculateStressIndex({
      selfReported: 0,
      sleepQuality: 10,
      screenTime: 0,
      caffeine: 0,
    });
    expect(lowResult.level).toBeGreaterThanOrEqual(1);

    const highResult = calculateStressIndex({
      selfReported: 10,
      sleepQuality: 0,
      screenTime: 20,
      caffeine: 1000,
    });
    expect(highResult.level).toBeLessThanOrEqual(10);
  });
});

// =============================================================================
// calculateWellnessScore
// =============================================================================

describe('calculateWellnessScore', () => {
  it('returns default score for null input (all dimensions at 50)', () => {
    const result = calculateWellnessScore(null);
    expect(result.score).toBeGreaterThan(0);
    expect(result.level).toBeDefined();
    expect(result.color).toBeDefined();
  });

  it('calculates correct weights for all dimensions', () => {
    const result = calculateWellnessScore(null);
    const weights = Object.values(result.dimensions).map(d => d.weight);
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });

  it('assigns "Thriving" for score >= 85', () => {
    const result = calculateWellnessScore({
      nutritionScore: 95,
      fitnessScore: 90,
      sleepScore: 90,
      recoveryScore: 90,
      stressLevel: 1,
      hydrationPercent: 95,
      moodScore: 9,
      streakDays: 30,
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.level).toBe('Thriving');
    expect(result.color).toBe('#00E676');
  });

  it('assigns "Flourishing" for score 70-84', () => {
    const result = calculateWellnessScore({
      nutritionScore: 75,
      fitnessScore: 75,
      sleepScore: 75,
      recoveryScore: 75,
      stressLevel: 3,
      hydrationPercent: 75,
      moodScore: 7,
      streakDays: 10,
    });
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThan(85);
    expect(result.level).toBe('Flourishing');
    expect(result.color).toBe('#00D4FF');
  });

  it('assigns "Growing" for score 55-69', () => {
    // Calculate: 65*0.20 + 65*0.20 + 60*0.15 + 60*0.15 + (100-4*10)*0.10 + 60*0.10 + 6*10*0.05 + 8*5*0.05
    // = 13 + 13 + 9 + 9 + 6 + 6 + 3 + 2 = 61
    const result = calculateWellnessScore({
      nutritionScore: 65,
      fitnessScore: 65,
      sleepScore: 60,
      recoveryScore: 60,
      stressLevel: 4,
      hydrationPercent: 60,
      moodScore: 6,
      streakDays: 8,
    });
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.score).toBeLessThan(70);
    expect(result.level).toBe('Growing');
  });

  it('assigns "Developing" for score 40-54', () => {
    // Calculate: 45*0.20 + 45*0.20 + 40*0.15 + 40*0.15 + (100-6*10)*0.10 + 40*0.10 + 4*10*0.05 + 2*5*0.05
    // = 9 + 9 + 6 + 6 + 4 + 4 + 2 + 0.5 = 40.5
    const result = calculateWellnessScore({
      nutritionScore: 45,
      fitnessScore: 45,
      sleepScore: 40,
      recoveryScore: 40,
      stressLevel: 6,
      hydrationPercent: 40,
      moodScore: 4,
      streakDays: 2,
    });
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(55);
    expect(result.level).toBe('Developing');
  });

  it('assigns "Starting" for score < 40', () => {
    const result = calculateWellnessScore({
      nutritionScore: 10,
      fitnessScore: 10,
      sleepScore: 10,
      recoveryScore: 10,
      stressLevel: 9,
      hydrationPercent: 10,
      moodScore: 1,
      streakDays: 0,
    });
    expect(result.score).toBeLessThan(40);
    expect(result.level).toBe('Starting');
  });

  it('inverts stress level correctly (low stress = high score)', () => {
    const result = calculateWellnessScore({ stressLevel: 0 });
    expect(result.dimensions.stress.score).toBe(100);

    const highStress = calculateWellnessScore({ stressLevel: 10 });
    expect(highStress.dimensions.stress.score).toBe(0);
  });

  it('converts mood score from 0-10 to 0-100 scale', () => {
    const result = calculateWellnessScore({ moodScore: 8 });
    expect(result.dimensions.mood.score).toBe(80);
  });

  it('caps streak consistency at 100 (20 days)', () => {
    const result = calculateWellnessScore({ streakDays: 50 });
    expect(result.dimensions.consistency.score).toBe(100);
  });

  it('returns all 8 dimensions', () => {
    const result = calculateWellnessScore({});
    expect(Object.keys(result.dimensions)).toHaveLength(8);
    expect(Object.keys(result.dimensions)).toEqual(
      expect.arrayContaining(['nutrition', 'fitness', 'sleep', 'recovery', 'stress', 'hydration', 'mood', 'consistency'])
    );
  });

  it('handles all zeros', () => {
    const result = calculateWellnessScore({
      nutritionScore: 0,
      fitnessScore: 0,
      sleepScore: 0,
      recoveryScore: 0,
      stressLevel: 10,
      hydrationPercent: 0,
      moodScore: 0,
      streakDays: 0,
    });
    expect(result.score).toBe(0);
  });

  it('handles all 100s', () => {
    const result = calculateWellnessScore({
      nutritionScore: 100,
      fitnessScore: 100,
      sleepScore: 100,
      recoveryScore: 100,
      stressLevel: 0,
      hydrationPercent: 100,
      moodScore: 10,
      streakDays: 20,
    });
    expect(result.score).toBe(100);
  });
});

// =============================================================================
// Constants & Utilities
// =============================================================================

describe('BREATHING_EXERCISES', () => {
  it('contains at least 5 exercises', () => {
    expect(BREATHING_EXERCISES.length).toBeGreaterThanOrEqual(5);
  });

  it('each exercise has required fields', () => {
    for (const exercise of BREATHING_EXERCISES) {
      expect(exercise.id).toBeDefined();
      expect(exercise.name).toBeDefined();
      expect(exercise.pattern).toBeDefined();
      expect(exercise.duration).toBeGreaterThan(0);
      expect(exercise.benefits.length).toBeGreaterThan(0);
      expect(['beginner', 'intermediate', 'advanced']).toContain(exercise.difficulty);
    }
  });

  it('includes box breathing', () => {
    const box = BREATHING_EXERCISES.find(e => e.id === 'box_breathing');
    expect(box).toBeDefined();
    expect(box!.pattern.inhale).toBe(4);
    expect(box!.pattern.hold1).toBe(4);
    expect(box!.pattern.exhale).toBe(4);
    expect(box!.pattern.hold2).toBe(4);
  });
});

describe('MEDITATION_LIBRARY', () => {
  it('contains at least 10 meditations', () => {
    expect(MEDITATION_LIBRARY.length).toBeGreaterThanOrEqual(10);
  });

  it('each meditation has required fields', () => {
    for (const entry of MEDITATION_LIBRARY) {
      expect(entry.id).toBeDefined();
      expect(entry.name).toBeDefined();
      expect(entry.duration).toBeGreaterThan(0);
      expect(entry.category).toBeDefined();
      expect(entry.description).toBeDefined();
    }
  });
});

describe('getDailyJournalPrompt', () => {
  it('returns a prompt with question and category', () => {
    const prompt = getDailyJournalPrompt();
    expect(prompt.question).toBeDefined();
    expect(prompt.question.length).toBeGreaterThan(0);
    expect(prompt.category).toBeDefined();
  });

  it('returns consistent result for same day', () => {
    const prompt1 = getDailyJournalPrompt();
    const prompt2 = getDailyJournalPrompt();
    expect(prompt1.question).toBe(prompt2.question);
  });
});
