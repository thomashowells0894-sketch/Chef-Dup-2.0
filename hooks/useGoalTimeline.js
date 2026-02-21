import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, differenceInDays } from 'date-fns';

const STORAGE_KEY = '@fueliq_goal_timeline';

export default function useGoalTimeline() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setGoals(JSON.parse(saved));
      } catch (e) {}
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals)).catch(() => {});
  }, [goals, isLoading]);

  // Goal shape: { id, type ('weight'|'measurement'|'fitness'|'habit'|'custom'), name, currentValue, targetValue, unit, startDate, targetDate, milestones: [{value, date, reached}], checkpoints: [{date, value}], emoji, color }
  const addGoal = useCallback((data) => {
    const goal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: data.type || 'custom',
      name: data.name,
      currentValue: data.currentValue,
      startValue: data.currentValue,
      targetValue: data.targetValue,
      unit: data.unit || '',
      startDate: new Date().toISOString(),
      targetDate: data.targetDate || addDays(new Date(), 90).toISOString(),
      milestones: [],
      checkpoints: [{ date: new Date().toISOString(), value: data.currentValue }],
      emoji: data.emoji || '🎯',
      color: data.color || '#00D4FF',
      completed: false,
    };
    setGoals(prev => [...prev, goal]);
    return goal.id;
  }, []);

  const updateGoal = useCallback((id, data) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
  }, []);

  const addCheckpoint = useCallback((goalId, value) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const checkpoints = [...g.checkpoints, { date: new Date().toISOString(), value }];
      const completed = g.type === 'weight'
        ? (g.targetValue < g.startValue ? value <= g.targetValue : value >= g.targetValue)
        : value >= g.targetValue;
      return { ...g, currentValue: value, checkpoints, completed };
    }));
  }, []);

  const deleteGoal = useCallback((id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  // Calculate projection based on current progress rate
  const getProjection = useCallback((goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || goal.checkpoints.length < 2) return null;

    const first = goal.checkpoints[0];
    const last = goal.checkpoints[goal.checkpoints.length - 1];
    const daysPassed = Math.max(1, differenceInDays(new Date(last.date), new Date(first.date)));
    const valueChange = last.value - first.value;
    const dailyRate = valueChange / daysPassed;

    if (Math.abs(dailyRate) < 0.001) return { projectedDate: null, onTrack: false, message: 'Not enough progress data yet' };

    const remaining = goal.targetValue - last.value;
    const daysNeeded = Math.ceil(remaining / dailyRate);
    const projectedDate = addDays(new Date(), daysNeeded);
    const targetDate = new Date(goal.targetDate);
    const onTrack = projectedDate <= targetDate;

    return {
      projectedDate: projectedDate.toISOString(),
      daysNeeded,
      dailyRate: Math.round(dailyRate * 100) / 100,
      onTrack,
      message: onTrack
        ? `On track! Estimated ${format(projectedDate, 'MMM d, yyyy')}`
        : `Behind schedule. Need to increase effort.`,
    };
  }, [goals]);

  const getProgress = useCallback((goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return { percentage: 0, remaining: 0, daysLeft: 0 };

    const total = Math.abs(goal.targetValue - goal.startValue);
    const done = Math.abs(goal.currentValue - goal.startValue);
    const percentage = total > 0 ? Math.min(Math.round((done / total) * 100), 100) : 0;
    const remaining = Math.abs(goal.targetValue - goal.currentValue);
    const daysLeft = Math.max(0, differenceInDays(new Date(goal.targetDate), new Date()));

    return { percentage, remaining, daysLeft, total, done };
  }, [goals]);

  const activeGoals = useMemo(() => goals.filter(g => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.completed), [goals]);

  return {
    goals, activeGoals, completedGoals, isLoading,
    addGoal, updateGoal, addCheckpoint, deleteGoal,
    getProjection, getProgress,
  };
}
