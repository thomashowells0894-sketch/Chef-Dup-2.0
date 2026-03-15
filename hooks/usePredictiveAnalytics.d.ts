export interface WeightTrendResult {
  direction: string;
  slope?: number;
}

export interface PlateauStatusResult {
  isPlateaued: boolean;
}

export interface ScoreResult {
  score: number;
  grade?: string;
}

export interface WeeklyInsight {
  title?: string;
  body?: string;
}

export interface PredictiveAnalyticsResult {
  weightTrend: WeightTrendResult | null;
  plateauStatus: PlateauStatusResult | null;
  weightPrediction: unknown;
  goalProjection: unknown;
  todayNutritionScore: ScoreResult;
  fitnessScore: ScoreResult;
  weeklyInsights: WeeklyInsight[];
}

export function usePredictiveAnalytics(): PredictiveAnalyticsResult;

export default usePredictiveAnalytics;
