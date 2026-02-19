/**
 * VibeFit Predictive Analytics Engine
 * Advanced algorithms for trend analysis, plateau detection,
 * body composition estimation, and personalized insights.
 */

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Calculate weighted moving average (recent data weighted more heavily)
 */
function weightedMovingAverage(data: number[], windowSize: number = 7): number[] {
  if (!data || data.length === 0) return [];
  const result: number[] = [];
  for (let i: number = 0; i < data.length; i++) {
    const start: number = Math.max(0, i - windowSize + 1);
    const window: number[] = data.slice(start, i + 1);
    let weightSum: number = 0;
    let valueSum: number = 0;
    window.forEach((val: number, idx: number) => {
      const weight: number = idx + 1;
      weightSum += weight;
      valueSum += val * weight;
    });
    result.push(Math.round((valueSum / weightSum) * 10) / 10);
  }
  return result;
}

interface TrendResult {
  direction: string;
  strength: number;
  slope: number;
  confidence: number;
  intercept?: number;
}

/**
 * Detect trend direction and strength
 */
function detectTrend(data: number[], minDataPoints: number = 7): TrendResult {
  if (!data || data.length < minDataPoints) {
    return { direction: 'insufficient_data', strength: 0, slope: 0, confidence: 0 };
  }

  // Linear regression
  const n: number = data.length;
  let sumX: number = 0, sumY: number = 0, sumXY: number = 0, sumX2: number = 0, sumY2: number = 0;
  data.forEach((y: number, x: number) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  });

  const slope: number = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept: number = (sumY - slope * sumX) / n;

  // R-squared for confidence
  const yMean: number = sumY / n;
  let ssRes: number = 0, ssTot: number = 0;
  data.forEach((y: number, x: number) => {
    const predicted: number = slope * x + intercept;
    ssRes += (y - predicted) ** 2;
    ssTot += (y - yMean) ** 2;
  });
  const rSquared: number = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

  const direction: string = Math.abs(slope) < 0.01 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing';
  const strength: number = Math.min(Math.abs(slope) * 10, 1);

  return { direction, strength, slope: Math.round(slope * 100) / 100, confidence: Math.round(rSquared * 100) / 100, intercept };
}

interface PredictionEntry {
  dayOffset: number;
  predicted: number;
  confidence: number;
}

/**
 * Predict future values based on trend
 */
function predictFuture(data: number[], daysAhead: number = 7): PredictionEntry[] {
  const trend: TrendResult = detectTrend(data);
  if (trend.direction === 'insufficient_data') return [];

  const n: number = data.length;
  return Array.from({ length: daysAhead }, (_: unknown, i: number) => ({
    dayOffset: i + 1,
    predicted: Math.round((trend.slope * (n + i) + (trend.intercept || 0)) * 10) / 10,
    confidence: Math.max(0, trend.confidence - (i * 0.05)),
  }));
}

// ============================================================================
// PLATEAU DETECTION
// ============================================================================

interface PlateauSuggestion {
  priority: string;
  action: string;
}

interface PlateauResult {
  isPlateaued: boolean;
  reason?: string;
  duration?: number;
  averageWeight?: number;
  range?: number;
  suggestions?: PlateauSuggestion[];
}

/**
 * Detect weight loss/gain plateaus
 */
function detectPlateau(weightData: number[], thresholdLbs: number = 1, windowDays: number = 14): PlateauResult {
  if (!weightData || weightData.length < windowDays) {
    return { isPlateaued: false, reason: 'insufficient_data' };
  }

  const recent: number[] = weightData.slice(-windowDays);
  const max: number = Math.max(...recent);
  const min: number = Math.min(...recent);
  const range: number = max - min;

  if (range <= thresholdLbs) {
    const avgWeight: number = recent.reduce((s: number, w: number) => s + w, 0) / recent.length;
    const daysSinceChange: number = windowDays;

    return {
      isPlateaued: true,
      duration: daysSinceChange,
      averageWeight: Math.round(avgWeight * 10) / 10,
      range: Math.round(range * 10) / 10,
      suggestions: generatePlateauSuggestions(avgWeight, daysSinceChange),
    };
  }

  return { isPlateaued: false, range: Math.round(range * 10) / 10 };
}

function generatePlateauSuggestions(weight: number, duration: number): PlateauSuggestion[] {
  const suggestions: PlateauSuggestion[] = [];
  if (duration >= 21) {
    suggestions.push({ priority: 'high', action: 'Consider a 1-2 day refeed at maintenance calories to reset metabolic adaptation' });
    suggestions.push({ priority: 'high', action: 'Try a 2-week reverse diet, adding 100 calories per week' });
  }
  if (duration >= 14) {
    suggestions.push({ priority: 'medium', action: 'Increase daily step count by 2,000 steps' });
    suggestions.push({ priority: 'medium', action: 'Add one extra day of resistance training' });
  }
  suggestions.push({ priority: 'low', action: 'Ensure sleep quality is 7-9 hours consistently' });
  suggestions.push({ priority: 'low', action: 'Track sodium and water intake - fluctuations may mask progress' });
  return suggestions;
}

// ============================================================================
// BODY COMPOSITION ESTIMATION
// ============================================================================

/**
 * Estimate body fat percentage using Navy method
 */
function estimateBodyFat(gender: string, waistInches: number, neckInches: number, heightInches: number, hipInches: number | null = null): number | null {
  if (!waistInches || !neckInches || !heightInches) return null;

  let bodyFat: number;
  if (gender === 'male') {
    bodyFat = 86.010 * Math.log10(waistInches - neckInches) - 70.041 * Math.log10(heightInches) + 36.76;
  } else {
    if (!hipInches) return null;
    bodyFat = 163.205 * Math.log10(waistInches + hipInches - neckInches) - 97.684 * Math.log10(heightInches) - 78.387;
  }

  return Math.max(3, Math.min(60, Math.round(bodyFat * 10) / 10));
}

interface CompositionResult {
  fatMass: number;
  leanMass: number;
  fatPercent: number;
  leanPercent: number;
}

/**
 * Estimate lean mass and fat mass
 */
function estimateComposition(weightLbs: number, bodyFatPercent: number): CompositionResult | null {
  if (!weightLbs || !bodyFatPercent) return null;
  const fatMass: number = Math.round((weightLbs * bodyFatPercent / 100) * 10) / 10;
  const leanMass: number = Math.round((weightLbs - fatMass) * 10) / 10;
  return { fatMass, leanMass, fatPercent: bodyFatPercent, leanPercent: Math.round((100 - bodyFatPercent) * 10) / 10 };
}

interface BodyFatCategory {
  max: number;
  label: string;
  color: string;
}

/**
 * Get body fat category
 */
function getBodyFatCategory(bodyFatPercent: number, gender: string): BodyFatCategory | null {
  if (!bodyFatPercent) return null;

  const categories: BodyFatCategory[] = gender === 'male'
    ? [
        { max: 6, label: 'Essential Fat', color: '#FF5252' },
        { max: 13, label: 'Athletes', color: '#00E676' },
        { max: 17, label: 'Fitness', color: '#00D4FF' },
        { max: 24, label: 'Average', color: '#FFB300' },
        { max: 100, label: 'Above Average', color: '#FF6B35' },
      ]
    : [
        { max: 14, label: 'Essential Fat', color: '#FF5252' },
        { max: 20, label: 'Athletes', color: '#00E676' },
        { max: 24, label: 'Fitness', color: '#00D4FF' },
        { max: 31, label: 'Average', color: '#FFB300' },
        { max: 100, label: 'Above Average', color: '#FF6B35' },
      ];

  return categories.find((c: BodyFatCategory) => bodyFatPercent <= c.max) || categories[categories.length - 1];
}

// ============================================================================
// NUTRITION QUALITY SCORING
// ============================================================================

interface NutritionDayData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealCount?: number;
}

interface NutritionGoals {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface NutritionBreakdownEntry {
  score: number;
  max: number;
  ratio?: number;
  mealCount?: number;
}

interface NutritionScoreResult {
  score: number;
  breakdown: Record<string, NutritionBreakdownEntry>;
  grade?: string;
}

/**
 * Calculate a comprehensive nutrition quality score (0-100)
 */
function calculateNutritionScore(dayData: NutritionDayData | null, goals: NutritionGoals | null): NutritionScoreResult {
  if (!dayData || !goals) return { score: 0, breakdown: {} };

  const { calories = 0, protein = 0, carbs = 0, fat = 0 } = dayData;
  const { calories: calGoal = 2000, protein: proGoal = 150, carbs: carbGoal = 200, fat: fatGoal = 65 } = goals;

  // Calorie adherence (0-30 points)
  const calRatio: number = calGoal > 0 ? calories / calGoal : 0;
  const calScore: number = Math.max(0, 30 - Math.abs(1 - calRatio) * 60);

  // Protein adherence (0-30 points) - reward hitting protein goal
  const proRatio: number = proGoal > 0 ? protein / proGoal : 0;
  const proScore: number = Math.min(30, proRatio * 30);

  // Macro balance (0-20 points)
  const carbRatio: number = carbGoal > 0 ? carbs / carbGoal : 0;
  const fatRatio: number = fatGoal > 0 ? fat / fatGoal : 0;
  const macroBalance: number = (Math.max(0, 10 - Math.abs(1 - carbRatio) * 20) + Math.max(0, 10 - Math.abs(1 - fatRatio) * 20));

  // Meal distribution (0-20 points)
  const mealCount: number = dayData.mealCount || 0;
  const mealScore: number = mealCount >= 3 ? 20 : mealCount >= 2 ? 15 : mealCount >= 1 ? 10 : 0;

  const total: number = Math.round(calScore + proScore + macroBalance + mealScore);

  return {
    score: Math.min(100, Math.max(0, total)),
    breakdown: {
      calories: { score: Math.round(calScore), max: 30, ratio: Math.round(calRatio * 100) / 100 },
      protein: { score: Math.round(proScore), max: 30, ratio: Math.round(proRatio * 100) / 100 },
      macroBalance: { score: Math.round(macroBalance), max: 20 },
      mealDistribution: { score: Math.round(mealScore), max: 20, mealCount },
    },
    grade: total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F',
  };
}

// ============================================================================
// FITNESS SCORE CALCULATION
// ============================================================================

interface FitnessUserData {
  streak?: number;
  weeklyWorkouts?: number;
  nutritionScore?: number;
  waterAdherence?: number;
  sleepScore?: number;
  weightProgress?: number;
}

interface FitnessScoreResult {
  score: number;
  breakdown: {
    consistency: number;
    activity: number;
    nutrition: number;
    recovery: number;
  };
  level: string;
  color: string;
}

/**
 * Calculate comprehensive fitness score (0-100)
 */
function calculateFitnessScore(userData: FitnessUserData): FitnessScoreResult {
  const { streak = 0, weeklyWorkouts = 0, nutritionScore = 0, waterAdherence = 0, sleepScore = 0, weightProgress = 0 } = userData;

  // Consistency (0-25) - based on streak
  const consistencyScore: number = Math.min(25, streak * 2.5);

  // Activity (0-25) - based on weekly workouts
  const activityScore: number = Math.min(25, weeklyWorkouts * 6.25);

  // Nutrition (0-25) - from nutrition score
  const nutritionPart: number = (nutritionScore / 100) * 25;

  // Recovery (0-25) - sleep + hydration
  const recoveryScore: number = ((sleepScore + waterAdherence) / 200) * 25;

  const total: number = Math.round(consistencyScore + activityScore + nutritionPart + recoveryScore);

  return {
    score: Math.min(100, Math.max(0, total)),
    breakdown: {
      consistency: Math.round(consistencyScore),
      activity: Math.round(activityScore),
      nutrition: Math.round(nutritionPart),
      recovery: Math.round(recoveryScore),
    },
    level: total >= 90 ? 'Elite' : total >= 75 ? 'Advanced' : total >= 60 ? 'Intermediate' : total >= 40 ? 'Beginner' : 'Getting Started',
    color: total >= 90 ? '#00E676' : total >= 75 ? '#00D4FF' : total >= 60 ? '#FFB300' : total >= 40 ? '#FF6B35' : '#FF5252',
  };
}

// ============================================================================
// CALORIC ADAPTATION TRACKING
// ============================================================================

interface WeeklyDataEntry {
  calorieGoal?: number;
  avgCalories?: number;
  weight?: number;
}

interface MetabolicAdaptationResult {
  adapted: boolean;
  reason?: string;
  severity?: string;
  estimatedAdaptation?: number;
  recommendations?: string[];
}

/**
 * Detect metabolic adaptation (adaptive thermogenesis)
 */
function detectMetabolicAdaptation(weeklyData: WeeklyDataEntry[]): MetabolicAdaptationResult {
  if (!weeklyData || weeklyData.length < 4) return { adapted: false, reason: 'insufficient_data' };

  const recent: WeeklyDataEntry[] = weeklyData.slice(-4);
  const calorieDeficits: number[] = recent.map((w: WeeklyDataEntry) => (w.calorieGoal || 2000) - (w.avgCalories || 0));
  const weightChanges: number[] = [];
  for (let i: number = 1; i < recent.length; i++) {
    if (recent[i].weight && recent[i - 1].weight) {
      weightChanges.push(recent[i].weight! - recent[i - 1].weight!);
    }
  }

  // If maintaining deficit but not losing weight, adaptation may be occurring
  const avgDeficit: number = calorieDeficits.reduce((s: number, d: number) => s + d, 0) / calorieDeficits.length;
  const avgWeightChange: number = weightChanges.length > 0 ? weightChanges.reduce((s: number, c: number) => s + c, 0) / weightChanges.length : 0;

  if (avgDeficit > 300 && avgWeightChange >= -0.2) {
    return {
      adapted: true,
      severity: avgDeficit > 500 ? 'significant' : 'mild',
      estimatedAdaptation: Math.round(avgDeficit * 0.15),
      recommendations: [
        'Consider a 1-2 week diet break at maintenance calories',
        'Increase NEAT (Non-Exercise Activity Thermogenesis)',
        'Add 1-2 resistance training sessions to preserve metabolic rate',
        'Ensure adequate sleep (7-9 hours) to support hormonal balance',
      ],
    };
  }

  return { adapted: false };
}

// ============================================================================
// GOAL PROJECTION
// ============================================================================

interface GoalMilestone {
  week: number;
  weight: number;
  date: string;
  percentComplete: number;
}

interface GoalTimelineResult {
  weeksToGoal: number;
  targetDate: string;
  totalChange: number;
  direction: string;
  milestones: GoalMilestone[];
}

/**
 * Project time to reach goal weight
 */
function projectGoalTimeline(currentWeight: number, goalWeight: number, weeklyLossRate: number = 1): GoalTimelineResult | null {
  if (!currentWeight || !goalWeight || !weeklyLossRate) return null;

  const totalChange: number = Math.abs(currentWeight - goalWeight);
  const weeksToGoal: number = Math.ceil(totalChange / Math.abs(weeklyLossRate));
  const targetDate: Date = new Date();
  targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);

  // Generate weekly milestones
  const milestones: GoalMilestone[] = [];
  const direction: number = currentWeight > goalWeight ? -1 : 1;
  for (let week: number = 1; week <= Math.min(weeksToGoal, 52); week++) {
    const projected: number = currentWeight + (direction * weeklyLossRate * week);
    const date: Date = new Date();
    date.setDate(date.getDate() + week * 7);
    milestones.push({
      week,
      weight: Math.round(projected * 10) / 10,
      date: date.toISOString().split('T')[0],
      percentComplete: Math.min(100, Math.round((week / weeksToGoal) * 100)),
    });
  }

  return {
    weeksToGoal,
    targetDate: targetDate.toISOString().split('T')[0],
    totalChange: Math.round(totalChange * 10) / 10,
    direction: direction > 0 ? 'gaining' : 'losing',
    milestones,
  };
}

// ============================================================================
// WEEKLY INSIGHT GENERATION
// ============================================================================

interface WeekInsightData {
  daysLogged?: number;
  calorieVariance?: number;
  avgProtein?: number;
  proteinGoal?: number;
  avgCalories?: number;
  streak?: number;
  avgWaterPercent?: number;
}

interface WeeklyInsight {
  type: string;
  icon: string;
  title: string;
  body: string;
}

/**
 * Generate data-driven weekly insights
 */
function generateWeeklyInsights(weekData: WeekInsightData | null, previousWeekData: WeekInsightData | null = null): WeeklyInsight[] {
  const insights: WeeklyInsight[] = [];

  if (!weekData) return insights;

  // Calorie consistency
  if (weekData.daysLogged !== undefined && weekData.daysLogged >= 5) {
    const variance: number = weekData.calorieVariance || 0;
    if (variance < 200) {
      insights.push({ type: 'success', icon: '🎯', title: 'Consistent Eating', body: 'Your calorie intake varied by less than 200 kcal day-to-day. Great consistency!' });
    } else if (variance > 500) {
      insights.push({ type: 'warning', icon: '📊', title: 'Calorie Swings', body: `Your daily calories varied by ${Math.round(variance)} kcal. Try to keep intake more consistent.` });
    }
  }

  // Protein adherence
  if (weekData.avgProtein && weekData.proteinGoal) {
    const adherence: number = weekData.avgProtein / weekData.proteinGoal;
    if (adherence >= 0.9) {
      insights.push({ type: 'success', icon: '💪', title: 'Protein Champion', body: 'You hit 90%+ of your protein goal on average. Your muscles thank you!' });
    } else if (adherence < 0.7) {
      insights.push({ type: 'warning', icon: '🥩', title: 'Protein Gap', body: `You're averaging ${Math.round(adherence * 100)}% of your protein goal. Try adding a protein-rich snack.` });
    }
  }

  // Week-over-week comparison
  if (previousWeekData && previousWeekData.avgCalories) {
    const calChange: number = (weekData.avgCalories || 0) - previousWeekData.avgCalories;
    if (Math.abs(calChange) > 200) {
      insights.push({
        type: calChange > 0 ? 'info' : 'success',
        icon: calChange > 0 ? '📈' : '📉',
        title: `${Math.abs(Math.round(calChange))} cal ${calChange > 0 ? 'more' : 'fewer'} per day`,
        body: `Compared to last week, you're eating ${Math.abs(Math.round(calChange))} calories ${calChange > 0 ? 'more' : 'fewer'} per day on average.`,
      });
    }
  }

  // Streak milestone
  if (weekData.streak !== undefined && weekData.streak >= 7 && weekData.streak % 7 === 0) {
    insights.push({ type: 'success', icon: '🔥', title: `${weekData.streak}-Day Streak!`, body: `You've logged for ${weekData.streak} days straight. You're building an incredible habit!` });
  }

  // Hydration
  if (weekData.avgWaterPercent !== undefined) {
    if (weekData.avgWaterPercent >= 90) {
      insights.push({ type: 'success', icon: '💧', title: 'Hydration Hero', body: 'Excellent hydration this week! Staying well-hydrated boosts metabolism and energy.' });
    } else if (weekData.avgWaterPercent < 60) {
      insights.push({ type: 'warning', icon: '🥤', title: 'Drink More Water', body: 'Your hydration was below target most days. Set reminders to drink water regularly.' });
    }
  }

  return insights.slice(0, 5);
}

// ============================================================================
// WEIGHTED LINEAR REGRESSION (configurable windows)
// ============================================================================

interface WeightedRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  predictedNext: number;
}

/**
 * Weighted linear regression where more recent data points carry higher weight.
 * Configurable window sizes: 7, 14, 30, 90 days.
 */
function weightedLinearRegression(
  data: number[],
  windowDays: 7 | 14 | 30 | 90 = 7
): WeightedRegressionResult | null {
  if (!data || data.length < 3) return null;
  const slice = data.slice(-windowDays);
  const n = slice.length;
  if (n < 3) return null;

  // Exponential weights: w_i = e^(alpha * i) with alpha chosen so last point has ~3x weight of first
  const alpha = Math.log(3) / (n - 1);
  let wSum = 0, wxSum = 0, wySum = 0, wxySum = 0, wx2Sum = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.exp(alpha * i);
    wSum += w;
    wxSum += w * i;
    wySum += w * slice[i];
    wxySum += w * i * slice[i];
    wx2Sum += w * i * i;
  }

  const denom = wSum * wx2Sum - wxSum * wxSum;
  if (Math.abs(denom) < 1e-10) return null;

  const slope = (wSum * wxySum - wxSum * wySum) / denom;
  const intercept = (wySum - slope * wxSum) / wSum;

  // Weighted R-squared
  const yMean = wySum / wSum;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.exp(alpha * i);
    const pred = slope * i + intercept;
    ssRes += w * (slice[i] - pred) ** 2;
    ssTot += w * (slice[i] - yMean) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  const direction: 'increasing' | 'decreasing' | 'stable' =
    Math.abs(slope) < 0.005 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing';

  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 100) / 100,
    rSquared: Math.round(rSquared * 1000) / 1000,
    direction,
    confidence: Math.round(rSquared * 100),
    predictedNext: Math.round((slope * n + intercept) * 10) / 10,
  };
}

// ============================================================================
// ANOMALY DETECTION (Z-score based)
// ============================================================================

interface AnomalyEntry {
  index: number;
  value: number;
  zScore: number;
  type: 'high' | 'low';
  date?: string;
}

interface AnomalyResult {
  anomalies: AnomalyEntry[];
  mean: number;
  stdDev: number;
  hasAnomalies: boolean;
}

/**
 * Z-score based outlier detection for any metric.
 * Flags values > threshold standard deviations from the mean.
 */
function detectAnomalies(
  data: number[],
  threshold: number = 2.0,
  dates?: string[]
): AnomalyResult {
  if (!data || data.length < 5) return { anomalies: [], mean: 0, stdDev: 0, hasAnomalies: false };

  const n = data.length;
  const mean = data.reduce((s, v) => s + v, 0) / n;
  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev < 0.001) return { anomalies: [], mean, stdDev, hasAnomalies: false };

  const anomalies: AnomalyEntry[] = [];
  for (let i = 0; i < n; i++) {
    const z = (data[i] - mean) / stdDev;
    if (Math.abs(z) >= threshold) {
      anomalies.push({
        index: i,
        value: data[i],
        zScore: Math.round(z * 100) / 100,
        type: z > 0 ? 'high' : 'low',
        date: dates?.[i],
      });
    }
  }

  return {
    anomalies,
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    hasAnomalies: anomalies.length > 0,
  };
}

// ============================================================================
// CORRELATION ANALYSIS
// ============================================================================

interface CorrelationResult {
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative' | 'none';
  description: string;
  sampleSize: number;
}

/**
 * Pearson correlation between two variable arrays.
 * Use to find relationships: sleep vs weight, protein vs strength, etc.
 */
function calculateCorrelation(
  xData: number[],
  yData: number[],
  xLabel: string = 'X',
  yLabel: string = 'Y'
): CorrelationResult | null {
  if (!xData || !yData) return null;
  const n = Math.min(xData.length, yData.length);
  if (n < 5) return null;

  const x = xData.slice(0, n);
  const y = yData.slice(0, n);

  const xMean = x.reduce((s, v) => s + v, 0) / n;
  const yMean = y.reduce((s, v) => s + v, 0) / n;

  let numerator = 0, xDenom = 0, yDenom = 0;
  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xDenom += xDiff ** 2;
    yDenom += yDiff ** 2;
  }

  const denominator = Math.sqrt(xDenom * yDenom);
  if (denominator < 1e-10) return null;

  const r = numerator / denominator;
  const absR = Math.abs(r);

  const strength: CorrelationResult['strength'] =
    absR >= 0.7 ? 'strong' : absR >= 0.4 ? 'moderate' : absR >= 0.2 ? 'weak' : 'none';
  const direction: CorrelationResult['direction'] =
    absR < 0.2 ? 'none' : r > 0 ? 'positive' : 'negative';

  let description = '';
  if (strength === 'none') {
    description = `No meaningful correlation between ${xLabel} and ${yLabel}`;
  } else {
    const dirWord = direction === 'positive' ? 'increases' : 'decreases';
    description = `${strength.charAt(0).toUpperCase() + strength.slice(1)} correlation: when ${xLabel} goes up, ${yLabel} ${dirWord}`;
  }

  return {
    coefficient: Math.round(r * 1000) / 1000,
    strength,
    direction,
    description,
    sampleSize: n,
  };
}

// ============================================================================
// STREAK ANALYTICS
// ============================================================================

interface StreakAnalyticsResult {
  currentStreak: number;
  longestStreak: number;
  averageStreakLength: number;
  totalStreaks: number;
  streakBreakDays: Record<string, number>; // day name -> break count
  mostLikelyBreakDay: string | null;
  streaks: Array<{ start: number; length: number }>;
}

/**
 * Comprehensive streak analytics: longest, avg, break patterns by day of week.
 */
function analyzeStreaks(
  loggedDates: string[] // array of 'YYYY-MM-DD' date strings
): StreakAnalyticsResult {
  const result: StreakAnalyticsResult = {
    currentStreak: 0,
    longestStreak: 0,
    averageStreakLength: 0,
    totalStreaks: 0,
    streakBreakDays: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
    mostLikelyBreakDay: null,
    streaks: [],
  };

  if (!loggedDates || loggedDates.length === 0) return result;

  const sorted = [...loggedDates].sort();
  const dateSet = new Set(sorted);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Walk forward from first to last date
  const first = new Date(sorted[0]);
  const last = new Date(sorted[sorted.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreakLen = 0;
  let maxStreak = 0;
  const streakLengths: number[] = [];
  let streakStart = -1;
  let idx = 0;

  const d = new Date(first);
  while (d <= today) {
    const ds = d.toISOString().split('T')[0];
    if (dateSet.has(ds)) {
      if (currentStreakLen === 0) streakStart = idx;
      currentStreakLen++;
    } else {
      if (currentStreakLen > 0) {
        streakLengths.push(currentStreakLen);
        result.streaks.push({ start: streakStart, length: currentStreakLen });
        maxStreak = Math.max(maxStreak, currentStreakLen);
        currentStreakLen = 0;
      }
      // Record the break day
      const dayName = dayNames[d.getDay()];
      result.streakBreakDays[dayName]++;
    }
    d.setDate(d.getDate() + 1);
    idx++;
  }

  // If the last day is today and was logged, current streak is still going
  if (currentStreakLen > 0) {
    maxStreak = Math.max(maxStreak, currentStreakLen);
    result.streaks.push({ start: streakStart, length: currentStreakLen });
    // Only count as current if it extends to today
    const todayStr = today.toISOString().split('T')[0];
    if (dateSet.has(todayStr)) {
      result.currentStreak = currentStreakLen;
    } else {
      streakLengths.push(currentStreakLen);
    }
  }
  if (currentStreakLen > 0 && result.currentStreak === 0) {
    streakLengths.push(currentStreakLen);
  }

  result.longestStreak = maxStreak;
  result.totalStreaks = streakLengths.length + (result.currentStreak > 0 ? 1 : 0);
  const allLengths = [...streakLengths, ...(result.currentStreak > 0 ? [result.currentStreak] : [])];
  result.averageStreakLength = allLengths.length > 0
    ? Math.round((allLengths.reduce((s, v) => s + v, 0) / allLengths.length) * 10) / 10
    : 0;

  // Find most likely break day
  let maxBreaks = 0;
  let breakDay: string | null = null;
  for (const [day, count] of Object.entries(result.streakBreakDays)) {
    if (count > maxBreaks) {
      maxBreaks = count;
      breakDay = day;
    }
  }
  result.mostLikelyBreakDay = breakDay;

  return result;
}

// ============================================================================
// ADHERENCE SCORING
// ============================================================================

interface AdherenceResult {
  overallScore: number;
  calorieAdherence: number;
  proteinAdherence: number;
  loggingConsistency: number;
  grade: string;
  daysOnTarget: number;
  totalDays: number;
}

/**
 * How consistently does user hit their targets (0-100 score).
 */
function calculateAdherenceScore(
  dailyData: Array<{ calories: number; protein: number; goal: number; proteinGoal: number }>,
  daysInPeriod: number
): AdherenceResult {
  if (!dailyData || dailyData.length === 0) {
    return { overallScore: 0, calorieAdherence: 0, proteinAdherence: 0, loggingConsistency: 0, grade: 'F', daysOnTarget: 0, totalDays: 0 };
  }

  const tracked = dailyData.filter(d => d.calories > 0);
  const loggingConsistency = Math.min(100, Math.round((tracked.length / daysInPeriod) * 100));

  let calOnTarget = 0;
  let protOnTarget = 0;
  for (const day of tracked) {
    const calRatio = day.goal > 0 ? day.calories / day.goal : 0;
    if (calRatio >= 0.85 && calRatio <= 1.15) calOnTarget++;
    const proRatio = day.proteinGoal > 0 ? day.protein / day.proteinGoal : 0;
    if (proRatio >= 0.85) protOnTarget++;
  }

  const calorieAdherence = tracked.length > 0 ? Math.round((calOnTarget / tracked.length) * 100) : 0;
  const proteinAdherence = tracked.length > 0 ? Math.round((protOnTarget / tracked.length) * 100) : 0;

  const overallScore = Math.round(
    loggingConsistency * 0.3 + calorieAdherence * 0.4 + proteinAdherence * 0.3
  );

  const grade = overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' :
    overallScore >= 60 ? 'C' : overallScore >= 50 ? 'D' : 'F';

  return {
    overallScore,
    calorieAdherence,
    proteinAdherence,
    loggingConsistency,
    grade,
    daysOnTarget: calOnTarget,
    totalDays: tracked.length,
  };
}

// ============================================================================
// BEST / WORST DAY ANALYSIS
// ============================================================================

interface DayAnalysis {
  bestDay: string | null;
  worstDay: string | null;
  bestDayAvgCalories: number;
  worstDayAvgCalories: number;
  dayOfWeekAverages: Record<string, { avgCalories: number; avgProtein: number; count: number }>;
  weekendVsWeekday: { weekdayAvg: number; weekendAvg: number; difference: number };
}

/**
 * Analyze which days user performs best and worst.
 */
function analyzeDayPatterns(
  dailyData: Array<{ date: string; calories: number; protein: number }>
): DayAnalysis {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay: Record<string, { totalCal: number; totalPro: number; count: number }> = {};
  for (const name of dayNames) byDay[name] = { totalCal: 0, totalPro: 0, count: 0 };

  for (const entry of dailyData) {
    if (entry.calories <= 0) continue;
    const d = new Date(entry.date);
    const dayName = dayNames[d.getDay()];
    byDay[dayName].totalCal += entry.calories;
    byDay[dayName].totalPro += entry.protein || 0;
    byDay[dayName].count++;
  }

  const dayOfWeekAverages: Record<string, { avgCalories: number; avgProtein: number; count: number }> = {};
  let bestDay: string | null = null, worstDay: string | null = null;
  let minAvg = Infinity, maxAvg = -Infinity;

  for (const [name, data] of Object.entries(byDay)) {
    const avg = data.count > 0 ? Math.round(data.totalCal / data.count) : 0;
    const avgPro = data.count > 0 ? Math.round(data.totalPro / data.count) : 0;
    dayOfWeekAverages[name] = { avgCalories: avg, avgProtein: avgPro, count: data.count };
    if (data.count > 0) {
      if (avg < minAvg) { minAvg = avg; bestDay = name; } // lower cal = better for loss
      if (avg > maxAvg) { maxAvg = avg; worstDay = name; }
    }
  }

  // Weekend vs weekday
  const weekdayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekendDays = ['Sat', 'Sun'];
  let wdTotal = 0, wdCount = 0, weTotal = 0, weCount = 0;
  for (const name of weekdayDays) {
    wdTotal += byDay[name].totalCal; wdCount += byDay[name].count;
  }
  for (const name of weekendDays) {
    weTotal += byDay[name].totalCal; weCount += byDay[name].count;
  }
  const weekdayAvg = wdCount > 0 ? Math.round(wdTotal / wdCount) : 0;
  const weekendAvg = weCount > 0 ? Math.round(weTotal / weCount) : 0;

  return {
    bestDay,
    worstDay,
    bestDayAvgCalories: minAvg === Infinity ? 0 : minAvg,
    worstDayAvgCalories: maxAvg === -Infinity ? 0 : maxAvg,
    dayOfWeekAverages,
    weekendVsWeekday: { weekdayAvg, weekendAvg, difference: weekendAvg - weekdayAvg },
  };
}

// ============================================================================
// PLATEAU DETECTION (Statistical t-test)
// ============================================================================

interface PlateauDetectionResult {
  isPlateau: boolean;
  plateauDuration: number;
  changeRate: number;
  suggestion: string;
  confidence: number;
}

/**
 * Statistical test for weight/strength stagnation using coefficient of variation.
 */
function detectPlateauStatistical(
  data: number[],
  windowDays: number = 14,
  changeThreshold: number = 0.005 // 0.5% variation threshold
): PlateauDetectionResult {
  if (!data || data.length < windowDays) {
    return { isPlateau: false, plateauDuration: 0, changeRate: 0, suggestion: '', confidence: 0 };
  }

  const recent = data.slice(-windowDays);
  const mean = recent.reduce((s, v) => s + v, 0) / recent.length;
  if (mean === 0) return { isPlateau: false, plateauDuration: 0, changeRate: 0, suggestion: '', confidence: 0 };

  const stdDev = Math.sqrt(recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length);
  const cv = stdDev / Math.abs(mean); // coefficient of variation

  // Also check the slope over the window
  const trend = weightedLinearRegression(recent, 7);
  const absSlope = trend ? Math.abs(trend.slope) : 0;

  const isPlateau = cv < changeThreshold && absSlope < 0.02;

  // Count how far back the plateau extends
  let plateauDuration = windowDays;
  if (isPlateau && data.length > windowDays) {
    for (let w = windowDays + 7; w <= data.length; w += 7) {
      const extended = data.slice(-w);
      const extMean = extended.reduce((s, v) => s + v, 0) / extended.length;
      const extStd = Math.sqrt(extended.reduce((s, v) => s + (v - extMean) ** 2, 0) / extended.length);
      const extCv = extMean !== 0 ? extStd / Math.abs(extMean) : 0;
      if (extCv < changeThreshold * 1.5) {
        plateauDuration = w;
      } else {
        break;
      }
    }
  }

  let suggestion = '';
  if (isPlateau) {
    if (plateauDuration >= 28) {
      suggestion = 'Extended plateau detected. Consider a strategic diet break or reverse diet for 1-2 weeks to reset metabolic adaptation.';
    } else if (plateauDuration >= 14) {
      suggestion = 'Your progress has stalled. Try adjusting calories by 100-200, changing workout intensity, or adding more daily movement.';
    }
  }

  return {
    isPlateau,
    plateauDuration,
    changeRate: Math.round(absSlope * 1000) / 1000,
    suggestion,
    confidence: isPlateau ? Math.min(95, Math.round((1 - cv / changeThreshold) * 100)) : 0,
  };
}

// ============================================================================
// RATE OF PROGRESS
// ============================================================================

interface ProgressRateResult {
  actualRatePerWeek: number;
  expectedRatePerWeek: number;
  percentOfExpected: number;
  status: 'ahead' | 'on_track' | 'behind' | 'stalled';
  projectedDaysToGoal: number;
  projectedDate: string | null;
  message: string;
}

/**
 * Compare actual vs expected progress toward goal.
 */
function calculateProgressRate(
  currentWeight: number,
  goalWeight: number,
  startWeight: number,
  expectedWeeklyRate: number,
  weightHistory: Array<{ date: string; weight: number }>,
): ProgressRateResult {
  const defaultResult: ProgressRateResult = {
    actualRatePerWeek: 0, expectedRatePerWeek: expectedWeeklyRate,
    percentOfExpected: 0, status: 'stalled', projectedDaysToGoal: 0,
    projectedDate: null, message: 'Not enough data to calculate progress rate.',
  };

  if (!weightHistory || weightHistory.length < 7) return defaultResult;

  const sorted = [...weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recent14 = sorted.slice(-14);
  if (recent14.length < 2) return defaultResult;

  const firstEntry = recent14[0];
  const lastEntry = recent14[recent14.length - 1];
  const daySpan = (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daySpan < 3) return defaultResult;

  const totalChange = lastEntry.weight - firstEntry.weight;
  const actualRatePerWeek = Math.round(((totalChange / daySpan) * 7) * 100) / 100;

  const isLosing = goalWeight < startWeight;
  const progress = isLosing
    ? Math.abs(actualRatePerWeek) / Math.abs(expectedWeeklyRate)
    : (actualRatePerWeek) / Math.abs(expectedWeeklyRate);

  const percentOfExpected = Math.round(progress * 100);

  let status: ProgressRateResult['status'];
  if (Math.abs(actualRatePerWeek) < 0.05) {
    status = 'stalled';
  } else if (percentOfExpected >= 120) {
    status = 'ahead';
  } else if (percentOfExpected >= 70) {
    status = 'on_track';
  } else {
    status = 'behind';
  }

  const remaining = Math.abs(goalWeight - currentWeight);
  const weeklyRate = Math.abs(actualRatePerWeek) || Math.abs(expectedWeeklyRate);
  const weeksNeeded = weeklyRate > 0 ? remaining / weeklyRate : 999;
  const daysNeeded = Math.round(weeksNeeded * 7);
  const projDate = new Date();
  projDate.setDate(projDate.getDate() + daysNeeded);

  const messages: Record<string, string> = {
    ahead: `Great progress! You're losing faster than planned. Projected to hit goal by ${projDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
    on_track: `You're on track! At this rate you'll reach your goal by ${projDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
    behind: `You're behind your target rate. Consider tightening your calorie deficit or increasing activity.`,
    stalled: `Progress has stalled. Your weight hasn't changed significantly in the last 2 weeks.`,
  };

  return {
    actualRatePerWeek,
    expectedRatePerWeek: expectedWeeklyRate,
    percentOfExpected,
    status,
    projectedDaysToGoal: daysNeeded,
    projectedDate: daysNeeded < 365 * 3 ? projDate.toISOString().split('T')[0] : null,
    message: messages[status],
  };
}

// ============================================================================
// EWMA (Exponentially Weighted Moving Average) for weight smoothing
// ============================================================================

interface EWMAResult {
  smoothed: number[];
  upperBand: number[];
  lowerBand: number[];
}

/**
 * EWMA smoothed weight with confidence band.
 * Alpha = 2/(span+1), bands = +/- bandMultiplier * rolling std dev.
 */
function calculateEWMA(
  data: number[],
  span: number = 7,
  bandMultiplier: number = 1.5
): EWMAResult {
  if (!data || data.length === 0) return { smoothed: [], upperBand: [], lowerBand: [] };

  const alpha = 2 / (span + 1);
  const smoothed: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }

  // Rolling standard deviation for bands
  const upperBand: number[] = [];
  const lowerBand: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const windowStart = Math.max(0, i - span + 1);
    const window = data.slice(windowStart, i + 1);
    const mean = window.reduce((s, v) => s + v, 0) / window.length;
    const std = Math.sqrt(window.reduce((s, v) => s + (v - mean) ** 2, 0) / window.length);
    const band = std * bandMultiplier;
    upperBand.push(Math.round((smoothed[i] + band) * 10) / 10);
    lowerBand.push(Math.round((smoothed[i] - band) * 10) / 10);
  }

  return {
    smoothed: smoothed.map(v => Math.round(v * 10) / 10),
    upperBand,
    lowerBand,
  };
}

// ============================================================================
// MACRO CONSISTENCY (variance analysis)
// ============================================================================

interface MacroConsistencyResult {
  calorieCV: number;
  proteinCV: number;
  carbsCV: number;
  fatCV: number;
  overallConsistency: number; // 0-100, higher = more consistent
  dailyCalories: number[];
  dailyProtein: number[];
  dailyCarbs: number[];
  dailyFat: number[];
}

/**
 * How consistent are daily macros using coefficient of variation.
 */
function analyzeMacroConsistency(
  dailyData: Array<{ calories: number; protein: number; carbs: number; fat: number }>
): MacroConsistencyResult {
  const empty: MacroConsistencyResult = {
    calorieCV: 0, proteinCV: 0, carbsCV: 0, fatCV: 0,
    overallConsistency: 0, dailyCalories: [], dailyProtein: [], dailyCarbs: [], dailyFat: [],
  };

  const valid = dailyData.filter(d => d.calories > 0);
  if (valid.length < 3) return empty;

  function cv(arr: number[]): number {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    if (mean === 0) return 0;
    const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
    return Math.round((std / mean) * 100) / 100;
  }

  const cals = valid.map(d => d.calories);
  const pros = valid.map(d => d.protein);
  const carbs = valid.map(d => d.carbs);
  const fats = valid.map(d => d.fat);

  const calorieCV = cv(cals);
  const proteinCV = cv(pros);
  const carbsCV = cv(carbs);
  const fatCV = cv(fats);

  // Consistency score: lower CV = higher score, scaled 0-100
  const avgCV = (calorieCV + proteinCV + carbsCV + fatCV) / 4;
  const overallConsistency = Math.max(0, Math.min(100, Math.round((1 - avgCV) * 100)));

  return {
    calorieCV, proteinCV, carbsCV, fatCV, overallConsistency,
    dailyCalories: cals, dailyProtein: pros, dailyCarbs: carbs, dailyFat: fats,
  };
}

// ============================================================================
// WEEKLY REPORT CARD
// ============================================================================

interface WeeklyReportCard {
  grade: string;
  gradeColor: string;
  complianceScore: number;
  highlights: string[];
  areasToImprove: string[];
  calorieStats: { avg: number; best: number; worst: number; compliance: number };
  macroStats: { avgProtein: number; avgCarbs: number; avgFat: number; proteinTarget: number; carbsTarget: number; fatTarget: number };
  exerciseStats: { workoutsCompleted: number; totalDuration: number; totalCalories: number };
  weightChange: number;
  topInsightIds: string[];
}

/**
 * Generate a full weekly report card with grade.
 */
function generateWeeklyReportCard(params: {
  dailyData: Array<{ calories: number; protein: number; carbs: number; fat: number; goal: number }>;
  goals: { calories: number; protein: number; carbs: number; fat: number };
  workouts: Array<{ duration: number; calories: number }>;
  weightStart: number;
  weightEnd: number;
  streak: number;
}): WeeklyReportCard {
  const { dailyData, goals, workouts, weightStart, weightEnd, streak } = params;

  const valid = dailyData.filter(d => d.calories > 0);
  const cals = valid.map(d => d.calories);
  const avgCal = cals.length > 0 ? Math.round(cals.reduce((s, v) => s + v, 0) / cals.length) : 0;
  const bestCal = cals.length > 0 ? Math.min(...cals) : 0;
  const worstCal = cals.length > 0 ? Math.max(...cals) : 0;

  let onTarget = 0;
  for (const d of valid) {
    const ratio = d.goal > 0 ? d.calories / d.goal : 0;
    if (ratio >= 0.85 && ratio <= 1.15) onTarget++;
  }
  const calCompliance = valid.length > 0 ? Math.round((onTarget / valid.length) * 100) : 0;

  const avgPro = valid.length > 0 ? Math.round(valid.reduce((s, d) => s + d.protein, 0) / valid.length) : 0;
  const avgCarbs = valid.length > 0 ? Math.round(valid.reduce((s, d) => s + d.carbs, 0) / valid.length) : 0;
  const avgFat = valid.length > 0 ? Math.round(valid.reduce((s, d) => s + d.fat, 0) / valid.length) : 0;

  const totalWorkoutDuration = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const totalWorkoutCalories = workouts.reduce((s, w) => s + (w.calories || 0), 0);

  const weightChange = Math.round((weightEnd - weightStart) * 10) / 10;

  // Composite score
  const loggingScore = Math.min(100, Math.round((valid.length / 7) * 100));
  const streakBonus = Math.min(10, streak);
  const workoutScore = Math.min(100, workouts.length * 25);

  const complianceScore = Math.round(
    calCompliance * 0.35 + loggingScore * 0.25 + workoutScore * 0.2 +
    (avgPro >= goals.protein * 0.85 ? 20 : avgPro >= goals.protein * 0.7 ? 10 : 0)
  );
  const gradeScore = Math.min(100, complianceScore + streakBonus);

  const grade = gradeScore >= 95 ? 'A+' : gradeScore >= 90 ? 'A' : gradeScore >= 85 ? 'A-' :
    gradeScore >= 80 ? 'B+' : gradeScore >= 75 ? 'B' : gradeScore >= 70 ? 'B-' :
    gradeScore >= 65 ? 'C+' : gradeScore >= 60 ? 'C' : gradeScore >= 50 ? 'D' : 'F';

  const gradeColor = gradeScore >= 85 ? '#00E676' : gradeScore >= 70 ? '#00D4FF' :
    gradeScore >= 55 ? '#FFB300' : '#FF5252';

  // Highlights
  const highlights: string[] = [];
  if (calCompliance >= 80) highlights.push(`Hit calorie target ${calCompliance}% of the time`);
  if (avgPro >= goals.protein * 0.9) highlights.push(`Protein on point: avg ${avgPro}g/day`);
  if (workouts.length >= 3) highlights.push(`${workouts.length} workouts completed`);
  if (streak >= 7) highlights.push(`${streak}-day logging streak!`);
  if (weightChange < 0) highlights.push(`Lost ${Math.abs(weightChange)}kg this week`);

  const areasToImprove: string[] = [];
  if (calCompliance < 60) areasToImprove.push('Calorie consistency needs work');
  if (avgPro < goals.protein * 0.7) areasToImprove.push(`Protein is low (${avgPro}g vs ${goals.protein}g target)`);
  if (valid.length < 5) areasToImprove.push('Try to log meals every day');
  if (workouts.length < 2) areasToImprove.push('Aim for at least 3 workouts/week');

  return {
    grade, gradeColor, complianceScore,
    highlights, areasToImprove,
    calorieStats: { avg: avgCal, best: bestCal, worst: worstCal, compliance: calCompliance },
    macroStats: { avgProtein: avgPro, avgCarbs, avgFat, proteinTarget: goals.protein, carbsTarget: goals.carbs, fatTarget: goals.fat },
    exerciseStats: { workoutsCompleted: workouts.length, totalDuration: totalWorkoutDuration, totalCalories: totalWorkoutCalories },
    weightChange,
    topInsightIds: [],
  };
}

export {
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
  // New advanced analytics
  weightedLinearRegression,
  detectAnomalies,
  calculateCorrelation,
  analyzeStreaks,
  calculateAdherenceScore,
  analyzeDayPatterns,
  detectPlateauStatistical,
  calculateProgressRate,
  calculateEWMA,
  analyzeMacroConsistency,
  generateWeeklyReportCard,
};

export type {
  WeightedRegressionResult,
  AnomalyResult,
  AnomalyEntry,
  CorrelationResult,
  StreakAnalyticsResult,
  AdherenceResult,
  DayAnalysis,
  PlateauDetectionResult,
  ProgressRateResult,
  EWMAResult,
  MacroConsistencyResult,
  WeeklyReportCard,
  TrendResult,
};
