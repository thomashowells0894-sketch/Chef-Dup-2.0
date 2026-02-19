import {
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
} from '../../lib/workoutEngine';

// =============================================================================
// calculate1RM
// =============================================================================

describe('calculate1RM', () => {
  it('returns null for zero weight', () => {
    expect(calculate1RM(0, 5)).toBeNull();
  });

  it('returns null for zero reps', () => {
    expect(calculate1RM(100, 0)).toBeNull();
  });

  it('returns null for negative reps', () => {
    expect(calculate1RM(100, -1)).toBeNull();
  });

  it('returns exact weight for 1 rep', () => {
    const result = calculate1RM(225, 1);
    expect(result).not.toBeNull();
    expect(result!.estimated1RM).toBe(225);
    expect(result!.confidence).toBe('exact');
  });

  it('calculates Epley formula correctly', () => {
    // Epley: weight * (1 + reps / 30)
    const result = calculate1RM(200, 5);
    expect(result).not.toBeNull();
    const expectedEpley = Math.round(200 * (1 + 5 / 30));
    expect(result!.formulas.epley).toBe(expectedEpley);
  });

  it('calculates Brzycki formula correctly', () => {
    // Brzycki: weight * (36 / (37 - reps))
    const result = calculate1RM(200, 5);
    expect(result).not.toBeNull();
    const expectedBrzycki = Math.round(200 * (36 / (37 - 5)));
    expect(result!.formulas.brzycki).toBe(expectedBrzycki);
  });

  it('calculates Lander formula correctly', () => {
    // Lander: (100 * weight) / (101.3 - 2.67123 * reps)
    const result = calculate1RM(200, 5);
    expect(result).not.toBeNull();
    const expectedLander = Math.round((100 * 200) / (101.3 - 2.67123 * 5));
    expect(result!.formulas.lander).toBe(expectedLander);
  });

  it('calculates Lombardi formula correctly', () => {
    // Lombardi: weight * reps^0.1
    const result = calculate1RM(200, 5);
    expect(result).not.toBeNull();
    const expectedLombardi = Math.round(200 * Math.pow(5, 0.1));
    expect(result!.formulas.lombardi).toBe(expectedLombardi);
  });

  it('calculates OConner formula correctly', () => {
    // OConner: weight * (1 + 0.025 * reps)
    const result = calculate1RM(200, 5);
    expect(result).not.toBeNull();
    const expectedOconner = Math.round(200 * (1 + 0.025 * 5));
    expect(result!.formulas.oconner).toBe(expectedOconner);
  });

  it('estimated1RM is average of all formulas', () => {
    const result = calculate1RM(200, 5);
    expect(result).not.toBeNull();
    const values = Object.values(result!.formulas);
    const expectedAvg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    expect(result!.estimated1RM).toBe(expectedAvg);
  });

  it('returns high confidence for <= 5 reps', () => {
    const result = calculate1RM(200, 5);
    expect(result!.confidence).toBe('high');
  });

  it('returns medium confidence for 6-10 reps', () => {
    const result = calculate1RM(200, 8);
    expect(result!.confidence).toBe('medium');
  });

  it('returns low confidence for > 10 reps', () => {
    const result = calculate1RM(200, 15);
    expect(result!.confidence).toBe('low');
  });

  it('stores original weight and reps for multi-rep input', () => {
    const result = calculate1RM(185, 6);
    expect(result!.weight).toBe(185);
    expect(result!.reps).toBe(6);
  });
});

// =============================================================================
// calculateWorkingWeight
// =============================================================================

describe('calculateWorkingWeight', () => {
  it('returns null for zero 1RM', () => {
    expect(calculateWorkingWeight(0, 8)).toBeNull();
  });

  it('returns null for zero target reps', () => {
    expect(calculateWorkingWeight(300, 0)).toBeNull();
  });

  it('rounds to nearest 2.5', () => {
    const result = calculateWorkingWeight(300, 5);
    expect(result).not.toBeNull();
    expect(result! % 2.5).toBe(0);
  });

  it('applies intensity multiplier', () => {
    const full = calculateWorkingWeight(300, 5, 1.0);
    const reduced = calculateWorkingWeight(300, 5, 0.9);
    expect(reduced).not.toBeNull();
    expect(full).not.toBeNull();
    expect(reduced!).toBeLessThan(full!);
  });

  it('calculates using reversed Brzycki formula', () => {
    const oneRM = 300;
    const targetReps = 5;
    const expected = Math.round((oneRM * ((37 - targetReps) / 36)) / 2.5) * 2.5;
    expect(calculateWorkingWeight(oneRM, targetReps)).toBe(expected);
  });
});

// =============================================================================
// generateTrainingLoads
// =============================================================================

describe('generateTrainingLoads', () => {
  it('returns empty array for zero 1RM', () => {
    expect(generateTrainingLoads(0)).toEqual([]);
  });

  it('generates 10 load entries', () => {
    const loads = generateTrainingLoads(300);
    expect(loads).toHaveLength(10);
  });

  it('first entry is 100% at 1 rep', () => {
    const loads = generateTrainingLoads(300);
    expect(loads[0].percent).toBe(100);
    expect(loads[0].weight).toBe(300);
    expect(loads[0].reps).toBe(1);
    expect(loads[0].purpose).toBe('Max Effort');
  });

  it('percentages decrease correctly', () => {
    const loads = generateTrainingLoads(200);
    expect(loads[0].percent).toBe(100);
    expect(loads[1].percent).toBe(95);
    expect(loads[2].percent).toBe(90);
    expect(loads[3].percent).toBe(85);
  });

  it('calculates correct weight at each percentage', () => {
    const loads = generateTrainingLoads(200);
    expect(loads[1].weight).toBe(Math.round(200 * 0.95)); // 190
    expect(loads[4].weight).toBe(Math.round(200 * 0.80)); // 160
    expect(loads[9].weight).toBe(Math.round(200 * 0.50)); // 100
  });

  it('reps increase as percentage decreases', () => {
    const loads = generateTrainingLoads(200);
    for (let i = 1; i < loads.length; i++) {
      expect(loads[i].reps).toBeGreaterThanOrEqual(loads[i - 1].reps);
    }
  });

  it('last entry is warmup at 50%', () => {
    const loads = generateTrainingLoads(200);
    const last = loads[loads.length - 1];
    expect(last.percent).toBe(50);
    expect(last.purpose).toBe('Warmup / Light');
    expect(last.reps).toBe(20);
  });
});

// =============================================================================
// detectOverloadOpportunity
// =============================================================================

describe('detectOverloadOpportunity', () => {
  it('returns null for empty history', () => {
    expect(detectOverloadOpportunity([])).toBeNull();
  });

  it('returns null for single entry', () => {
    expect(detectOverloadOpportunity([
      { name: 'Bench Press', reps: 8, sets: 3, weight: 135, targetReps: 8 },
    ])).toBeNull();
  });

  it('suggests weight increase when reps met and RPE < 8', () => {
    const result = detectOverloadOpportunity([
      { name: 'Bench Press', reps: 8, sets: 3, weight: 135, targetReps: 8, rpe: 6 },
      { name: 'Bench Press', reps: 8, sets: 3, weight: 135, targetReps: 8, rpe: 7 },
    ]);
    expect(result).not.toBeNull();
    const weightSuggestion = result!.suggestions.find(s => s.type === 'weight');
    expect(weightSuggestion).toBeDefined();
    expect(weightSuggestion!.newWeight).toBe(140); // 135 > 100, so +5
    expect(weightSuggestion!.confidence).toBe('high');
  });

  it('suggests 5lb increment for weights over 100', () => {
    const result = detectOverloadOpportunity([
      { name: 'Squat', reps: 5, sets: 5, weight: 225, targetReps: 5, rpe: 7 },
      { name: 'Squat', reps: 5, sets: 5, weight: 225, targetReps: 5, rpe: 7 },
    ]);
    const weightSuggestion = result!.suggestions.find(s => s.type === 'weight');
    expect(weightSuggestion).toBeDefined();
    expect(weightSuggestion!.newWeight).toBe(230);
  });

  it('suggests set progression when sets < 5 and reps met', () => {
    const result = detectOverloadOpportunity([
      { name: 'Curl', reps: 10, sets: 3, weight: 30, targetReps: 10, rpe: 8 },
      { name: 'Curl', reps: 10, sets: 3, weight: 30, targetReps: 10, rpe: 8 },
    ]);
    const setSuggestion = result!.suggestions.find(s => s.type === 'sets');
    expect(setSuggestion).toBeDefined();
  });

  it('suggests rep progression', () => {
    const result = detectOverloadOpportunity([
      { name: 'Curl', reps: 10, sets: 3, weight: 30, targetReps: 12, rpe: 8 },
      { name: 'Curl', reps: 10, sets: 3, weight: 30, targetReps: 12, rpe: 8 },
    ]);
    const repSuggestion = result!.suggestions.find(s => s.type === 'reps');
    expect(repSuggestion).toBeDefined();
    expect(repSuggestion!.confidence).toBe('medium');
  });

  it('returns exercise name and last performance', () => {
    const history = [
      { name: 'Deadlift', reps: 3, sets: 5, weight: 315, targetReps: 3, rpe: 9 },
      { name: 'Deadlift', reps: 3, sets: 5, weight: 315, targetReps: 3, rpe: 9 },
    ];
    const result = detectOverloadOpportunity(history);
    expect(result!.exercise).toBe('Deadlift');
    expect(result!.lastPerformance.weight).toBe(315);
  });
});

// =============================================================================
// calculateWeeklyVolume
// =============================================================================

describe('calculateWeeklyVolume', () => {
  it('returns empty for null workout logs', () => {
    const result = calculateWeeklyVolume(null as any);
    expect(result.totalSets).toBe(0);
    expect(result.recommendations).toEqual([]);
  });

  it('calculates volume correctly per muscle group', () => {
    const result = calculateWeeklyVolume([
      {
        exercises: [
          { muscle_group: 'chest', sets: 4, reps: 10, weight: 135 },
          { muscle_group: 'chest', sets: 3, reps: 12, weight: 100 },
        ],
      },
    ]);
    expect(result.byMuscle['chest']).toBeDefined();
    expect(result.byMuscle['chest'].sets).toBe(7);
    expect(result.byMuscle['chest'].totalReps).toBe(4 * 10 + 3 * 12); // 76
    expect(result.byMuscle['chest'].totalVolume).toBe(4 * 10 * 135 + 3 * 12 * 100); // 9000
  });

  it('recommends increasing volume when below minimum', () => {
    const result = calculateWeeklyVolume([
      { exercises: [{ muscle_group: 'chest', sets: 5, reps: 8, weight: 100 }] },
    ]);
    const chestRec = result.recommendations.find(r => r.muscle === 'chest');
    expect(chestRec).toBeDefined();
    expect(chestRec!.type).toBe('under');
    expect(chestRec!.priority).toBe('high');
  });

  it('recommends decreasing volume when above maximum', () => {
    const result = calculateWeeklyVolume([
      { exercises: [{ muscle_group: 'chest', sets: 25, reps: 10, weight: 100 }] },
    ]);
    const chestRec = result.recommendations.find(r => r.muscle === 'chest');
    expect(chestRec).toBeDefined();
    expect(chestRec!.type).toBe('over');
  });

  it('calculates total sets across all muscle groups', () => {
    const result = calculateWeeklyVolume([
      {
        exercises: [
          { muscle_group: 'chest', sets: 10, reps: 10, weight: 100 },
          { muscle_group: 'back', sets: 12, reps: 10, weight: 100 },
        ],
      },
    ]);
    expect(result.totalSets).toBe(22);
  });

  it('handles muscleGroup (camelCase) property', () => {
    const result = calculateWeeklyVolume([
      { exercises: [{ muscleGroup: 'Biceps', sets: 6, reps: 10, weight: 30 }] },
    ]);
    expect(result.byMuscle['biceps']).toBeDefined();
    expect(result.byMuscle['biceps'].sets).toBe(6);
  });
});

// =============================================================================
// scoreWorkout
// =============================================================================

describe('scoreWorkout', () => {
  it('returns zero for null/undefined workout', () => {
    const result = scoreWorkout(null as any);
    expect(result.score).toBe(0);
  });

  it('gives full duration points for 45+ minute workout', () => {
    const result = scoreWorkout({ duration: 60, exercises: [] });
    expect(result.breakdown.duration).toBe(20);
  });

  it('gives 15 duration points for 30-44 minute workout', () => {
    const result = scoreWorkout({ duration: 35, exercises: [] });
    expect(result.breakdown.duration).toBe(15);
  });

  it('gives 10 duration points for 15-29 minute workout', () => {
    const result = scoreWorkout({ duration: 20, exercises: [] });
    expect(result.breakdown.duration).toBe(10);
  });

  it('gives 5 duration points for < 15 minute workout', () => {
    const result = scoreWorkout({ duration: 5, exercises: [] });
    expect(result.breakdown.duration).toBe(5);
  });

  it('scores volume based on total sets (2 pts per set, max 25)', () => {
    const result = scoreWorkout({
      exercises: [
        { sets: 4, rpe: 7, muscle_group: 'chest' },
        { sets: 4, rpe: 7, muscle_group: 'back' },
        { sets: 4, rpe: 7, muscle_group: 'shoulders' },
      ],
    });
    expect(result.breakdown.volume).toBe(24); // 12 sets * 2 = 24
  });

  it('caps volume at 25 points', () => {
    const result = scoreWorkout({
      exercises: Array(20).fill({ sets: 4, rpe: 7, muscle_group: 'chest' }),
    });
    expect(result.breakdown.volume).toBe(25);
  });

  it('scores variety based on unique muscle groups (3 pts each, max 15)', () => {
    const result = scoreWorkout({
      exercises: [
        { sets: 3, muscle_group: 'chest' },
        { sets: 3, muscle_group: 'back' },
        { sets: 3, muscle_group: 'legs' },
        { sets: 3, muscle_group: 'shoulders' },
        { sets: 3, muscle_group: 'arms' },
      ],
    });
    expect(result.breakdown.variety).toBe(15); // 5 unique * 3 = 15
  });

  it('assigns grade S for score >= 90', () => {
    const result = scoreWorkout({
      duration: 60,
      exercises: [
        { sets: 4, rpe: 9, muscle_group: 'chest' },
        { sets: 4, rpe: 9, muscle_group: 'back' },
        { sets: 4, rpe: 9, muscle_group: 'legs' },
        { sets: 4, rpe: 9, muscle_group: 'shoulders' },
        { sets: 4, rpe: 9, muscle_group: 'arms' },
      ],
    });
    expect(result.grade).toBe('S');
  });

  it('assigns grade A for score 80-89', () => {
    const result = scoreWorkout({
      duration: 50,
      exercises: [
        { sets: 4, rpe: 8, muscle_group: 'chest' },
        { sets: 4, rpe: 8, muscle_group: 'back' },
        { sets: 4, rpe: 8, muscle_group: 'legs' },
      ],
    });
    expect(['S', 'A']).toContain(result.grade);
  });

  it('caps total score at 100', () => {
    const result = scoreWorkout({
      duration: 120,
      exercises: Array(20).fill({ sets: 5, rpe: 10, muscle_group: 'chest' }),
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// =============================================================================
// getRecommendedRest
// =============================================================================

describe('getRecommendedRest', () => {
  it('returns compound strength rest time', () => {
    const rest = getRecommendedRest('compound', 'strength');
    expect(rest).toBe(180); // base rest at RPE 7
  });

  it('returns isolation hypertrophy rest time', () => {
    const rest = getRecommendedRest('isolation', 'hypertrophy');
    expect(rest).toBe(60);
  });

  it('increases rest for high RPE (>= 9)', () => {
    const normal = getRecommendedRest('compound', 'strength', 7);
    const high = getRecommendedRest('compound', 'strength', 9);
    expect(high).toBeGreaterThan(normal);
    expect(high).toBe(Math.round(180 * 1.3));
  });

  it('decreases rest for low RPE (< 7)', () => {
    const normal = getRecommendedRest('compound', 'strength', 7);
    const low = getRecommendedRest('compound', 'strength', 5);
    expect(low).toBeLessThan(normal);
    expect(low).toBe(Math.round(180 * 0.8));
  });

  it('falls back to 90 seconds for unknown type/goal', () => {
    const rest = getRecommendedRest('unknown', 'unknown');
    expect(rest).toBe(90); // 90 * 1.0 (default RPE 7)
  });
});

// =============================================================================
// Constants
// =============================================================================

describe('PERIODIZATION_TEMPLATES', () => {
  it('contains linear, undulating, and block templates', () => {
    expect(PERIODIZATION_TEMPLATES.linear).toBeDefined();
    expect(PERIODIZATION_TEMPLATES.undulating).toBeDefined();
    expect(PERIODIZATION_TEMPLATES.block).toBeDefined();
  });

  it('linear has 4 weeks', () => {
    expect(PERIODIZATION_TEMPLATES.linear.weeks).toHaveLength(4);
  });

  it('undulating has 3 training days', () => {
    expect(PERIODIZATION_TEMPLATES.undulating.days).toHaveLength(3);
  });

  it('block has 4 phases', () => {
    expect(PERIODIZATION_TEMPLATES.block.blocks).toHaveLength(4);
  });
});

describe('MUSCLE_GROUPS', () => {
  it('contains at least 10 muscle groups', () => {
    expect(MUSCLE_GROUPS.length).toBeGreaterThanOrEqual(10);
  });

  it('includes all major muscle groups', () => {
    expect(MUSCLE_GROUPS).toContain('chest');
    expect(MUSCLE_GROUPS).toContain('back');
    expect(MUSCLE_GROUPS).toContain('shoulders');
    expect(MUSCLE_GROUPS).toContain('quadriceps');
    expect(MUSCLE_GROUPS).toContain('hamstrings');
    expect(MUSCLE_GROUPS).toContain('glutes');
    expect(MUSCLE_GROUPS).toContain('abs');
  });
});

// =============================================================================
// generateMuscleHeatmap
// =============================================================================

describe('generateMuscleHeatmap', () => {
  it('returns empty heatmap for null logs', () => {
    const heatmap = generateMuscleHeatmap(null as any);
    expect(Object.keys(heatmap).length).toBeGreaterThan(0);
    expect(heatmap['chest'].sets).toBe(0);
  });

  it('initializes all muscle groups with zero values', () => {
    const heatmap = generateMuscleHeatmap([]);
    for (const group of MUSCLE_GROUPS) {
      expect(heatmap[group]).toBeDefined();
      expect(heatmap[group].sets).toBe(0);
      expect(heatmap[group].lastWorked).toBeNull();
    }
  });

  it('accumulates sets for a muscle group', () => {
    const heatmap = generateMuscleHeatmap([
      {
        date: new Date().toISOString(),
        exercises: [
          { muscle_group: 'chest', sets: 4, rpe: 8 },
          { muscle_group: 'chest', sets: 3, rpe: 7 },
        ],
      },
    ]);
    expect(heatmap['chest'].sets).toBe(7);
    expect(heatmap['chest'].intensity).toBe(8); // max RPE
  });

  it('normalizes intensity to 0-1 scale (sets / 15)', () => {
    const heatmap = generateMuscleHeatmap([
      {
        date: new Date().toISOString(),
        exercises: [{ muscle_group: 'back', sets: 10, rpe: 7 }],
      },
    ]);
    expect(heatmap['back'].normalizedIntensity).toBeCloseTo(10 / 15, 2);
  });

  it('caps normalizedIntensity at 1', () => {
    const heatmap = generateMuscleHeatmap([
      {
        date: new Date().toISOString(),
        exercises: [{ muscle_group: 'back', sets: 20, rpe: 7 }],
      },
    ]);
    expect(heatmap['back'].normalizedIntensity).toBe(1);
  });
});
