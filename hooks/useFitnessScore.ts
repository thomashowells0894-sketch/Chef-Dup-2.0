import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

const STORAGE_KEY = '@fueliq_fitness_score';

interface ScoreHistoryEntry {
  date: string;
  score: number;
}

interface ScoreInput {
  caloriesEaten: number;
  calorieGoal: number;
  proteinEaten: number;
  proteinGoal: number;
  waterGlasses: number;
  waterGoal: number;
  exerciseMinutes: number;
  exerciseGoal?: number;
  sleepHours: number;
  sleepGoal?: number;
  fastCompleted: boolean;
  habitsCompleted: number;
  habitsTotal: number;
}

interface ScoreLabel {
  label: string;
  color: string;
  emoji: string;
}

interface WeeklyScoreEntry {
  date: string;
  day: string;
  score: number;
}

interface UseFitnessScoreReturn {
  scoreHistory: ScoreHistoryEntry[];
  isLoading: boolean;
  calculateScore: (data: ScoreInput) => number;
  saveScore: (score: number) => void;
  getWeeklyScores: () => WeeklyScoreEntry[];
  getAverageScore: () => number;
  getScoreLabel: (score: number) => ScoreLabel;
}

export default function useFitnessScore(): UseFitnessScoreReturn {
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setScoreHistory(JSON.parse(saved) as ScoreHistoryEntry[]);
      } catch (e) {}
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scoreHistory)).catch(() => {});
  }, [scoreHistory, isLoading]);

  // Calculate score from activity data
  const calculateScore = useCallback((data: ScoreInput): number => {
    let score = 0;
    const weights = {
      nutrition: 25, // calories within 10% of goal
      protein: 15,   // protein goal met
      hydration: 15, // water goal met
      exercise: 20,  // exercise minutes
      sleep: 15,     // 7-9 hours
      consistency: 10, // habits + fasting
    };

    // Nutrition (25 pts) - closer to goal = higher
    if (data.calorieGoal > 0) {
      const ratio = data.caloriesEaten / data.calorieGoal;
      const accuracy = 1 - Math.abs(1 - ratio);
      score += Math.max(0, accuracy) * weights.nutrition;
    }

    // Protein (15 pts)
    if (data.proteinGoal > 0) {
      score += Math.min(data.proteinEaten / data.proteinGoal, 1) * weights.protein;
    }

    // Hydration (15 pts)
    if (data.waterGoal > 0) {
      score += Math.min(data.waterGlasses / data.waterGoal, 1) * weights.hydration;
    }

    // Exercise (20 pts) - goal is 30 min
    const exerciseGoal = data.exerciseGoal || 30;
    score += Math.min(data.exerciseMinutes / exerciseGoal, 1) * weights.exercise;

    // Sleep (15 pts) - optimal 7-9 hours
    if (data.sleepHours > 0) {
      const sleepScore = data.sleepHours >= 7 && data.sleepHours <= 9 ? 1 :
        data.sleepHours >= 6 ? 0.7 : data.sleepHours >= 5 ? 0.4 : 0.2;
      score += sleepScore * weights.sleep;
    }

    // Consistency (10 pts)
    let consistencyScore = 0;
    if (data.fastCompleted) consistencyScore += 0.5;
    if (data.habitsTotal > 0) consistencyScore += (data.habitsCompleted / data.habitsTotal) * 0.5;
    score += consistencyScore * weights.consistency;

    return Math.round(score);
  }, []);

  const saveScore = useCallback((score: number): void => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setScoreHistory((prev: ScoreHistoryEntry[]) => {
      const filtered = prev.filter((s: ScoreHistoryEntry) => s.date !== today);
      return [{ date: today, score }, ...filtered].slice(0, 90);
    });
  }, []);

  const getWeeklyScores = useCallback((): WeeklyScoreEntry[] => {
    // Return last 7 days of scores
    const result: WeeklyScoreEntry[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const entry = scoreHistory.find((s: ScoreHistoryEntry) => s.date === dateStr);
      result.push({ date: dateStr, day: format(d, 'EEE'), score: entry?.score || 0 });
    }
    return result;
  }, [scoreHistory]);

  const getAverageScore = useCallback((): number => {
    const recent = scoreHistory.slice(0, 7);
    if (!recent.length) return 0;
    return Math.round(recent.reduce((s: number, e: ScoreHistoryEntry) => s + e.score, 0) / recent.length);
  }, [scoreHistory]);

  const getScoreLabel = useCallback((score: number): ScoreLabel => {
    if (score >= 90) return { label: 'Elite', color: '#FFD700', emoji: '\uD83C\uDFC6' };
    if (score >= 75) return { label: 'Excellent', color: '#00E676', emoji: '\u2B50' };
    if (score >= 60) return { label: 'Good', color: '#00D4FF', emoji: '\uD83D\uDCAA' };
    if (score >= 40) return { label: 'Fair', color: '#FFB300', emoji: '\uD83D\uDCC8' };
    return { label: 'Getting Started', color: '#FF6B35', emoji: '\uD83C\uDF31' };
  }, []);

  return {
    scoreHistory, isLoading, calculateScore, saveScore,
    getWeeklyScores, getAverageScore, getScoreLabel,
  };
}
