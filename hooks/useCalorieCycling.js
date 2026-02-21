import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '../context/ProfileContext';

const STORAGE_KEY = '@fueliq_calorie_cycling';

// Day type constants
export const DAY_TYPES = {
  training: 'training',
  rest: 'rest',
  refeed: 'refeed',
  medium: 'medium',
};

// Cycling pattern definitions
export const CYCLING_PATTERNS = {
  standard: {
    key: 'standard',
    label: 'Standard Cycling',
    description: 'High/Low toggle between training and rest days',
    shortDesc: 'High/Low Days',
    icon: 'TrendingUp',
    color: '#00D4FF',
    // Default weekly layout: 4 training, 3 rest
    defaultWeek: ['training', 'rest', 'training', 'rest', 'training', 'training', 'rest'],
  },
  carbCycling: {
    key: 'carbCycling',
    label: 'Carb Cycling',
    description: '3-tier system with high, medium, and low carb days',
    shortDesc: '3-Tier System',
    icon: 'BarChart3',
    color: '#00E676',
    // Default: 2 high, 3 medium, 2 low
    defaultWeek: ['training', 'medium', 'training', 'rest', 'medium', 'training', 'rest'],
  },
  aggressiveCut: {
    key: 'aggressiveCut',
    label: 'Aggressive Cut + Refeed',
    description: 'Deep deficit with strategic refeed days',
    shortDesc: 'Cut + Refeed',
    icon: 'Zap',
    color: '#FF6B35',
    // Default: 5 low, 1 medium, 1 refeed
    defaultWeek: ['rest', 'rest', 'rest', 'rest', 'rest', 'medium', 'refeed'],
  },
};

// Macro splits per day type per pattern
const MACRO_SPLITS = {
  standard: {
    training: { protein: 25, carbs: 50, fat: 25 },
    rest: { protein: 40, carbs: 25, fat: 35 },
  },
  carbCycling: {
    training: { protein: 25, carbs: 50, fat: 25 },   // High carb
    medium: { protein: 35, carbs: 35, fat: 30 },       // Medium carb
    rest: { protein: 40, carbs: 25, fat: 35 },         // Low carb
  },
  aggressiveCut: {
    training: { protein: 35, carbs: 40, fat: 25 },
    medium: { protein: 40, carbs: 30, fat: 30 },
    rest: { protein: 45, carbs: 20, fat: 35 },
    refeed: { protein: 25, carbs: 60, fat: 15 },
  },
};

// Calorie adjustments per day type per pattern (as fraction of TDEE)
const CALORIE_ADJUSTMENTS = {
  standard: {
    training: 1.15,   // TDEE + 15%
    rest: 0.85,        // TDEE - 15%
  },
  carbCycling: {
    training: 1.20,   // TDEE + 20%
    medium: 1.0,       // TDEE
    rest: 0.80,        // TDEE - 20%
  },
  aggressiveCut: {
    training: 0.85,    // Mild deficit on training
    medium: 0.75,      // Moderate deficit
    rest: 0.65,        // Deep deficit
    refeed: 1.25,      // Maintenance + 25%
  },
};

// Day labels
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function useCalorieCycling() {
  const { profile, calculatedGoals } = useProfile();
  const [selectedPattern, setSelectedPattern] = useState('standard');
  const [weekSchedule, setWeekSchedule] = useState(CYCLING_PATTERNS.standard.defaultWeek);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved state
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.selectedPattern) setSelectedPattern(parsed.selectedPattern);
          if (parsed.weekSchedule) setWeekSchedule(parsed.weekSchedule);
        }
      } catch (e) {
        // Ignore load errors
      }
      setIsLoading(false);
    })();
  }, []);

  // Persist state changes
  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      selectedPattern,
      weekSchedule,
    })).catch(() => {});
  }, [selectedPattern, weekSchedule, isLoading]);

  // Base TDEE from profile
  const baseTDEE = useMemo(() => {
    return profile.tdee || 2000;
  }, [profile.tdee]);

  // Base calorie goal (with deficit/surplus already applied)
  const baseCalorieGoal = useMemo(() => {
    return calculatedGoals?.calories || 2000;
  }, [calculatedGoals]);

  // Change pattern and reset week schedule to default
  const changePattern = useCallback((patternKey) => {
    const pattern = CYCLING_PATTERNS[patternKey];
    if (!pattern) return;
    setSelectedPattern(patternKey);
    setWeekSchedule([...pattern.defaultWeek]);
  }, []);

  // Toggle a specific day's type
  const toggleDayType = useCallback((dayIndex) => {
    setWeekSchedule(prev => {
      const updated = [...prev];
      const pattern = selectedPattern;
      const availableTypes = pattern === 'carbCycling'
        ? ['training', 'medium', 'rest']
        : pattern === 'aggressiveCut'
          ? ['rest', 'medium', 'refeed', 'training']
          : ['training', 'rest'];

      const currentIndex = availableTypes.indexOf(updated[dayIndex]);
      const nextIndex = (currentIndex + 1) % availableTypes.length;
      updated[dayIndex] = availableTypes[nextIndex];
      return updated;
    });
  }, [selectedPattern]);

  // Compute calories for a given day type
  const getCaloriesForDayType = useCallback((dayType) => {
    const adjustments = CALORIE_ADJUSTMENTS[selectedPattern];
    if (!adjustments) return baseTDEE;
    const multiplier = adjustments[dayType] || 1.0;
    return Math.round(baseTDEE * multiplier);
  }, [selectedPattern, baseTDEE]);

  // Compute macros for a given day type and calorie target
  const getMacrosForDayType = useCallback((dayType, calories) => {
    const splits = MACRO_SPLITS[selectedPattern];
    if (!splits) return { protein: 0, carbs: 0, fat: 0 };
    const split = splits[dayType] || splits.rest;
    return {
      protein: Math.round((calories * (split.protein / 100)) / 4),
      carbs: Math.round((calories * (split.carbs / 100)) / 4),
      fat: Math.round((calories * (split.fat / 100)) / 9),
    };
  }, [selectedPattern]);

  // Get the full weekly plan
  const weeklyPlan = useMemo(() => {
    return weekSchedule.map((dayType, index) => {
      const calories = getCaloriesForDayType(dayType);
      const macros = getMacrosForDayType(dayType, calories);
      return {
        day: DAY_LABELS[index],
        dayIndex: index,
        dayType,
        calories,
        ...macros,
      };
    });
  }, [weekSchedule, getCaloriesForDayType, getMacrosForDayType]);

  // Get today's day index (0 = Monday)
  const todayIndex = useMemo(() => {
    const jsDay = new Date().getDay(); // 0=Sun, 1=Mon...
    return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon
  }, []);

  // Today's targets
  const todaysTarget = useMemo(() => {
    if (!weeklyPlan[todayIndex]) return null;
    return weeklyPlan[todayIndex];
  }, [weeklyPlan, todayIndex]);

  // Weekly statistics
  const weeklyStats = useMemo(() => {
    const totalCalories = weeklyPlan.reduce((sum, d) => sum + d.calories, 0);
    const avgCalories = Math.round(totalCalories / 7);
    const maintenanceWeekly = baseTDEE * 7;
    const weeklyDeficit = maintenanceWeekly - totalCalories;
    const lbsPerWeek = Math.abs(weeklyDeficit) / 3500;

    const trainingDays = weeklyPlan.filter(d => d.dayType === 'training').length;
    const restDays = weeklyPlan.filter(d => d.dayType === 'rest').length;
    const mediumDays = weeklyPlan.filter(d => d.dayType === 'medium').length;
    const refeedDays = weeklyPlan.filter(d => d.dayType === 'refeed').length;

    const highestDay = Math.max(...weeklyPlan.map(d => d.calories));
    const lowestDay = Math.min(...weeklyPlan.map(d => d.calories));

    return {
      totalCalories,
      avgCalories,
      maintenanceWeekly,
      weeklyDeficit,
      lbsPerWeek: Math.round(lbsPerWeek * 100) / 100,
      isDeficit: weeklyDeficit > 0,
      isSurplus: weeklyDeficit < 0,
      trainingDays,
      restDays,
      mediumDays,
      refeedDays,
      highestDay,
      lowestDay,
      calorieRange: highestDay - lowestDay,
    };
  }, [weeklyPlan, baseTDEE]);

  // Refeed recommendation (for aggressive cut pattern)
  const refeedRecommendation = useMemo(() => {
    // Estimate based on body fat (if available) or defaults
    const bodyFatEstimate = profile.gender === 'male' ? 18 : 25;
    const deficitPercent = ((baseTDEE - baseCalorieGoal) / baseTDEE) * 100;

    let frequencyDays;
    let urgency;

    if (bodyFatEstimate < 12) {
      frequencyDays = 5;
      urgency = 'high';
    } else if (bodyFatEstimate < 15) {
      frequencyDays = 7;
      urgency = 'high';
    } else if (bodyFatEstimate < 20) {
      frequencyDays = 10;
      urgency = 'medium';
    } else {
      frequencyDays = 14;
      urgency = 'low';
    }

    // Adjust for deficit depth
    if (deficitPercent > 25) {
      frequencyDays = Math.max(5, frequencyDays - 2);
    }

    const refeedCalories = Math.round(baseTDEE * 1.25);
    const refeedMacros = {
      protein: Math.round((refeedCalories * 0.25) / 4),
      carbs: Math.round((refeedCalories * 0.60) / 4),
      fat: Math.round((refeedCalories * 0.15) / 9),
    };

    return {
      frequencyDays,
      urgency,
      refeedCalories,
      refeedMacros,
      bodyFatEstimate,
      deficitPercent: Math.round(deficitPercent),
      message: urgency === 'high'
        ? `Refeed every ${frequencyDays} days recommended at your estimated body fat level`
        : urgency === 'medium'
          ? `A refeed every ${frequencyDays} days will help maintain metabolic rate`
          : `Refeeds every ${frequencyDays} days are optional but can help with adherence`,
    };
  }, [profile.gender, baseTDEE, baseCalorieGoal]);

  // Get macro split percentages for current day type
  const getCurrentMacroSplit = useCallback((dayType) => {
    const splits = MACRO_SPLITS[selectedPattern];
    if (!splits) return { protein: 30, carbs: 40, fat: 30 };
    return splits[dayType] || { protein: 30, carbs: 40, fat: 30 };
  }, [selectedPattern]);

  // Available patterns list
  const patterns = useMemo(() => {
    return Object.values(CYCLING_PATTERNS);
  }, []);

  // Day type display info
  const getDayTypeInfo = useCallback((dayType) => {
    switch (dayType) {
      case 'training':
        return { label: 'Training Day', shortLabel: 'High', color: '#00E676', bgColor: 'rgba(0, 230, 118, 0.15)' };
      case 'rest':
        return { label: 'Rest Day', shortLabel: 'Low', color: '#FF6B35', bgColor: 'rgba(255, 107, 53, 0.15)' };
      case 'medium':
        return { label: 'Medium Day', shortLabel: 'Med', color: '#00D4FF', bgColor: 'rgba(0, 212, 255, 0.15)' };
      case 'refeed':
        return { label: 'Refeed Day', shortLabel: 'Refeed', color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)' };
      default:
        return { label: 'Rest Day', shortLabel: 'Low', color: '#FF6B35', bgColor: 'rgba(255, 107, 53, 0.15)' };
    }
  }, []);

  // Comparison to standard (non-cycling) targets
  const comparisonToStandard = useMemo(() => {
    if (!todaysTarget) return null;
    const diff = todaysTarget.calories - baseCalorieGoal;
    const percentDiff = Math.round((diff / baseCalorieGoal) * 100);
    return {
      difference: diff,
      percentDiff,
      isHigher: diff > 0,
      standardCalories: baseCalorieGoal,
    };
  }, [todaysTarget, baseCalorieGoal]);

  return {
    // State
    selectedPattern,
    weekSchedule,
    isLoading,

    // Actions
    changePattern,
    toggleDayType,

    // Computed
    weeklyPlan,
    todaysTarget,
    todayIndex,
    weeklyStats,
    refeedRecommendation,
    comparisonToStandard,
    patterns,
    baseTDEE,
    baseCalorieGoal,

    // Helpers
    getCaloriesForDayType,
    getMacrosForDayType,
    getCurrentMacroSplit,
    getDayTypeInfo,
  };
}
