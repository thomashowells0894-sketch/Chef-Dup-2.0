import {
  weightedMovingAverage,
  detectTrend,
  predictFuture,
  detectPlateau,
  estimateBodyFat,
  estimateComposition,
  getBodyFatCategory,
  calculateNutritionScore,
  calculateFitnessScore,
  detectMetabolicAdaptation,
  projectGoalTimeline,
  generateWeeklyInsights,
} from '../../lib/analyticsEngine';

// =============================================================================
// weightedMovingAverage
// =============================================================================

describe('weightedMovingAverage', () => {
  it('returns empty array for empty input', () => {
    expect(weightedMovingAverage([])).toEqual([]);
  });

  it('returns empty array for null input', () => {
    expect(weightedMovingAverage(null as any)).toEqual([]);
  });

  it('returns same-length array as input', () => {
    const data = [180, 179, 178, 177, 176];
    const result = weightedMovingAverage(data);
    expect(result).toHaveLength(data.length);
  });

  it('first element equals the first data point', () => {
    const data = [180, 179, 178];
    const result = weightedMovingAverage(data);
    expect(result[0]).toBe(180);
  });

  it('smooths noisy data', () => {
    const data = [180, 182, 179, 181, 178, 180, 177];
    const result = weightedMovingAverage(data);
    // The result should be smoother (less variance) than the original
    const dataVariance = Math.max(...data) - Math.min(...data);
    const resultVariance = Math.max(...result) - Math.min(...result);
    expect(resultVariance).toBeLessThanOrEqual(dataVariance);
  });

  it('uses custom window size', () => {
    const data = [100, 200, 300, 400, 500];
    const result3 = weightedMovingAverage(data, 3);
    const result7 = weightedMovingAverage(data, 7);
    // With larger window, smoothing is different
    expect(result3).not.toEqual(result7);
  });

  it('weights recent data more heavily', () => {
    const data = [100, 100, 100, 200];
    const result = weightedMovingAverage(data);
    // Last point: weights [1,2,3,4] for [100,100,100,200]
    // = (100+200+300+800)/10 = 140
    // It should be above the simple average of 125 but below 200
    expect(result[3]).toBeGreaterThan(125);
    expect(result[3]).toBeLessThan(200);
  });
});

// =============================================================================
// detectTrend
// =============================================================================

describe('detectTrend', () => {
  it('returns "insufficient_data" for too few data points', () => {
    const result = detectTrend([180, 179, 178]);
    expect(result.direction).toBe('insufficient_data');
    expect(result.confidence).toBe(0);
  });

  it('detects increasing trend', () => {
    const data = [170, 172, 174, 176, 178, 180, 182];
    const result = detectTrend(data);
    expect(result.direction).toBe('increasing');
    expect(result.slope).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects decreasing trend', () => {
    const data = [185, 183, 181, 179, 177, 175, 173];
    const result = detectTrend(data);
    expect(result.direction).toBe('decreasing');
    expect(result.slope).toBeLessThan(0);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects stable trend for constant values', () => {
    const data = [180, 180, 180, 180, 180, 180, 180];
    const result = detectTrend(data);
    expect(result.direction).toBe('stable');
    expect(Math.abs(result.slope)).toBeLessThan(0.01);
  });

  it('respects custom minDataPoints', () => {
    const data = [180, 179, 178, 177, 176];
    const result = detectTrend(data, 3);
    expect(result.direction).not.toBe('insufficient_data');
  });

  it('has confidence between 0 and 1', () => {
    const data = [180, 179, 181, 178, 180, 177, 179];
    const result = detectTrend(data);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('has higher confidence for clean linear data', () => {
    const linear = [200, 198, 196, 194, 192, 190, 188];
    const noisy = [200, 195, 201, 193, 198, 190, 196];
    const linearResult = detectTrend(linear);
    const noisyResult = detectTrend(noisy);
    expect(linearResult.confidence).toBeGreaterThan(noisyResult.confidence);
  });

  it('returns slope and intercept', () => {
    const data = [100, 102, 104, 106, 108, 110, 112];
    const result = detectTrend(data);
    expect(result.slope).toBeCloseTo(2, 1);
    expect(result.intercept).toBeDefined();
  });
});

// =============================================================================
// predictFuture
// =============================================================================

describe('predictFuture', () => {
  it('returns empty array for insufficient data', () => {
    expect(predictFuture([1, 2, 3])).toEqual([]);
  });

  it('returns predictions for default 7 days ahead', () => {
    const data = [200, 198, 196, 194, 192, 190, 188];
    const predictions = predictFuture(data);
    expect(predictions).toHaveLength(7);
  });

  it('returns custom number of days ahead', () => {
    const data = [200, 198, 196, 194, 192, 190, 188];
    const predictions = predictFuture(data, 14);
    expect(predictions).toHaveLength(14);
  });

  it('predicts continuation of downward trend', () => {
    const data = [200, 198, 196, 194, 192, 190, 188];
    const predictions = predictFuture(data);
    expect(predictions[0].predicted).toBeLessThan(188);
    for (let i = 1; i < predictions.length; i++) {
      expect(predictions[i].predicted).toBeLessThan(predictions[i - 1].predicted);
    }
  });

  it('predicts continuation of upward trend', () => {
    const data = [170, 172, 174, 176, 178, 180, 182];
    const predictions = predictFuture(data);
    expect(predictions[0].predicted).toBeGreaterThan(182);
  });

  it('confidence decreases with distance', () => {
    const data = [200, 198, 196, 194, 192, 190, 188];
    const predictions = predictFuture(data);
    for (let i = 1; i < predictions.length; i++) {
      expect(predictions[i].confidence).toBeLessThanOrEqual(predictions[i - 1].confidence);
    }
  });

  it('each prediction has dayOffset, predicted, and confidence', () => {
    const data = [200, 198, 196, 194, 192, 190, 188];
    const predictions = predictFuture(data);
    for (const pred of predictions) {
      expect(pred.dayOffset).toBeGreaterThan(0);
      expect(typeof pred.predicted).toBe('number');
      expect(typeof pred.confidence).toBe('number');
    }
  });
});

// =============================================================================
// detectPlateau
// =============================================================================

describe('detectPlateau', () => {
  it('returns not plateaued for insufficient data', () => {
    const result = detectPlateau([180, 179, 178]);
    expect(result.isPlateaued).toBe(false);
    expect(result.reason).toBe('insufficient_data');
  });

  it('detects plateau when weight change is within threshold', () => {
    const stableData = Array(14).fill(180);
    const result = detectPlateau(stableData);
    expect(result.isPlateaued).toBe(true);
    expect(result.averageWeight).toBe(180);
    expect(result.range).toBe(0);
  });

  it('detects plateau with minor fluctuations within threshold', () => {
    const data = [180, 180.2, 179.8, 180.1, 179.9, 180.3, 179.7,
                   180, 180.2, 179.8, 180.1, 179.9, 180.3, 179.7];
    const result = detectPlateau(data, 1);
    expect(result.isPlateaued).toBe(true);
    expect(result.range).toBeLessThanOrEqual(1);
  });

  it('does not detect plateau for significant weight change', () => {
    const data = [190, 189, 188, 187, 186, 185, 184, 183, 182, 181, 180, 179, 178, 177];
    const result = detectPlateau(data);
    expect(result.isPlateaued).toBe(false);
  });

  it('returns suggestions when plateaued', () => {
    const result = detectPlateau(Array(14).fill(180));
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);
  });

  it('uses custom window size', () => {
    // Only 10 data points, not enough for default 14-day window
    const data = Array(10).fill(180);
    const result = detectPlateau(data, 1, 10);
    expect(result.isPlateaued).toBe(true);
  });

  it('uses custom threshold', () => {
    const data = [180, 181, 180, 181, 180, 181, 180, 181, 180, 181, 180, 181, 180, 181];
    const narrowThreshold = detectPlateau(data, 0.5);
    const wideThreshold = detectPlateau(data, 2);
    expect(narrowThreshold.isPlateaued).toBe(false);
    expect(wideThreshold.isPlateaued).toBe(true);
  });

  it('generates higher priority suggestions for longer plateaus', () => {
    const data = Array(22).fill(180);
    const result = detectPlateau(data, 1, 21);
    const highPriority = result.suggestions!.filter(s => s.priority === 'high');
    expect(highPriority.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// estimateBodyFat
// =============================================================================

describe('estimateBodyFat', () => {
  it('returns null for missing measurements', () => {
    expect(estimateBodyFat('male', 0, 15, 70)).toBeNull();
    expect(estimateBodyFat('male', 34, 0, 70)).toBeNull();
    expect(estimateBodyFat('male', 34, 15, 0)).toBeNull();
  });

  it('calculates male body fat using Navy method', () => {
    const result = estimateBodyFat('male', 34, 15, 70);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(5);
    expect(result!).toBeLessThan(40);
  });

  it('requires hip measurement for female', () => {
    expect(estimateBodyFat('female', 30, 13, 65)).toBeNull();
    const result = estimateBodyFat('female', 30, 13, 65, 38);
    expect(result).not.toBeNull();
  });

  it('clamps result between 3 and 60', () => {
    // Very low body fat scenario
    const veryLow = estimateBodyFat('male', 28, 16, 75);
    expect(veryLow).toBeGreaterThanOrEqual(3);

    // Very high scenario
    const veryHigh = estimateBodyFat('male', 50, 13, 65);
    expect(veryHigh).toBeLessThanOrEqual(60);
  });

  it('rounds to one decimal place', () => {
    const result = estimateBodyFat('male', 34, 15, 70);
    const decimalPlaces = (result!.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// estimateComposition
// =============================================================================

describe('estimateComposition', () => {
  it('returns null for zero weight', () => {
    expect(estimateComposition(0, 20)).toBeNull();
  });

  it('returns null for zero body fat percent', () => {
    expect(estimateComposition(180, 0)).toBeNull();
  });

  it('calculates fat mass and lean mass correctly', () => {
    const result = estimateComposition(200, 20);
    expect(result).not.toBeNull();
    expect(result!.fatMass).toBe(40); // 200 * 20/100
    expect(result!.leanMass).toBe(160); // 200 - 40
  });

  it('fat percent and lean percent sum to 100', () => {
    const result = estimateComposition(180, 15);
    expect(result!.fatPercent + result!.leanPercent).toBeCloseTo(100, 0);
  });
});

// =============================================================================
// getBodyFatCategory
// =============================================================================

describe('getBodyFatCategory', () => {
  it('returns null for zero body fat', () => {
    expect(getBodyFatCategory(0, 'male')).toBeNull();
  });

  it('classifies male athletes (7-13%)', () => {
    const result = getBodyFatCategory(10, 'male');
    expect(result).not.toBeNull();
    expect(result!.label).toBe('Athletes');
  });

  it('classifies male fitness (14-17%)', () => {
    const result = getBodyFatCategory(15, 'male');
    expect(result!.label).toBe('Fitness');
  });

  it('classifies male average (18-24%)', () => {
    const result = getBodyFatCategory(20, 'male');
    expect(result!.label).toBe('Average');
  });

  it('classifies female athletes (15-20%)', () => {
    const result = getBodyFatCategory(18, 'female');
    expect(result!.label).toBe('Athletes');
  });

  it('classifies female fitness (21-24%)', () => {
    const result = getBodyFatCategory(22, 'female');
    expect(result!.label).toBe('Fitness');
  });

  it('returns color for each category', () => {
    const result = getBodyFatCategory(10, 'male');
    expect(result!.color).toBeDefined();
    expect(result!.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

// =============================================================================
// calculateNutritionScore
// =============================================================================

describe('calculateNutritionScore', () => {
  it('returns zero for null data', () => {
    const result = calculateNutritionScore(null, null);
    expect(result.score).toBe(0);
  });

  it('gives perfect calorie score when at goal', () => {
    const result = calculateNutritionScore(
      { calories: 2000, protein: 150, carbs: 200, fat: 65, mealCount: 3 },
      { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    );
    expect(result.breakdown.calories!.score).toBe(30);
  });

  it('penalizes calorie over-consumption', () => {
    const result = calculateNutritionScore(
      { calories: 3000, protein: 150, carbs: 200, fat: 65, mealCount: 3 },
      { calories: 2000, protein: 150 },
    );
    expect(result.breakdown.calories!.score).toBeLessThan(30);
  });

  it('gives full protein score when hitting goal', () => {
    const result = calculateNutritionScore(
      { calories: 2000, protein: 150, carbs: 200, fat: 65, mealCount: 3 },
      { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    );
    expect(result.breakdown.protein!.score).toBe(30);
  });

  it('gives 20 meal distribution points for 3+ meals', () => {
    const result = calculateNutritionScore(
      { calories: 2000, protein: 150, carbs: 200, fat: 65, mealCount: 3 },
      { calories: 2000 },
    );
    expect(result.breakdown.mealDistribution!.score).toBe(20);
  });

  it('assigns grades correctly', () => {
    const perfect = calculateNutritionScore(
      { calories: 2000, protein: 150, carbs: 200, fat: 65, mealCount: 3 },
      { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    );
    expect(perfect.grade).toBe('A+');
  });

  it('clamps score between 0 and 100', () => {
    const result = calculateNutritionScore(
      { calories: 2000, protein: 300, carbs: 200, fat: 65, mealCount: 5 },
      { calories: 2000, protein: 100, carbs: 200, fat: 65 },
    );
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// calculateFitnessScore
// =============================================================================

describe('calculateFitnessScore', () => {
  it('returns "Getting Started" level for all zeros', () => {
    const result = calculateFitnessScore({});
    expect(result.score).toBe(0);
    expect(result.level).toBe('Getting Started');
  });

  it('returns "Elite" for max values', () => {
    const result = calculateFitnessScore({
      streak: 10,
      weeklyWorkouts: 4,
      nutritionScore: 100,
      waterAdherence: 100,
      sleepScore: 100,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe('Elite');
  });

  it('caps consistency at 25 points (10 day streak)', () => {
    const result = calculateFitnessScore({ streak: 20 });
    expect(result.breakdown.consistency).toBe(25);
  });

  it('caps activity at 25 points (4 workouts)', () => {
    const result = calculateFitnessScore({ weeklyWorkouts: 10 });
    expect(result.breakdown.activity).toBe(25);
  });

  it('returns correct color for each level', () => {
    const elite = calculateFitnessScore({ streak: 10, weeklyWorkouts: 4, nutritionScore: 100, sleepScore: 100, waterAdherence: 100 });
    expect(elite.color).toBe('#00E676');
  });
});

// =============================================================================
// detectMetabolicAdaptation
// =============================================================================

describe('detectMetabolicAdaptation', () => {
  it('returns not adapted for insufficient data', () => {
    const result = detectMetabolicAdaptation([{}, {}]);
    expect(result.adapted).toBe(false);
    expect(result.reason).toBe('insufficient_data');
  });

  it('detects adaptation when in deficit but not losing weight', () => {
    const weeklyData = [
      { calorieGoal: 2000, avgCalories: 1500, weight: 180 },
      { calorieGoal: 2000, avgCalories: 1500, weight: 180 },
      { calorieGoal: 2000, avgCalories: 1500, weight: 180.1 },
      { calorieGoal: 2000, avgCalories: 1500, weight: 180 },
    ];
    const result = detectMetabolicAdaptation(weeklyData);
    expect(result.adapted).toBe(true);
    expect(result.recommendations).toBeDefined();
    expect(result.recommendations!.length).toBeGreaterThan(0);
  });

  it('returns not adapted when weight is decreasing', () => {
    const weeklyData = [
      { calorieGoal: 2000, avgCalories: 1500, weight: 185 },
      { calorieGoal: 2000, avgCalories: 1500, weight: 183 },
      { calorieGoal: 2000, avgCalories: 1500, weight: 181 },
      { calorieGoal: 2000, avgCalories: 1500, weight: 179 },
    ];
    const result = detectMetabolicAdaptation(weeklyData);
    expect(result.adapted).toBe(false);
  });

  it('classifies severity as "significant" for large deficits', () => {
    const weeklyData = [
      { calorieGoal: 2500, avgCalories: 1500, weight: 180 },
      { calorieGoal: 2500, avgCalories: 1500, weight: 180 },
      { calorieGoal: 2500, avgCalories: 1500, weight: 180 },
      { calorieGoal: 2500, avgCalories: 1500, weight: 180 },
    ];
    const result = detectMetabolicAdaptation(weeklyData);
    expect(result.severity).toBe('significant');
  });
});

// =============================================================================
// projectGoalTimeline
// =============================================================================

describe('projectGoalTimeline', () => {
  it('returns null for missing parameters', () => {
    expect(projectGoalTimeline(0, 170)).toBeNull();
    expect(projectGoalTimeline(180, 0)).toBeNull();
  });

  it('calculates correct weeks to goal for weight loss', () => {
    const result = projectGoalTimeline(180, 170, 1);
    expect(result).not.toBeNull();
    expect(result!.weeksToGoal).toBe(10);
    expect(result!.direction).toBe('losing');
    expect(result!.totalChange).toBe(10);
  });

  it('calculates correct weeks to goal for weight gain', () => {
    const result = projectGoalTimeline(150, 160, 0.5);
    expect(result).not.toBeNull();
    expect(result!.weeksToGoal).toBe(20);
    expect(result!.direction).toBe('gaining');
  });

  it('generates milestones', () => {
    const result = projectGoalTimeline(180, 170, 1);
    expect(result!.milestones.length).toBeGreaterThan(0);
    expect(result!.milestones[0].week).toBe(1);
    expect(result!.milestones[0].percentComplete).toBeGreaterThan(0);
  });

  it('milestone percentComplete reaches 100 at goal', () => {
    const result = projectGoalTimeline(180, 170, 1);
    const lastMilestone = result!.milestones[result!.milestones.length - 1];
    expect(lastMilestone.percentComplete).toBe(100);
  });

  it('milestones have valid dates', () => {
    const result = projectGoalTimeline(180, 170, 1);
    for (const milestone of result!.milestones) {
      expect(milestone.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('caps milestones at 52 weeks', () => {
    const result = projectGoalTimeline(300, 170, 0.5); // 260 weeks
    expect(result!.milestones.length).toBeLessThanOrEqual(52);
  });
});

// =============================================================================
// generateWeeklyInsights
// =============================================================================

describe('generateWeeklyInsights', () => {
  it('returns empty for null data', () => {
    expect(generateWeeklyInsights(null)).toEqual([]);
  });

  it('generates calorie consistency insight for low variance', () => {
    const insights = generateWeeklyInsights({
      daysLogged: 7,
      calorieVariance: 100,
    });
    const consistencyInsight = insights.find(i => i.title === 'Consistent Eating');
    expect(consistencyInsight).toBeDefined();
    expect(consistencyInsight!.type).toBe('success');
  });

  it('generates calorie swings warning for high variance', () => {
    const insights = generateWeeklyInsights({
      daysLogged: 7,
      calorieVariance: 600,
    });
    const swingInsight = insights.find(i => i.title === 'Calorie Swings');
    expect(swingInsight).toBeDefined();
    expect(swingInsight!.type).toBe('warning');
  });

  it('generates protein champion insight at >= 90% adherence', () => {
    const insights = generateWeeklyInsights({
      avgProtein: 140,
      proteinGoal: 150,
    });
    const proteinInsight = insights.find(i => i.title === 'Protein Champion');
    expect(proteinInsight).toBeDefined();
  });

  it('generates protein gap warning at < 70% adherence', () => {
    const insights = generateWeeklyInsights({
      avgProtein: 80,
      proteinGoal: 150,
    });
    const proteinInsight = insights.find(i => i.title === 'Protein Gap');
    expect(proteinInsight).toBeDefined();
  });

  it('generates streak milestone insight at 7-day intervals', () => {
    const insights = generateWeeklyInsights({ streak: 14 });
    const streakInsight = insights.find(i => i.title.includes('14-Day Streak'));
    expect(streakInsight).toBeDefined();
  });

  it('generates hydration hero insight at >= 90% water', () => {
    const insights = generateWeeklyInsights({ avgWaterPercent: 95 });
    const hydrationInsight = insights.find(i => i.title === 'Hydration Hero');
    expect(hydrationInsight).toBeDefined();
  });

  it('generates drink water warning at < 60% water', () => {
    const insights = generateWeeklyInsights({ avgWaterPercent: 50 });
    const hydrationInsight = insights.find(i => i.title === 'Drink More Water');
    expect(hydrationInsight).toBeDefined();
  });

  it('limits insights to 5', () => {
    const insights = generateWeeklyInsights({
      daysLogged: 7,
      calorieVariance: 100,
      avgProtein: 140,
      proteinGoal: 150,
      streak: 14,
      avgWaterPercent: 95,
      avgCalories: 2000,
    }, {
      avgCalories: 1500,
    });
    expect(insights.length).toBeLessThanOrEqual(5);
  });

  it('generates week-over-week comparison', () => {
    const insights = generateWeeklyInsights(
      { avgCalories: 2200 },
      { avgCalories: 1800 },
    );
    const comparisonInsight = insights.find(i => i.title.includes('more'));
    expect(comparisonInsight).toBeDefined();
  });
});
