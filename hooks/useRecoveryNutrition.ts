import { useMemo } from 'react';
import { useMealTotals } from '../context/MealContext';
import { useProfile } from '../context/ProfileContext';

interface RecoveryNutritionAdvice {
  shouldIncreaseProtein: boolean;
  shouldIncreaseCalories: boolean;
  proteinBoost: number;
  calorieBoost: number;
  reason: string;
  recommendations: string[];
}

/**
 * useRecoveryNutrition - Cross-domain recovery-nutrition intelligence.
 *
 * Bridges recovery/sleep data with nutritional advice. When recovery score
 * or sleep quality is low, suggests adjusted macros and specific food
 * recommendations to support the body's recovery process.
 *
 * @param recoveryScore - 0-100 score from recovery tracking (optional)
 * @param sleepQuality - 0-100 score from sleep tracking (optional)
 * @returns Nutritional advice adjusted for recovery state
 */
export function useRecoveryNutrition(
  recoveryScore?: number,
  sleepQuality?: number
): RecoveryNutritionAdvice {
  const { goals } = useMealTotals();
  const { profile } = useProfile();

  return useMemo(() => {
    const advice: RecoveryNutritionAdvice = {
      shouldIncreaseProtein: false,
      shouldIncreaseCalories: false,
      proteinBoost: 0,
      calorieBoost: 0,
      reason: '',
      recommendations: [],
    };

    if (!recoveryScore && !sleepQuality) return advice;

    // Low recovery score = body needs more fuel
    if (recoveryScore != null && recoveryScore < 40) {
      advice.shouldIncreaseProtein = true;
      advice.shouldIncreaseCalories = true;
      advice.proteinBoost = 20;
      advice.calorieBoost = 200;
      advice.reason = 'Low recovery detected';
      advice.recommendations.push(
        'Prioritize protein-rich meals today',
        'Add anti-inflammatory foods (berries, fatty fish, turmeric)',
        'Consider extra hydration (aim for 10+ glasses)',
      );
    } else if (recoveryScore != null && recoveryScore < 60) {
      advice.shouldIncreaseProtein = true;
      advice.proteinBoost = 10;
      advice.reason = 'Moderate recovery';
      advice.recommendations.push(
        'Include protein with every meal',
        'Focus on whole foods over processed',
      );
    }

    // Poor sleep = increased cortisol = need more careful nutrition
    if (sleepQuality != null && sleepQuality < 50) {
      advice.shouldIncreaseCalories = false; // Don't overeat on bad sleep
      advice.recommendations.push(
        'Avoid high-sugar foods (cortisol is already elevated)',
        'Limit caffeine after 2pm to improve tonight\'s sleep',
        'Consider magnesium-rich foods (dark leafy greens, nuts)',
      );
      if (!advice.reason) advice.reason = 'Poor sleep quality';
    }

    // Good recovery + good sleep = can push harder nutritionally
    if (
      recoveryScore != null && recoveryScore >= 80 &&
      sleepQuality != null && sleepQuality >= 70
    ) {
      advice.reason = 'Excellent recovery';
      advice.recommendations.push(
        'Great recovery! Ideal day for higher training volume',
        'Your body can handle a higher protein load today',
      );
    }

    return advice;
  }, [recoveryScore, sleepQuality, goals, profile]);
}
