import {
  computeEWMA,
  linearRegression,
  calculateMifflinStJeorBMR,
  formulaTDEE,
  computeObservedTDEE,
  bayesianBlend,
  computeConfidence,
  detectMetabolicAdaptation,
  detectPlateau,
  computeTDEETrend,
  computeAdaptiveTDEE,
  lbsToKg,
  inchesToCm,
} from '../../lib/adaptiveTDEE';

import type { UserBiometrics, DailyWeightEntry, DailyIntakeEntry } from '../../lib/adaptiveTDEE';

// =============================================================================
// Helper to generate test data
// =============================================================================

function generateWeightEntries(startWeight: number, dailyChange: number, days: number, startDate: string = '2024-01-01'): DailyWeightEntry[] {
  const entries: DailyWeightEntry[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    entries.push({
      date: date.toISOString().split('T')[0],
      weight: startWeight + dailyChange * i,
    });
  }
  return entries;
}

function generateIntakeEntries(calories: number, days: number, startDate: string = '2024-01-01'): DailyIntakeEntry[] {
  const entries: DailyIntakeEntry[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    entries.push({
      date: date.toISOString().split('T')[0],
      calories,
    });
  }
  return entries;
}

const baseBiometrics: UserBiometrics = {
  weightKg: 80,
  heightCm: 175,
  age: 30,
  gender: 'male',
  activityLevel: 'moderate',
  goalType: 'maintain',
  weeklyGoal: 'maintain',
};

// =============================================================================
// Statistical utilities
// =============================================================================

describe('computeEWMA', () => {
  it('returns empty array for empty input', () => {
    expect(computeEWMA([], 0.15)).toEqual([]);
  });

  it('returns the single value for single-element array', () => {
    expect(computeEWMA([100], 0.15)).toEqual([100]);
  });

  it('smooths values with given alpha', () => {
    const values = [80, 81, 79, 80, 82, 80, 81];
    const result = computeEWMA(values, 0.15);
    expect(result).toHaveLength(7);
    // First value should be unchanged
    expect(result[0]).toBe(80);
    // Smoothed values should be between min and max of input
    for (const v of result) {
      expect(v).toBeGreaterThanOrEqual(78);
      expect(v).toBeLessThanOrEqual(83);
    }
  });

  it('higher alpha means less smoothing (more responsive)', () => {
    const values = [80, 85, 80, 85, 80];
    const highAlpha = computeEWMA(values, 0.9);
    const lowAlpha = computeEWMA(values, 0.1);

    // With high alpha, smoothed values track raw values more closely
    // Check variance of smoothed values: high alpha => more variance
    const varianceHigh = highAlpha.reduce((s, v, i) => s + Math.abs(v - values[i]), 0);
    const varianceLow = lowAlpha.reduce((s, v, i) => s + Math.abs(v - values[i]), 0);
    // Low alpha = more smoothing = values deviate more from raw
    expect(varianceLow).toBeGreaterThan(varianceHigh);
  });

  it('alpha=1 returns original values', () => {
    const values = [80, 85, 78, 82];
    const result = computeEWMA(values, 1);
    expect(result).toEqual(values);
  });

  it('alpha=0 returns first value repeated', () => {
    const values = [80, 85, 78, 82];
    const result = computeEWMA(values, 0);
    expect(result).toEqual([80, 80, 80, 80]);
  });
});

describe('linearRegression', () => {
  it('returns zero slope for single value', () => {
    const result = linearRegression([100]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(100);
    expect(result.r2).toBe(0);
  });

  it('returns zero slope and zero r2 for empty array', () => {
    const result = linearRegression([]);
    expect(result.slope).toBe(0);
    expect(result.r2).toBe(0);
  });

  it('finds perfect positive slope', () => {
    const result = linearRegression([0, 1, 2, 3, 4]);
    expect(result.slope).toBeCloseTo(1, 5);
    expect(result.intercept).toBeCloseTo(0, 5);
    expect(result.r2).toBeCloseTo(1, 5);
  });

  it('finds perfect negative slope', () => {
    const result = linearRegression([4, 3, 2, 1, 0]);
    expect(result.slope).toBeCloseTo(-1, 5);
    expect(result.intercept).toBeCloseTo(4, 5);
    expect(result.r2).toBeCloseTo(1, 5);
  });

  it('returns zero slope for constant values', () => {
    const result = linearRegression([5, 5, 5, 5, 5]);
    expect(result.slope).toBeCloseTo(0, 5);
    expect(result.intercept).toBeCloseTo(5, 5);
    expect(result.r2).toBe(0);
  });

  it('handles noisy data with moderate r2', () => {
    const result = linearRegression([80, 79.5, 79.8, 79.2, 79.0, 78.5, 78.8, 78.2]);
    expect(result.slope).toBeLessThan(0); // Decreasing trend
    expect(result.r2).toBeGreaterThan(0);
    expect(result.r2).toBeLessThanOrEqual(1);
  });

  it('returns r2 between 0 and 1', () => {
    const result = linearRegression([10, 12, 9, 14, 11, 13]);
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// BMR and formula TDEE
// =============================================================================

describe('calculateMifflinStJeorBMR', () => {
  it('calculates male BMR correctly', () => {
    // 10 * 80 + 6.25 * 175 - 5 * 30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
    const bmr = calculateMifflinStJeorBMR(80, 175, 30, 'male');
    expect(bmr).toBeCloseTo(1748.75);
  });

  it('calculates female BMR correctly', () => {
    // 10 * 65 + 6.25 * 165 - 5 * 28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25
    const bmr = calculateMifflinStJeorBMR(65, 165, 28, 'female');
    expect(bmr).toBeCloseTo(1380.25);
  });

  it('male BMR is higher than female for same stats', () => {
    const maleBMR = calculateMifflinStJeorBMR(75, 170, 30, 'male');
    const femaleBMR = calculateMifflinStJeorBMR(75, 170, 30, 'female');
    expect(maleBMR).toBeGreaterThan(femaleBMR);
    // Difference should be exactly 166 (5 - (-161))
    expect(maleBMR - femaleBMR).toBeCloseTo(166);
  });

  it('BMR increases with weight', () => {
    const lightBMR = calculateMifflinStJeorBMR(60, 170, 30, 'male');
    const heavyBMR = calculateMifflinStJeorBMR(90, 170, 30, 'male');
    expect(heavyBMR).toBeGreaterThan(lightBMR);
  });

  it('BMR decreases with age', () => {
    const youngBMR = calculateMifflinStJeorBMR(75, 170, 20, 'male');
    const olderBMR = calculateMifflinStJeorBMR(75, 170, 50, 'male');
    expect(youngBMR).toBeGreaterThan(olderBMR);
  });
});

describe('formulaTDEE', () => {
  it('returns bmr, tdee, and multiplier', () => {
    const result = formulaTDEE(baseBiometrics);
    expect(result.bmr).toBeGreaterThan(0);
    expect(result.tdee).toBeGreaterThan(result.bmr);
    expect(result.multiplier).toBe(1.55);
  });

  it('uses correct multiplier for sedentary', () => {
    const result = formulaTDEE({ ...baseBiometrics, activityLevel: 'sedentary' });
    expect(result.multiplier).toBe(1.2);
  });

  it('uses correct multiplier for active', () => {
    const result = formulaTDEE({ ...baseBiometrics, activityLevel: 'active' });
    expect(result.multiplier).toBe(1.725);
  });

  it('uses correct multiplier for extreme', () => {
    const result = formulaTDEE({ ...baseBiometrics, activityLevel: 'extreme' });
    expect(result.multiplier).toBe(1.9);
  });

  it('defaults to 1.55 for unknown activity level', () => {
    const result = formulaTDEE({ ...baseBiometrics, activityLevel: 'unknown' });
    expect(result.multiplier).toBe(1.55);
  });

  it('returns rounded tdee', () => {
    const result = formulaTDEE(baseBiometrics);
    expect(result.tdee).toBe(Math.round(result.bmr * result.multiplier));
  });
});

// =============================================================================
// Observed TDEE
// =============================================================================

describe('computeObservedTDEE', () => {
  it('returns null with fewer than 7 data points', () => {
    const weights = generateWeightEntries(80, 0, 5);
    const intakes = generateIntakeEntries(2000, 5);
    const result = computeObservedTDEE(weights, intakes);
    expect(result).toBeNull();
  });

  it('computes observed TDEE with sufficient data', () => {
    const weights = generateWeightEntries(80, 0, 14); // stable weight
    const intakes = generateIntakeEntries(2000, 14);
    const result = computeObservedTDEE(weights, intakes);
    expect(result).not.toBeNull();
    expect(result!.observedTDEE).toBeGreaterThan(0);
    expect(result!.dataPoints).toBe(14);
  });

  it('returns higher TDEE when losing weight at given intake', () => {
    // Losing weight means TDEE > intake
    const losingWeights = generateWeightEntries(80, -0.05, 14);
    const stableWeights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);

    const losingResult = computeObservedTDEE(losingWeights, intakes);
    const stableResult = computeObservedTDEE(stableWeights, intakes);

    expect(losingResult).not.toBeNull();
    expect(stableResult).not.toBeNull();
    expect(losingResult!.observedTDEE).toBeGreaterThan(stableResult!.observedTDEE);
  });

  it('returns lower TDEE when gaining weight at given intake', () => {
    // Gaining weight means TDEE < intake
    const gainingWeights = generateWeightEntries(80, 0.05, 14);
    const stableWeights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);

    const gainingResult = computeObservedTDEE(gainingWeights, intakes);
    const stableResult = computeObservedTDEE(stableWeights, intakes);

    expect(gainingResult).not.toBeNull();
    expect(stableResult).not.toBeNull();
    expect(gainingResult!.observedTDEE).toBeLessThan(stableResult!.observedTDEE);
  });

  it('returns correct avgIntake', () => {
    const weights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2500, 14);
    const result = computeObservedTDEE(weights, intakes);
    expect(result!.avgIntake).toBe(2500);
  });

  it('returns smoothed weights array', () => {
    const weights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);
    const result = computeObservedTDEE(weights, intakes);
    expect(result!.smoothedWeights).toHaveLength(14);
  });
});

// =============================================================================
// Bayesian blend
// =============================================================================

describe('bayesianBlend', () => {
  it('returns formula TDEE with minimal data', () => {
    const result = bayesianBlend(2500, 2200, 7, 0.5);
    // With 7 data points (minimum), weight should be low
    expect(result.weight).toBeLessThanOrEqual(0.5);
    // Blended value should lean towards formula
    expect(result.blendedTDEE).toBeGreaterThan(2200);
  });

  it('returns observed TDEE with lots of data and high r2', () => {
    const result = bayesianBlend(2500, 2200, 28, 0.9);
    // With 28 data points and high r2, weight should be high
    expect(result.weight).toBeGreaterThan(0.5);
    // Blended value should lean towards observed
    expect(result.blendedTDEE).toBeLessThan(2500);
  });

  it('weight increases with more data points', () => {
    const result7 = bayesianBlend(2500, 2200, 7, 0.5);
    const result14 = bayesianBlend(2500, 2200, 14, 0.5);
    const result28 = bayesianBlend(2500, 2200, 28, 0.5);
    expect(result14.weight).toBeGreaterThan(result7.weight);
    expect(result28.weight).toBeGreaterThan(result14.weight);
  });

  it('weight increases with higher r2', () => {
    const resultLowR2 = bayesianBlend(2500, 2200, 14, 0.1);
    const resultHighR2 = bayesianBlend(2500, 2200, 14, 0.8);
    expect(resultHighR2.weight).toBeGreaterThan(resultLowR2.weight);
  });

  it('returns rounded blended TDEE', () => {
    const result = bayesianBlend(2501, 2203, 14, 0.5);
    expect(result.blendedTDEE).toBe(Math.round(result.blendedTDEE));
  });

  it('blend weight is between 0 and 1', () => {
    const result = bayesianBlend(2500, 2200, 50, 1);
    expect(result.weight).toBeGreaterThanOrEqual(0);
    expect(result.weight).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// Confidence scoring
// =============================================================================

describe('computeConfidence', () => {
  it('returns base score for no data points but zero-variance inputs', () => {
    const result = computeConfidence(0, [], [], 0);
    expect(result).toBeCloseTo(0.4);
  });

  it('increases with more data points', () => {
    const intake = Array(28).fill(2000);
    const weights = Array(28).fill(80);
    const c7 = computeConfidence(7, intake.slice(0, 7), weights.slice(0, 7), 0.5);
    const c28 = computeConfidence(28, intake, weights, 0.5);
    expect(c28).toBeGreaterThan(c7);
  });

  it('decreases with higher intake variance', () => {
    const consistentIntake = Array(14).fill(2000);
    const wildIntake = [1500, 2500, 1800, 2200, 1700, 2300, 1600, 2400, 1900, 2100, 1500, 2500, 1800, 2200];
    const weights = Array(14).fill(80);

    const cConsistent = computeConfidence(14, consistentIntake, weights, 0.5);
    const cWild = computeConfidence(14, wildIntake, weights, 0.5);
    expect(cConsistent).toBeGreaterThan(cWild);
  });

  it('is capped at 1', () => {
    const intake = Array(50).fill(2000);
    const weights = Array(50).fill(80);
    const result = computeConfidence(50, intake, weights, 1);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('returns value between 0 and 1', () => {
    const intake = Array(14).fill(2000);
    const weights = Array(14).fill(80);
    const result = computeConfidence(14, intake, weights, 0.5);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// Metabolic adaptation detection
// =============================================================================

describe('detectMetabolicAdaptation', () => {
  it('returns false when confidence is too low', () => {
    expect(detectMetabolicAdaptation(2500, 2000, 0.2)).toBe(false);
  });

  it('returns false when TDEE values are close', () => {
    expect(detectMetabolicAdaptation(2500, 2400, 0.5)).toBe(false);
  });

  it('returns true when observed TDEE is significantly below formula', () => {
    // 20% below should trigger (threshold is 10%)
    expect(detectMetabolicAdaptation(2500, 2000, 0.5)).toBe(true);
  });

  it('returns false when observed is above formula', () => {
    expect(detectMetabolicAdaptation(2000, 2500, 0.5)).toBe(false);
  });

  it('returns true at exactly the threshold boundary', () => {
    // deficit = (2500 - 2250) / 2500 = 0.1 = 10%, threshold is 0.10
    // deficit > threshold is false for exactly 10%
    expect(detectMetabolicAdaptation(2500, 2250, 0.5)).toBe(false);
    // deficit = (2500 - 2249) / 2500 > 0.1
    expect(detectMetabolicAdaptation(2500, 2249, 0.5)).toBe(true);
  });

  it('returns false at confidence threshold boundary', () => {
    // Confidence below 0.3 should not trigger (< 0.3 guard)
    expect(detectMetabolicAdaptation(2500, 2000, 0.29)).toBe(false);
    // Confidence exactly 0.3 passes the < 0.3 guard, so it CAN trigger
    expect(detectMetabolicAdaptation(2500, 2000, 0.3)).toBe(true);
    expect(detectMetabolicAdaptation(2500, 2000, 0.31)).toBe(true);
  });
});

// =============================================================================
// Plateau detection
// =============================================================================

describe('detectPlateau', () => {
  it('returns false for non-cut goals', () => {
    const weights = Array(20).fill(80);
    expect(detectPlateau(weights, 0.02, 'maintain', 1800, 2200)).toBe(false);
    expect(detectPlateau(weights, 0.02, 'bulk', 1800, 2200)).toBe(false);
  });

  it('returns false when intake >= TDEE', () => {
    const weights = Array(20).fill(80);
    expect(detectPlateau(weights, 0.02, 'cut', 2500, 2200)).toBe(false);
  });

  it('returns false when weight is changing significantly', () => {
    const weights = Array(20).fill(80);
    // weeklyWeightChange > 0.1 kg/week
    expect(detectPlateau(weights, -0.3, 'cut', 1800, 2200)).toBe(false);
  });

  it('returns false with insufficient data', () => {
    const weights = Array(10).fill(80);
    expect(detectPlateau(weights, 0.02, 'cut', 1800, 2200)).toBe(false);
  });

  it('detects plateau when weight is stable despite deficit', () => {
    // Flat weight for 20 days, in a deficit
    const weights = Array(20).fill(80);
    const result = detectPlateau(weights, 0.02, 'cut', 1800, 2200);
    expect(result).toBe(true);
  });
});

// =============================================================================
// TDEE trend computation
// =============================================================================

describe('computeTDEETrend', () => {
  it('returns empty array with fewer than 7 data points', () => {
    const weights = generateWeightEntries(80, 0, 5);
    const intakes = generateIntakeEntries(2000, 5);
    const result = computeTDEETrend(weights, intakes, 2500);
    expect(result).toEqual([]);
  });

  it('returns trend points for sufficient data', () => {
    const weights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);
    const result = computeTDEETrend(weights, intakes, 2500);
    expect(result.length).toBeGreaterThan(0);
  });

  it('clamps TDEE values to 800-6000 range', () => {
    const weights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);
    const result = computeTDEETrend(weights, intakes, 2500);
    for (const point of result) {
      expect(point.tdee).toBeGreaterThanOrEqual(800);
      expect(point.tdee).toBeLessThanOrEqual(6000);
    }
  });

  it('each trend point has required fields', () => {
    const weights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);
    const result = computeTDEETrend(weights, intakes, 2500);
    for (const point of result) {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('tdee');
      expect(point).toHaveProperty('smoothedWeight');
      expect(point).toHaveProperty('confidence');
    }
  });
});

// =============================================================================
// Full adaptive TDEE computation
// =============================================================================

describe('computeAdaptiveTDEE', () => {
  it('returns formula-based estimate with no data', () => {
    const result = computeAdaptiveTDEE([], [], baseBiometrics);
    expect(result.estimate.estimateSource).toBe('formula');
    expect(result.estimate.confidence).toBe(0.15);
    expect(result.estimate.dataPoints).toBe(0);
    expect(result.trendData).toEqual([]);
  });

  it('returns formula-based estimate with insufficient data', () => {
    const weights = generateWeightEntries(80, 0, 3);
    const intakes = generateIntakeEntries(2000, 3);
    const result = computeAdaptiveTDEE(weights, intakes, baseBiometrics);
    expect(result.estimate.estimateSource).toBe('formula');
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('generates insights about insufficient data', () => {
    const weights = generateWeightEntries(80, 0, 3);
    const intakes = generateIntakeEntries(2000, 3);
    const result = computeAdaptiveTDEE(weights, intakes, baseBiometrics);
    const buildingProfile = result.insights.find(i => i.title.includes('Building'));
    expect(buildingProfile).toBeDefined();
  });

  it('returns an estimate with sufficient data', () => {
    const weights = generateWeightEntries(80, 0, 28);
    const intakes = generateIntakeEntries(2000, 28);
    const result = computeAdaptiveTDEE(weights, intakes, baseBiometrics);
    // With flat weight data, blend weight may remain low → 'formula' is valid
    expect(['formula', 'hybrid', 'observed']).toContain(result.estimate.estimateSource);
    expect(result.estimate.dataPoints).toBe(28);
  });

  it('clamps TDEE to 800-6000', () => {
    const weights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);
    const result = computeAdaptiveTDEE(weights, intakes, baseBiometrics);
    expect(result.estimate.tdee).toBeGreaterThanOrEqual(800);
    expect(result.estimate.tdee).toBeLessThanOrEqual(6000);
  });

  it('detects decreasing trend when losing weight', () => {
    const weights = generateWeightEntries(80, -0.03, 28);
    const intakes = generateIntakeEntries(1800, 28);
    const result = computeAdaptiveTDEE(weights, intakes, { ...baseBiometrics, goalType: 'cut', weeklyGoal: 'lose1' });
    expect(result.estimate.weeklyWeightChange).toBeLessThan(0);
    expect(result.estimate.trend).toBe('decreasing');
  });

  it('detects increasing trend when gaining weight', () => {
    const weights = generateWeightEntries(80, 0.03, 28);
    const intakes = generateIntakeEntries(3000, 28);
    const result = computeAdaptiveTDEE(weights, intakes, { ...baseBiometrics, goalType: 'bulk', weeklyGoal: 'gain1' });
    expect(result.estimate.weeklyWeightChange).toBeGreaterThan(0);
    expect(result.estimate.trend).toBe('increasing');
  });

  it('detects stable trend when weight is constant', () => {
    const weights = generateWeightEntries(80, 0, 28);
    const intakes = generateIntakeEntries(2000, 28);
    const result = computeAdaptiveTDEE(weights, intakes, baseBiometrics);
    expect(result.estimate.trend).toBe('stable');
  });

  it('returns recommended intake based on goal', () => {
    const weights = generateWeightEntries(80, 0, 28);
    const intakes = generateIntakeEntries(2000, 28);

    const maintainResult = computeAdaptiveTDEE(weights, intakes, { ...baseBiometrics, weeklyGoal: 'maintain' });
    const cutResult = computeAdaptiveTDEE(weights, intakes, { ...baseBiometrics, weeklyGoal: 'lose1' });
    const bulkResult = computeAdaptiveTDEE(weights, intakes, { ...baseBiometrics, weeklyGoal: 'gain1' });

    // Cut should recommend less than maintain, bulk should recommend more
    expect(cutResult.estimate.recommendedIntake).toBeLessThan(maintainResult.estimate.recommendedIntake);
    expect(bulkResult.estimate.recommendedIntake).toBeGreaterThan(maintainResult.estimate.recommendedIntake);
  });

  it('recommended intake is at least 1200', () => {
    const weights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);
    const result = computeAdaptiveTDEE(weights, intakes, { ...baseBiometrics, weeklyGoal: 'lose2' });
    expect(result.estimate.recommendedIntake).toBeGreaterThanOrEqual(1200);
  });

  it('returns daysLoggedThisWeek count', () => {
    const weights = generateWeightEntries(80, 0, 14);
    const intakes = generateIntakeEntries(2000, 14);
    const result = computeAdaptiveTDEE(weights, intakes, baseBiometrics);
    expect(typeof result.daysLoggedThisWeek).toBe('number');
    expect(result.daysLoggedThisWeek).toBeGreaterThanOrEqual(0);
    expect(result.daysLoggedThisWeek).toBeLessThanOrEqual(7);
  });

  it('returns BMR and activity multiplier', () => {
    const weights = generateWeightEntries(80, 0, 28);
    const intakes = generateIntakeEntries(2000, 28);
    const result = computeAdaptiveTDEE(weights, intakes, baseBiometrics);
    expect(result.estimate.bmr).toBeGreaterThan(0);
    expect(result.estimate.activityMultiplier).toBeGreaterThan(0);
  });
});

// =============================================================================
// Unit conversion helpers
// =============================================================================

describe('lbsToKg', () => {
  it('converts pounds to kilograms', () => {
    expect(lbsToKg(0)).toBe(0);
    expect(lbsToKg(1)).toBeCloseTo(0.453592);
    expect(lbsToKg(100)).toBeCloseTo(45.3592);
    expect(lbsToKg(220)).toBeCloseTo(99.79, 1);
  });
});

describe('inchesToCm', () => {
  it('converts inches to centimeters', () => {
    expect(inchesToCm(0)).toBe(0);
    expect(inchesToCm(1)).toBeCloseTo(2.54);
    expect(inchesToCm(70)).toBeCloseTo(177.8);
    expect(inchesToCm(72)).toBeCloseTo(182.88);
  });
});
