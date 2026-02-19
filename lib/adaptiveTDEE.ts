/**
 * Adaptive TDEE Engine
 *
 * A real statistical algorithm that rivals MacroFactor's adaptive TDEE.
 *
 * Core approach:
 * 1. EWMA smoothing of daily weigh-ins to remove noise (water, sodium, etc.)
 * 2. Linear regression on 14-day windows for rate-of-change
 * 3. Energy balance equation: TDEE = avg_intake - (weight_change_rate * 7700 / 7)
 *    (7700 kcal per kg of body weight change)
 * 4. Bayesian updating: blend formula-based prior with observed posterior
 * 5. Confidence scoring based on data density and variance
 * 6. Metabolic adaptation detection (TDEE dropping faster than expected)
 * 7. Activity factor decomposition (BMR vs activity multiplier)
 * 8. Plateau detection (stalled weight despite caloric deficit)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TDEEEstimate {
  tdee: number;
  bmr: number;
  activityMultiplier: number;
  confidence: number; // 0-1
  dataPoints: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  metabolicAdaptation: boolean;
  plateauDetected: boolean;
  weeklyWeightChange: number; // kg per week
  recommendedIntake: number;
  estimateSource: 'formula' | 'hybrid' | 'observed';
}

export interface DailyWeightEntry {
  date: string; // YYYY-MM-DD
  weight: number; // kg
}

export interface DailyIntakeEntry {
  date: string; // YYYY-MM-DD
  calories: number;
}

export interface UserBiometrics {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: string;
  goalType: 'cut' | 'maintain' | 'bulk';
  weeklyGoal: string; // e.g., 'lose1', 'maintain', 'gain05'
}

export interface TDEETrendPoint {
  date: string;
  tdee: number;
  smoothedWeight: number;
  confidence: number;
}

export interface AdaptiveTDEEResult {
  estimate: TDEEEstimate;
  trendData: TDEETrendPoint[];
  daysLoggedThisWeek: number;
  totalDaysWithData: number;
  insights: TDEEInsight[];
}

export interface TDEEInsight {
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Calories per kg of body mass change (approximate; mix of fat + lean) */
const KCAL_PER_KG = 7700;

/** EWMA smoothing factor for daily weight. Lower = more smoothing. */
const WEIGHT_EWMA_ALPHA = 0.15;

/** Regression window in days for weight trend */
const REGRESSION_WINDOW = 14;

/** Minimum data points before we start trusting observed data */
const MIN_DATA_POINTS_HYBRID = 7;

/** Data points needed for full observed-mode confidence */
const FULL_CONFIDENCE_DATA_POINTS = 28;

/** Metabolic adaptation threshold: if observed TDEE is this fraction below
 *  predicted, flag adaptation. E.g. 0.10 = 10% below expected. */
const METABOLIC_ADAPTATION_THRESHOLD = 0.10;

/** Plateau threshold: weight change < this kg/week for 2+ weeks = plateau */
const PLATEAU_THRESHOLD_KG_PER_WEEK = 0.1;

/** Plateau requires at least this many days of stable weight */
const PLATEAU_MIN_DAYS = 14;

/** Activity multipliers mirroring ProfileContext */
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  extreme: 1.9,
};

// ---------------------------------------------------------------------------
// Statistical utilities
// ---------------------------------------------------------------------------

/**
 * Compute exponentially-weighted moving average of a time series.
 * Returns an array of the same length. The first value is the raw value.
 */
export function computeEWMA(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * Simple ordinary-least-squares linear regression.
 * Returns { slope, intercept, r2 }.
 * x values are just indices 0..n-1 (representing days).
 */
export function linearRegression(y: number[]): { slope: number; intercept: number; r2: number } {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] || 0, r2: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += y[i];
    sumXY += i * y[i];
    sumX2 += i * i;
    sumY2 += y[i] * y[i];
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssTot += (y[i] - yMean) ** 2;
    ssRes += (y[i] - predicted) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2 };
}

/**
 * Compute standard deviation of an array.
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Core: Mifflin-St Jeor BMR (formula-based prior)
// ---------------------------------------------------------------------------

/**
 * Calculate BMR using Mifflin-St Jeor.
 * @param weightKg  body weight in kg
 * @param heightCm  height in cm
 * @param age       age in years
 * @param gender    'male' | 'female'
 */
export function calculateMifflinStJeorBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female',
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * Formula-based TDEE = BMR * activity multiplier.
 */
export function formulaTDEE(biometrics: UserBiometrics): { bmr: number; tdee: number; multiplier: number } {
  const bmr = calculateMifflinStJeorBMR(
    biometrics.weightKg,
    biometrics.heightCm,
    biometrics.age,
    biometrics.gender,
  );
  const multiplier = ACTIVITY_MULTIPLIERS[biometrics.activityLevel] || 1.55;
  return { bmr, tdee: Math.round(bmr * multiplier), multiplier };
}

// ---------------------------------------------------------------------------
// Core: Observed TDEE from intake + weight change
// ---------------------------------------------------------------------------

/**
 * Merge weight and intake data into a day-aligned dataset.
 * Missing days are dropped (we only compute on days we have both).
 */
function buildAlignedDataset(
  weights: DailyWeightEntry[],
  intakes: DailyIntakeEntry[],
): { dates: string[]; weights: number[]; intakes: number[] } {
  // Create maps
  const weightMap = new Map<string, number>();
  const intakeMap = new Map<string, number>();

  for (const w of weights) weightMap.set(w.date, w.weight);
  for (const i of intakes) intakeMap.set(i.date, i.calories);

  // Collect all dates that have BOTH weight and intake
  const allDates = new Set<string>([...weightMap.keys(), ...intakeMap.keys()]);
  const sortedDates = [...allDates].sort();

  const dates: string[] = [];
  const ws: number[] = [];
  const is: number[] = [];

  for (const d of sortedDates) {
    // We need weight data (intake can be missing for some calculations,
    // but for TDEE we need calorie intake).
    if (weightMap.has(d) && intakeMap.has(d)) {
      dates.push(d);
      ws.push(weightMap.get(d)!);
      is.push(intakeMap.get(d)!);
    }
  }

  return { dates, weights: ws, intakes: is };
}

/**
 * Compute observed TDEE from weight + intake data using energy balance.
 *
 * TDEE = average_daily_intake - (daily_weight_change_kg * KCAL_PER_KG)
 *
 * We use EWMA-smoothed weight and linear regression over windows.
 */
export function computeObservedTDEE(
  weightEntries: DailyWeightEntry[],
  intakeEntries: DailyIntakeEntry[],
): {
  observedTDEE: number;
  weeklyWeightChangeKg: number;
  smoothedWeights: number[];
  dates: string[];
  avgIntake: number;
  dataPoints: number;
  r2: number;
} | null {
  const { dates, weights, intakes } = buildAlignedDataset(weightEntries, intakeEntries);

  if (dates.length < MIN_DATA_POINTS_HYBRID) return null;

  // 1. EWMA-smooth the weight data
  const smoothed = computeEWMA(weights, WEIGHT_EWMA_ALPHA);

  // 2. Take the most recent REGRESSION_WINDOW days (or all if fewer)
  const windowSize = Math.min(REGRESSION_WINDOW, smoothed.length);
  const recentSmoothed = smoothed.slice(-windowSize);
  const recentIntakes = intakes.slice(-windowSize);

  // 3. Linear regression on smoothed weight to get daily rate of change (kg/day)
  const reg = linearRegression(recentSmoothed);
  const dailyWeightChangeKg = reg.slope; // kg per day
  const weeklyWeightChangeKg = dailyWeightChangeKg * 7;

  // 4. Average daily caloric intake over the window
  const avgIntake = recentIntakes.reduce((s, v) => s + v, 0) / recentIntakes.length;

  // 5. Energy balance equation
  //    TDEE = avg_intake - (daily_weight_change_kg * KCAL_PER_KG)
  //    If gaining weight, daily change is positive, so TDEE < intake (correct).
  //    If losing weight, daily change is negative, so TDEE > intake (correct).
  const observedTDEE = avgIntake - dailyWeightChangeKg * KCAL_PER_KG;

  return {
    observedTDEE: Math.round(observedTDEE),
    weeklyWeightChangeKg,
    smoothedWeights: smoothed,
    dates,
    avgIntake: Math.round(avgIntake),
    dataPoints: dates.length,
    r2: reg.r2,
  };
}

// ---------------------------------------------------------------------------
// Core: Bayesian blending (formula prior + observed posterior)
// ---------------------------------------------------------------------------

/**
 * Bayesian-style blending of formula-based and observed TDEE.
 *
 * confidenceInObserved ramps from 0 (at MIN_DATA_POINTS_HYBRID days) to 1
 * (at FULL_CONFIDENCE_DATA_POINTS days), weighted by R-squared of the
 * regression fit.
 *
 * blendedTDEE = (1 - w) * formulaTDEE + w * observedTDEE
 */
export function bayesianBlend(
  formulaTdee: number,
  observedTdee: number,
  dataPoints: number,
  r2: number,
): { blendedTDEE: number; weight: number } {
  // Base weight ramps linearly with data density
  const dataWeight = Math.min(
    1,
    Math.max(0, (dataPoints - MIN_DATA_POINTS_HYBRID) / (FULL_CONFIDENCE_DATA_POINTS - MIN_DATA_POINTS_HYBRID)),
  );

  // R2 modulates confidence: noisy data gets less trust
  // r2 of 0.5+ is decent for body weight regressions
  const r2Factor = Math.min(1, Math.max(0.1, r2 * 2));

  const w = dataWeight * r2Factor;

  const blendedTDEE = Math.round((1 - w) * formulaTdee + w * observedTdee);

  return { blendedTDEE, weight: w };
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

/**
 * Compute a 0-1 confidence score for the TDEE estimate.
 *
 * Factors:
 *  - Data density: more days = higher confidence
 *  - Intake variance: wildly varying intake = lower confidence
 *  - Weight variance: noisy weight = lower confidence
 *  - Regression fit: higher R2 = higher confidence
 */
export function computeConfidence(
  dataPoints: number,
  intakeValues: number[],
  weightValues: number[],
  r2: number,
): number {
  // 1. Density score (0-0.4)
  const densityScore = Math.min(0.4, 0.4 * (dataPoints / FULL_CONFIDENCE_DATA_POINTS));

  // 2. Intake consistency score (0-0.2)
  //    CV (coefficient of variation) < 0.15 is good, > 0.4 is poor
  const intakeSD = standardDeviation(intakeValues);
  const intakeMean = intakeValues.length > 0
    ? intakeValues.reduce((s, v) => s + v, 0) / intakeValues.length
    : 1;
  const intakeCV = intakeMean > 0 ? intakeSD / intakeMean : 1;
  const intakeScore = Math.max(0, 0.2 * (1 - Math.min(1, intakeCV / 0.4)));

  // 3. Weight consistency score (0-0.2)
  //    Weight CV < 0.01 is normal, > 0.05 is very noisy
  const weightSD = standardDeviation(weightValues);
  const weightMean = weightValues.length > 0
    ? weightValues.reduce((s, v) => s + v, 0) / weightValues.length
    : 1;
  const weightCV = weightMean > 0 ? weightSD / weightMean : 1;
  const weightScore = Math.max(0, 0.2 * (1 - Math.min(1, weightCV / 0.05)));

  // 4. Regression fit score (0-0.2)
  const r2Score = 0.2 * Math.min(1, r2);

  return Math.min(1, densityScore + intakeScore + weightScore + r2Score);
}

// ---------------------------------------------------------------------------
// Metabolic adaptation detection
// ---------------------------------------------------------------------------

/**
 * Detect metabolic adaptation: observed TDEE significantly below the
 * formula prediction for the current body weight.
 *
 * During a diet, BMR naturally decreases with weight loss. But if the
 * observed TDEE drops faster than the formula predicts (accounting for
 * lower body weight), that signals adaptive thermogenesis.
 */
export function detectMetabolicAdaptation(
  formulaTdee: number,
  observedTdee: number,
  confidence: number,
): boolean {
  // Only flag if we have reasonable confidence
  if (confidence < 0.3) return false;

  const deficit = (formulaTdee - observedTdee) / formulaTdee;
  return deficit > METABOLIC_ADAPTATION_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Plateau detection
// ---------------------------------------------------------------------------

/**
 * Detect a weight loss plateau: weight is stable or increasing despite
 * an expected caloric deficit.
 *
 * Conditions:
 * 1. User is in a cut (deficit goal)
 * 2. Weekly weight change is within PLATEAU_THRESHOLD of zero
 * 3. This has persisted for at least PLATEAU_MIN_DAYS
 * 4. Average intake is below estimated TDEE (they think they're in deficit)
 */
export function detectPlateau(
  smoothedWeights: number[],
  weeklyWeightChangeKg: number,
  goalType: 'cut' | 'maintain' | 'bulk',
  avgIntake: number,
  estimatedTdee: number,
): boolean {
  // Only relevant for cut goals
  if (goalType !== 'cut') return false;

  // Check if intake is below TDEE (user believes they're in deficit)
  if (avgIntake >= estimatedTdee) return false;

  // Check if weight is stable
  if (Math.abs(weeklyWeightChangeKg) > PLATEAU_THRESHOLD_KG_PER_WEEK) return false;

  // Check duration: we need enough data points and stability
  if (smoothedWeights.length < PLATEAU_MIN_DAYS) return false;

  // Check last 14 days of smoothed weight for flatness
  const last14 = smoothedWeights.slice(-PLATEAU_MIN_DAYS);
  const reg = linearRegression(last14);

  // Slope should be very small (near zero or slightly positive despite deficit)
  const dailyChange = Math.abs(reg.slope);
  return dailyChange < PLATEAU_THRESHOLD_KG_PER_WEEK / 7;
}

// ---------------------------------------------------------------------------
// TDEE trend calculation
// ---------------------------------------------------------------------------

/**
 * Calculate rolling TDEE estimates for trend chart data.
 * Uses a 7-day rolling window sliding across the dataset.
 */
export function computeTDEETrend(
  weightEntries: DailyWeightEntry[],
  intakeEntries: DailyIntakeEntry[],
  formulaTdee: number,
): TDEETrendPoint[] {
  const { dates, weights, intakes } = buildAlignedDataset(weightEntries, intakeEntries);
  if (dates.length < 7) return [];

  const smoothed = computeEWMA(weights, WEIGHT_EWMA_ALPHA);
  const trendPoints: TDEETrendPoint[] = [];

  const windowSize = 7;

  for (let i = windowSize; i <= dates.length; i++) {
    const windowSmoothed = smoothed.slice(i - windowSize, i);
    const windowIntakes = intakes.slice(i - windowSize, i);

    const reg = linearRegression(windowSmoothed);
    const dailyWeightChange = reg.slope;
    const avgIntake = windowIntakes.reduce((s, v) => s + v, 0) / windowIntakes.length;
    const rollingTDEE = avgIntake - dailyWeightChange * KCAL_PER_KG;

    // Bayesian blend for each window
    const dataUpToNow = i;
    const { blendedTDEE, weight } = bayesianBlend(formulaTdee, Math.round(rollingTDEE), dataUpToNow, reg.r2);

    trendPoints.push({
      date: dates[i - 1],
      tdee: Math.max(800, Math.min(6000, blendedTDEE)), // Sanity clamp
      smoothedWeight: smoothed[i - 1],
      confidence: weight,
    });
  }

  return trendPoints;
}

// ---------------------------------------------------------------------------
// Main entry point: compute full adaptive TDEE
// ---------------------------------------------------------------------------

/**
 * Compute the full adaptive TDEE estimate.
 *
 * @param weightEntries   Array of daily weight entries (kg)
 * @param intakeEntries   Array of daily calorie intake entries
 * @param biometrics      User biometric data for formula-based prior
 * @returns Full result including estimate, trend data, and insights
 */
export function computeAdaptiveTDEE(
  weightEntries: DailyWeightEntry[],
  intakeEntries: DailyIntakeEntry[],
  biometrics: UserBiometrics,
): AdaptiveTDEEResult {
  const insights: TDEEInsight[] = [];

  // 1. Formula-based prior
  const formula = formulaTDEE(biometrics);

  // Count days with data this week
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday start
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const daysLoggedThisWeek = intakeEntries.filter(e => e.date >= weekStartStr).length;

  // 2. Try to compute observed TDEE
  const observed = computeObservedTDEE(weightEntries, intakeEntries);

  // If not enough data, return formula-based estimate
  if (!observed) {
    const dataPoints = Math.min(weightEntries.length, intakeEntries.length);

    if (dataPoints > 0 && dataPoints < MIN_DATA_POINTS_HYBRID) {
      insights.push({
        type: 'info',
        title: 'Building your metabolic profile',
        message: `${MIN_DATA_POINTS_HYBRID - dataPoints} more days of logging needed for adaptive estimates. Keep tracking!`,
      });
    } else if (dataPoints === 0) {
      insights.push({
        type: 'info',
        title: 'Start logging to unlock adaptive TDEE',
        message: 'Log your food and weight daily to get a personalized metabolic estimate.',
      });
    }

    return {
      estimate: {
        tdee: formula.tdee,
        bmr: Math.round(formula.bmr),
        activityMultiplier: formula.multiplier,
        confidence: 0.15, // Low confidence for formula-only
        dataPoints: dataPoints,
        trend: 'stable',
        metabolicAdaptation: false,
        plateauDetected: false,
        weeklyWeightChange: 0,
        recommendedIntake: computeRecommendedIntake(formula.tdee, biometrics.weeklyGoal),
        estimateSource: 'formula',
      },
      trendData: [],
      daysLoggedThisWeek,
      totalDaysWithData: dataPoints,
      insights,
    };
  }

  // 3. Bayesian blend
  const { blendedTDEE, weight: blendWeight } = bayesianBlend(
    formula.tdee,
    observed.observedTDEE,
    observed.dataPoints,
    observed.r2,
  );

  // 4. Confidence scoring
  const { dates, weights: rawWeights, intakes: rawIntakes } = buildAlignedDataset(weightEntries, intakeEntries);
  const confidence = computeConfidence(
    observed.dataPoints,
    rawIntakes,
    rawWeights,
    observed.r2,
  );

  // 5. Determine estimate source
  let estimateSource: 'formula' | 'hybrid' | 'observed';
  if (blendWeight < 0.2) estimateSource = 'formula';
  else if (blendWeight > 0.8) estimateSource = 'observed';
  else estimateSource = 'hybrid';

  // 6. Decompose into BMR + activity
  //    Reverse-engineer activity multiplier: activityMultiplier = blendedTDEE / formula.bmr
  //    But use current weight's BMR (may differ from profile if weight changed)
  const currentWeightKg = observed.smoothedWeights[observed.smoothedWeights.length - 1] || biometrics.weightKg;
  const currentBMR = calculateMifflinStJeorBMR(
    currentWeightKg,
    biometrics.heightCm,
    biometrics.age,
    biometrics.gender,
  );
  const derivedMultiplier = currentBMR > 0 ? blendedTDEE / currentBMR : formula.multiplier;

  // 7. Metabolic adaptation check
  const metabolicAdaptation = detectMetabolicAdaptation(formula.tdee, blendedTDEE, confidence);
  if (metabolicAdaptation) {
    insights.push({
      type: 'warning',
      title: 'Metabolic adaptation detected',
      message: 'Your metabolism appears to be running below expected. Consider a diet break or reverse diet to restore metabolic rate.',
    });
  }

  // 8. Plateau detection
  const plateauDetected = detectPlateau(
    observed.smoothedWeights,
    observed.weeklyWeightChangeKg,
    biometrics.goalType,
    observed.avgIntake,
    blendedTDEE,
  );
  if (plateauDetected) {
    insights.push({
      type: 'alert',
      title: 'Weight loss plateau detected',
      message: 'Your weight has stalled despite being in a deficit. Consider adjusting your calorie target, increasing activity, or taking a planned diet break.',
    });
  }

  // 9. Determine trend
  let trend: 'increasing' | 'stable' | 'decreasing';
  if (observed.weeklyWeightChangeKg > 0.1) trend = 'increasing';
  else if (observed.weeklyWeightChangeKg < -0.1) trend = 'decreasing';
  else trend = 'stable';

  // 10. Trend chart data
  const trendData = computeTDEETrend(weightEntries, intakeEntries, formula.tdee);

  // 11. Recommended intake based on blended TDEE + goal
  const recommendedIntake = computeRecommendedIntake(blendedTDEE, biometrics.weeklyGoal);

  // 12. Add data quality insights
  if (daysLoggedThisWeek >= 6) {
    insights.push({
      type: 'success',
      title: 'Excellent tracking consistency',
      message: 'Your data quality is high, giving us the most accurate TDEE estimate possible.',
    });
  } else if (daysLoggedThisWeek >= 4) {
    insights.push({
      type: 'info',
      title: 'Good tracking this week',
      message: `You've logged ${daysLoggedThisWeek} days this week. Log daily for the most accurate results.`,
    });
  } else if (daysLoggedThisWeek > 0) {
    insights.push({
      type: 'warning',
      title: 'Inconsistent logging',
      message: `Only ${daysLoggedThisWeek} days logged this week. Gaps reduce accuracy of your TDEE estimate.`,
    });
  }

  // Clamp TDEE to sane range
  const clampedTDEE = Math.max(800, Math.min(6000, blendedTDEE));

  return {
    estimate: {
      tdee: clampedTDEE,
      bmr: Math.round(currentBMR),
      activityMultiplier: Math.round(derivedMultiplier * 100) / 100,
      confidence,
      dataPoints: observed.dataPoints,
      trend,
      metabolicAdaptation,
      plateauDetected,
      weeklyWeightChange: Math.round(observed.weeklyWeightChangeKg * 100) / 100,
      recommendedIntake,
      estimateSource,
    },
    trendData,
    daysLoggedThisWeek,
    totalDaysWithData: observed.dataPoints,
    insights,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute recommended daily intake from TDEE + weekly goal.
 * Maps weekly goal strings to calorie adjustments.
 */
function computeRecommendedIntake(tdee: number, weeklyGoal: string): number {
  const adjustments: Record<string, number> = {
    lose2: -1000,
    lose1: -500,
    lose05: -250,
    maintain: 0,
    gain05: 250,
    gain1: 500,
  };
  const adjustment = adjustments[weeklyGoal] || 0;
  return Math.max(1200, Math.round(tdee + adjustment));
}

/**
 * Convert lbs to kg.
 */
export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

/**
 * Convert inches to cm.
 */
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}
