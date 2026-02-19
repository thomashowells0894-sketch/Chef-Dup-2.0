import {
  MICRONUTRIENT_RDA,
  getMicronutrientRDA,
  analyzeMicronutrientGaps,
  GI_DATABASE,
  lookupGI,
  calculateDailyGlycemicLoad,
  optimizeMealTiming,
  SUBSTITUTIONS,
  getSubstitutions,
  generateCalorieCyclingPlan,
} from '../../lib/nutritionIntelligence';

// =============================================================================
// getMicronutrientRDA
// =============================================================================

describe('getMicronutrientRDA', () => {
  it('returns correct male RDA values', () => {
    const rda = getMicronutrientRDA('male');
    expect(rda.iron.recommended).toBe(8);
    expect(rda.vitaminC.recommended).toBe(90);
    expect(rda.calcium.recommended).toBe(1000);
  });

  it('returns correct female RDA values', () => {
    const rda = getMicronutrientRDA('female');
    expect(rda.iron.recommended).toBe(18);
    expect(rda.vitaminC.recommended).toBe(75);
    expect(rda.fiber.recommended).toBe(25);
  });

  it('defaults to male when no gender provided', () => {
    const rda = getMicronutrientRDA();
    expect(rda.iron.recommended).toBe(8);
  });

  it('includes all nutrients from MICRONUTRIENT_RDA', () => {
    const rda = getMicronutrientRDA('male');
    const rdaKeys = Object.keys(rda);
    const sourceKeys = Object.keys(MICRONUTRIENT_RDA);
    expect(rdaKeys).toEqual(sourceKeys);
  });

  it('each nutrient has name, unit, and recommended fields', () => {
    const rda = getMicronutrientRDA('male');
    for (const [key, nutrient] of Object.entries(rda)) {
      expect(nutrient.name).toBeDefined();
      expect(nutrient.unit).toBeDefined();
      expect(typeof nutrient.recommended).toBe('number');
      expect(nutrient.recommended).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// MICRONUTRIENT_RDA database
// =============================================================================

describe('MICRONUTRIENT_RDA', () => {
  it('contains at least 15 micronutrients', () => {
    expect(Object.keys(MICRONUTRIENT_RDA).length).toBeGreaterThanOrEqual(15);
  });

  it('all nutrients have required fields', () => {
    for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
      expect(nutrient.name).toBeTruthy();
      expect(nutrient.unit).toBeTruthy();
      expect(typeof nutrient.male).toBe('number');
      expect(typeof nutrient.female).toBe('number');
      expect(nutrient.male).toBeGreaterThan(0);
      expect(nutrient.female).toBeGreaterThan(0);
    }
  });

  it('upper limits are null or positive numbers', () => {
    for (const nutrient of Object.values(MICRONUTRIENT_RDA)) {
      if (nutrient.ul !== null) {
        expect(typeof nutrient.ul).toBe('number');
        expect(nutrient.ul).toBeGreaterThan(0);
      }
    }
  });

  it('upper limits are greater than RDA values when defined (except magnesium supplement UL)', () => {
    for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
      if (nutrient.ul !== null && key !== 'magnesium') {
        expect(nutrient.ul).toBeGreaterThanOrEqual(nutrient.male);
        expect(nutrient.ul).toBeGreaterThanOrEqual(nutrient.female);
      }
    }
  });

  it('includes essential vitamins', () => {
    expect(MICRONUTRIENT_RDA.vitaminA).toBeDefined();
    expect(MICRONUTRIENT_RDA.vitaminC).toBeDefined();
    expect(MICRONUTRIENT_RDA.vitaminD).toBeDefined();
    expect(MICRONUTRIENT_RDA.vitaminB12).toBeDefined();
  });

  it('includes essential minerals', () => {
    expect(MICRONUTRIENT_RDA.calcium).toBeDefined();
    expect(MICRONUTRIENT_RDA.iron).toBeDefined();
    expect(MICRONUTRIENT_RDA.zinc).toBeDefined();
    expect(MICRONUTRIENT_RDA.magnesium).toBeDefined();
  });
});

// =============================================================================
// analyzeMicronutrientGaps
// =============================================================================

describe('analyzeMicronutrientGaps', () => {
  it('identifies deficient nutrients with zero intake', () => {
    const result = analyzeMicronutrientGaps({}, 'male');
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.adequate.length).toBe(0);
    expect(result.overallScore).toBe(0);
  });

  it('identifies adequate nutrients when intake meets RDA', () => {
    const intake: Record<string, number> = {};
    const rda = getMicronutrientRDA('male');
    for (const [key, nutrient] of Object.entries(rda)) {
      intake[key] = nutrient.recommended; // exactly at RDA
    }
    const result = analyzeMicronutrientGaps(intake, 'male');
    expect(result.adequate.length).toBeGreaterThan(0);
    expect(result.overallScore).toBe(100);
  });

  it('classifies 0-49% intake as "deficient"', () => {
    const rda = getMicronutrientRDA('male');
    const result = analyzeMicronutrientGaps({ iron: rda.iron.recommended * 0.4 }, 'male');
    const ironEntry = result.gaps.find(g => g.key === 'iron');
    expect(ironEntry).toBeDefined();
    expect(ironEntry!.status).toBe('deficient');
  });

  it('classifies 50-89% intake as "low"', () => {
    const rda = getMicronutrientRDA('male');
    const result = analyzeMicronutrientGaps({ iron: rda.iron.recommended * 0.7 }, 'male');
    const ironEntry = result.gaps.find(g => g.key === 'iron');
    expect(ironEntry).toBeDefined();
    expect(ironEntry!.status).toBe('low');
  });

  it('classifies >= 90% intake as "adequate"', () => {
    const rda = getMicronutrientRDA('male');
    const result = analyzeMicronutrientGaps({ iron: rda.iron.recommended * 0.95 }, 'male');
    const ironEntry = result.adequate.find(g => g.key === 'iron');
    expect(ironEntry).toBeDefined();
    expect(ironEntry!.status).toBe('adequate');
  });

  it('sorts gaps by percentage (lowest first)', () => {
    const result = analyzeMicronutrientGaps({ iron: 4, vitaminC: 45 }, 'male');
    // both should be in gaps, iron % = 4/8 = 50%, vitC % = 45/90 = 50%
    // Verify sorted ascending
    for (let i = 1; i < result.gaps.length; i++) {
      expect(result.gaps[i].percentage).toBeGreaterThanOrEqual(result.gaps[i - 1].percentage);
    }
  });

  it('calculates overall score correctly', () => {
    // If all nutrients are adequate, score = 100
    // If half are adequate, score ~= 50
    const rda = getMicronutrientRDA('male');
    const keys = Object.keys(rda);
    const intake: Record<string, number> = {};
    keys.forEach((key, i) => {
      // Make half adequate
      intake[key] = i < keys.length / 2 ? rda[key].recommended : 0;
    });
    const result = analyzeMicronutrientGaps(intake, 'male');
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThan(100);
  });
});

// =============================================================================
// lookupGI
// =============================================================================

describe('lookupGI', () => {
  it('returns null for empty food name', () => {
    expect(lookupGI('')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(lookupGI(null as any)).toBeNull();
  });

  it('finds exact match (case insensitive)', () => {
    const result = lookupGI('Apple');
    expect(result).not.toBeNull();
    expect(result!.gi).toBe(36);
    expect(result!.category).toBe('low');
  });

  it('finds partial match', () => {
    const result = lookupGI('brown rice bowl');
    expect(result).not.toBeNull();
    expect(result!.matchedTo).toBe('brown rice');
  });

  it('returns null for unknown food', () => {
    expect(lookupGI('dragon fruit smoothie supreme')).toBeNull();
  });

  it('categorizes low GI foods correctly', () => {
    const result = lookupGI('lentils');
    expect(result!.category).toBe('low');
    expect(result!.gi).toBeLessThan(55);
  });

  it('categorizes high GI foods correctly', () => {
    const result = lookupGI('white bread');
    expect(result!.category).toBe('high');
    expect(result!.gi).toBeGreaterThan(70);
  });
});

// =============================================================================
// calculateDailyGlycemicLoad
// =============================================================================

describe('calculateDailyGlycemicLoad', () => {
  it('returns zero GL for empty food list', () => {
    const result = calculateDailyGlycemicLoad([]);
    expect(result.totalGL).toBe(0);
    expect(result.category).toBe('low');
  });

  it('returns zero GL for null', () => {
    const result = calculateDailyGlycemicLoad(null);
    expect(result.totalGL).toBe(0);
  });

  it('calculates total GL from recognized foods', () => {
    const result = calculateDailyGlycemicLoad([
      { name: 'apple' },
      { name: 'banana' },
    ]);
    expect(result.totalGL).toBe(5 + 16); // apple GL=5, banana GL=16
  });

  it('categorizes as "low" when GL < 80', () => {
    const result = calculateDailyGlycemicLoad([{ name: 'apple' }]);
    expect(result.category).toBe('low');
  });

  it('categorizes as "moderate" when GL 80-120', () => {
    // White rice GL=23, cornflakes GL=21 - need several servings
    const foods = Array(5).fill({ name: 'white rice' }); // 5 * 23 = 115
    const result = calculateDailyGlycemicLoad(foods);
    expect(result.category).toBe('moderate');
  });

  it('categorizes as "high" when GL > 120', () => {
    const foods = Array(8).fill({ name: 'white rice' }); // 8 * 23 = 184
    const result = calculateDailyGlycemicLoad(foods);
    expect(result.category).toBe('high');
    expect(result.recommendation).toContain('swapping high-GI foods');
  });

  it('only includes recognized foods in analyzed results', () => {
    const result = calculateDailyGlycemicLoad([
      { name: 'apple' },
      { name: 'mystery food XYZ' },
    ]);
    expect(result.analyzedFoods).toHaveLength(1);
    expect(result.analyzedFoods[0].gi).toBe(36);
  });
});

// =============================================================================
// optimizeMealTiming
// =============================================================================

describe('optimizeMealTiming', () => {
  it('generates correct number of meals', () => {
    const result = optimizeMealTiming({ mealsPerDay: 3 });
    const mainMeals = result.schedule.filter(m => !m.isOptional);
    expect(mainMeals).toHaveLength(3);
  });

  it('adds pre and post workout meals when workout time specified', () => {
    const result = optimizeMealTiming({
      mealsPerDay: 3,
      workoutTime: '17:00',
    });
    const preWorkout = result.schedule.find(m => m.meal === 'Pre-Workout');
    const postWorkout = result.schedule.find(m => m.meal === 'Post-Workout');
    expect(preWorkout).toBeDefined();
    expect(postWorkout).toBeDefined();
    expect(preWorkout!.isOptional).toBe(true);
    expect(postWorkout!.macroFocus).toContain('Protein');
  });

  it('sorts schedule by time', () => {
    const result = optimizeMealTiming({ mealsPerDay: 4, workoutTime: '06:00' });
    for (let i = 1; i < result.schedule.length; i++) {
      expect(result.schedule[i].time >= result.schedule[i - 1].time).toBe(true);
    }
  });

  it('returns weight loss specific macro focus', () => {
    const result = optimizeMealTiming({ goal: 'lose', mealsPerDay: 3 });
    const breakfast = result.schedule.find(m => m.meal === 'Breakfast');
    expect(breakfast!.macroFocus).toContain('protein');
  });

  it('returns weight gain specific macro focus', () => {
    const result = optimizeMealTiming({ goal: 'gain', mealsPerDay: 3 });
    const breakfast = result.schedule.find(m => m.meal === 'Breakfast');
    expect(breakfast!.macroFocus).toContain('carbs');
  });

  it('returns meal timing advice', () => {
    const result = optimizeMealTiming({ goal: 'lose' });
    expect(result.advice.length).toBeGreaterThan(0);
    expect(result.advice.some(a => a.includes('waking'))).toBe(true);
  });

  it('calorie distributions for 3 meals sum to 100', () => {
    const result = optimizeMealTiming({ mealsPerDay: 3 });
    const mainMeals = result.schedule.filter(m => !m.isOptional);
    const totalPercent = mainMeals.reduce((s, m) => s + m.calPercent, 0);
    expect(totalPercent).toBe(100);
  });

  it('calorie distributions for 4 meals sum to 100', () => {
    const result = optimizeMealTiming({ mealsPerDay: 4 });
    const mainMeals = result.schedule.filter(m => !m.isOptional);
    const totalPercent = mainMeals.reduce((s, m) => s + m.calPercent, 0);
    expect(totalPercent).toBe(100);
  });
});

// =============================================================================
// getSubstitutions
// =============================================================================

describe('getSubstitutions', () => {
  it('returns empty array for empty input', () => {
    expect(getSubstitutions('')).toEqual([]);
  });

  it('returns substitutions for known ingredient', () => {
    const result = getSubstitutions('white rice');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBeDefined();
    expect(result[0].reason).toBeDefined();
  });

  it('returns empty for unknown ingredient', () => {
    expect(getSubstitutions('unicorn tears')).toEqual([]);
  });

  it('handles case-insensitive lookup', () => {
    const result = getSubstitutions('White Rice');
    expect(result.length).toBeGreaterThan(0);
  });

  it('substitutions include calorie and protein differences', () => {
    const result = getSubstitutions('sugar');
    for (const sub of result) {
      expect(typeof sub.calories).toBe('number');
      expect(typeof sub.protein).toBe('number');
      expect(sub.tags.length).toBeGreaterThan(0);
    }
  });

  it('contains cauliflower rice as substitution for white rice', () => {
    const result = getSubstitutions('white rice');
    const cauli = result.find(s => s.name === 'Cauliflower Rice');
    expect(cauli).toBeDefined();
    expect(cauli!.calories).toBeLessThan(0); // fewer calories
  });
});

// =============================================================================
// generateCalorieCyclingPlan
// =============================================================================

describe('generateCalorieCyclingPlan', () => {
  it('generates a 7-day plan', () => {
    const plan = generateCalorieCyclingPlan(2000, 'maintain');
    expect(plan.weekPlan).toHaveLength(7);
  });

  it('marks training days correctly', () => {
    const trainingDays = [1, 3, 5]; // Mon, Wed, Fri
    const plan = generateCalorieCyclingPlan(2000, 'lose', trainingDays);
    expect(plan.weekPlan[1].isTraining).toBe(true); // Monday
    expect(plan.weekPlan[2].isTraining).toBe(false); // Tuesday
    expect(plan.weekPlan[3].isTraining).toBe(true); // Wednesday
  });

  it('reduces rest day calories for "lose" goal', () => {
    const plan = generateCalorieCyclingPlan(2000, 'lose', [1]);
    const trainingDay = plan.weekPlan[1];
    const restDay = plan.weekPlan[0];
    expect(restDay.calories).toBe(1600); // 2000 * 0.8
    expect(trainingDay.calories).toBe(2000);
  });

  it('increases training day calories for "gain" goal', () => {
    const plan = generateCalorieCyclingPlan(2000, 'gain', [1]);
    const trainingDay = plan.weekPlan[1];
    const restDay = plan.weekPlan[0];
    expect(trainingDay.calories).toBe(2300); // 2000 * 1.15
    expect(restDay.calories).toBe(2000);
  });

  it('keeps all days equal for "maintain" goal', () => {
    const plan = generateCalorieCyclingPlan(2000, 'maintain');
    for (const day of plan.weekPlan) {
      expect(day.calories).toBe(2000);
    }
  });

  it('calculates correct weekly total', () => {
    const plan = generateCalorieCyclingPlan(2000, 'lose', [1, 3, 5]);
    const expectedTotal = plan.weekPlan.reduce((s, d) => s + d.calories, 0);
    expect(plan.totalWeekly).toBe(expectedTotal);
  });

  it('calculates correct weekly average', () => {
    const plan = generateCalorieCyclingPlan(2000, 'lose', [1, 3, 5]);
    expect(plan.weeklyAvg).toBe(Math.round(plan.totalWeekly / 7));
  });

  it('stores base calories', () => {
    const plan = generateCalorieCyclingPlan(2500, 'gain');
    expect(plan.baseCalories).toBe(2500);
  });

  it('assigns day names correctly', () => {
    const plan = generateCalorieCyclingPlan(2000, 'maintain');
    expect(plan.weekPlan[0].day).toBe('Sunday');
    expect(plan.weekPlan[1].day).toBe('Monday');
    expect(plan.weekPlan[6].day).toBe('Saturday');
  });

  it('includes macro focus for each day', () => {
    const plan = generateCalorieCyclingPlan(2000, 'lose', [1]);
    const trainingDay = plan.weekPlan[1];
    const restDay = plan.weekPlan[0];
    expect(trainingDay.macroFocus).toContain('carbs');
    expect(restDay.macroFocus).toContain('fats');
  });

  it('each day has a type of "training" or "rest"', () => {
    const plan = generateCalorieCyclingPlan(2000, 'lose', [1, 3, 5]);
    for (const day of plan.weekPlan) {
      expect(['training', 'rest']).toContain(day.type);
    }
  });
});
