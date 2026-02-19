/**
 * getSmartNudge - Pure function that returns contextual nudge messages
 * based on time of day, nutrition progress, and user behavior.
 */

import { detectPlateau } from './analyticsEngine';

interface SmartNudgeInput {
  todayCalories: number;
  calorieGoal: number;
  todayProtein: number;
  proteinGoal: number;
  isFasting: boolean;
  currentStreak: number;
  waterPercentage: number;
  /** Recent weight entries (lbs) for plateau detection */
  weightHistory?: number[];
  /** Sugar content (grams) of the most recently logged food */
  lastFoodSugarGrams?: number;
  /** Calories consumed per meal type — for pacing detection */
  mealCalories?: { breakfast: number; lunch: number; dinner: number; snacks: number };
  /** Day-of-week adherence rates (0-100) for last 4 weeks, indexed Mon=0..Sun=6 */
  weeklyAdherenceByDay?: number[];
}

interface SmartNudge {
  title: string;
  body: string;
  type?: 'insight' | 'warning' | 'celebration' | 'action';
  actionLabel: string | null;
  action: string | null;
}

export function getSmartNudge({ todayCalories, calorieGoal, todayProtein, proteinGoal, isFasting, currentStreak, waterPercentage, weightHistory, lastFoodSugarGrams, mealCalories, weeklyAdherenceByDay }: SmartNudgeInput): SmartNudge | null {
  const hour: number = new Date().getHours();
  const caloriePercent: number = calorieGoal > 0 ? (todayCalories / calorieGoal) * 100 : 0;
  const proteinPercent: number = proteinGoal > 0 ? (todayProtein / proteinGoal) * 100 : 0;
  const proteinRemaining: number = Math.max(0, proteinGoal - todayProtein);
  const caloriesRemaining: number = Math.max(0, calorieGoal - todayCalories);

  // === PREDICTIVE ANALYTICS NUDGES ===

  // Post-meal sugar warning — fires immediately after logging a high-sugar food
  if (lastFoodSugarGrams !== undefined && lastFoodSugarGrams > 30) {
    return {
      title: 'High sugar detected',
      body: 'Pair high-sugar foods with protein to blunt the insulin spike. Try adding Greek yogurt next time.',
      type: 'warning',
      actionLabel: 'Find High-Protein Foods',
      action: 'logFood',
    };
  }

  // Plateau nudge — weight has stalled, suggest a science-backed intervention
  if (weightHistory && weightHistory.length >= 14) {
    const plateauResult = detectPlateau(weightHistory);
    if (plateauResult.isPlateaued && plateauResult.duration) {
      return {
        title: 'Weight plateau detected',
        body: `Your weight has stalled for ${plateauResult.duration} days. Research shows a 2-day refeed at maintenance calories can restart fat loss.`,
        type: 'insight',
        actionLabel: 'Learn More',
        action: 'viewInsights',
      };
    }
  }

  // === MEAL PACING — detect front-loaded calorie days ===

  if (mealCalories && hour < 14 && todayCalories > 0) {
    const usedPercent = calorieGoal > 0 ? (todayCalories / calorieGoal) * 100 : 0;
    // If >50% of budget consumed before 2pm, warn
    if (usedPercent >= 50 && hour < 14) {
      const remaining = Math.max(0, calorieGoal - todayCalories);
      const mealsLeft = (mealCalories.lunch === 0 ? 1 : 0) + (mealCalories.dinner === 0 ? 1 : 0);
      if (mealsLeft > 0) {
        const perMeal = Math.round(remaining / mealsLeft);
        return {
          title: `${Math.round(usedPercent)}% spent before lunch`,
          body: `You've used over half your calorie budget already. Aim for ~${perMeal} cal per remaining meal to stay on track.`,
          type: 'warning',
          actionLabel: 'Find Light Meals',
          action: 'logFood',
        };
      }
    }
  }

  // === WEEKLY PATTERN LEARNING — warn on historically weak days ===

  if (weeklyAdherenceByDay && weeklyAdherenceByDay.length === 7) {
    const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon...6=Sat
    const todayAdherence = weeklyAdherenceByDay[dayIndex];
    if (todayAdherence < 60 && hour >= 7 && hour < 12 && todayCalories === 0) {
      const dayName = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][dayIndex];
      return {
        title: `${dayName} are your weak spot`,
        body: `Your ${dayName.toLowerCase()} adherence is ${Math.round(todayAdherence)}%. Start strong today — log breakfast now to break the pattern.`,
        type: 'insight',
        actionLabel: 'Log Breakfast',
        action: 'logFood',
      };
    }
  }

  // === MORNING INTERVENTIONS (6-11am) ===

  // Morning, no food logged — direct, actionable
  if (hour >= 6 && hour < 11 && todayCalories === 0 && !isFasting) {
    return {
      title: 'Log breakfast now',
      body: 'People who log before 10am are 3x more likely to hit their daily goals. Start strong.',
      actionLabel: 'Log Breakfast',
      action: 'logFood',
    };
  }

  // Fasting and morning — coach through it
  if (isFasting && hour >= 6 && hour < 12) {
    return {
      title: 'Hold the line',
      body: "Your body is burning fat right now. Don't break the fast early \u2014 you're closer to the payoff than you think.",
      actionLabel: null,
      action: null,
    };
  }

  // === MIDDAY INTERVENTIONS (11am-2pm) ===

  // Late morning, still no food — escalated urgency
  if (hour >= 11 && hour < 14 && todayCalories === 0 && !isFasting) {
    return {
      title: 'Zero calories logged',
      body: "It's past 11am and you haven't logged anything. Even a rough estimate keeps you accountable.",
      actionLabel: 'Log Now',
      action: 'logFood',
    };
  }

  // Pace warning — burning through calories too fast before 2pm
  if (hour < 14 && todayCalories > 0 && caloriesRemaining < 200 && caloriesRemaining >= 0) {
    return {
      title: 'On pace to exceed your goal',
      body: 'At your current pace, you may go over today. Consider lighter options for remaining meals.',
      type: 'warning',
      actionLabel: 'Find Light Meals',
      action: 'logFood',
    };
  }

  // === AFTERNOON INTERVENTIONS (2-6pm) ===

  // Afternoon, low protein — specific food recommendations
  if (hour >= 14 && hour < 19 && proteinPercent < 40 && proteinPercent > 0) {
    return {
      title: `${proteinRemaining}g protein to go`,
      body: `You're behind on protein. Fix it now: 3 eggs (18g), chicken breast (31g), or Greek yogurt (15g). Don't let this slide.`,
      actionLabel: 'Find High-Protein Foods',
      action: 'logFood',
    };
  }

  // Water reminder — afternoon, under half
  if (hour >= 14 && hour < 19 && waterPercentage < 50) {
    return {
      title: `Only ${Math.round(waterPercentage)}% hydrated`,
      body: "Dehydration tanks your metabolism and focus. Drink a full glass right now, then log it.",
      actionLabel: 'Log Water',
      action: 'logWater',
    };
  }

  // === EVENING INTERVENTIONS (6pm+) ===

  // Evening, significant calories remaining + low protein — specific guidance
  if (hour >= 18 && caloriesRemaining > 300 && proteinPercent < 70 && todayCalories > 0) {
    return {
      title: `${caloriesRemaining} cal left \u2014 use them wisely`,
      body: `You still need ${proteinRemaining}g protein. Skip the snacks. A protein shake (30g) or salmon fillet (25g) will close the gap.`,
      actionLabel: 'Log Dinner',
      action: 'logFood',
    };
  }

  // Evening, haven't logged much
  if (hour >= 19 && caloriePercent < 50 && todayCalories > 0) {
    return {
      title: "Under 50% \u2014 log dinner",
      body: "Unlogged meals are invisible calories. Your future self needs this data to make progress. Log it.",
      actionLabel: 'Log Dinner',
      action: 'logFood',
    };
  }

  // === ACHIEVEMENT / STATUS NUDGES ===

  // High protein celebration — reward hitting 80%+ of protein goal
  if (proteinPercent >= 80 && proteinGoal > 0) {
    return {
      title: 'Protein goal in sight',
      body: `You're crushing your protein goal today \u2014 ${todayProtein}g of ${proteinGoal}g target hit.`,
      type: 'celebration',
      actionLabel: null,
      action: null,
    };
  }

  // Hit calorie goal perfectly
  if (caloriePercent >= 95 && caloriePercent <= 105) {
    return {
      title: 'Target locked',
      body: "You hit your calorie goal. This is how body composition changes \u2014 one precise day at a time.",
      actionLabel: null,
      action: null,
    };
  }

  // Close to calorie goal
  if (caloriePercent >= 80 && caloriePercent < 95) {
    return {
      title: `${caloriesRemaining} cal to go`,
      body: "You're in the finish zone. A light snack or small portion closes this out perfectly.",
      actionLabel: null,
      action: null,
    };
  }

  // Over calorie goal — honest but forward-looking
  if (caloriePercent > 110) {
    const overBy = Math.round(todayCalories - calorieGoal);
    return {
      title: `${overBy} cal over target`,
      body: "It happened. Don't spiral. Log everything honestly \u2014 the data is what matters. Tomorrow is a clean slate.",
      actionLabel: null,
      action: null,
    };
  }

  // Streak celebration — escalating intensity
  if (currentStreak >= 30) {
    return {
      title: `${currentStreak} days. Elite.`,
      body: "You're in the top 1% of consistency. This isn't luck \u2014 it's discipline. Keep building.",
      actionLabel: null,
      action: null,
    };
  }
  if (currentStreak >= 14) {
    return {
      title: `${currentStreak}-day streak \u2014 unstoppable`,
      body: "Two weeks of daily logging. You've built a habit. Now it's about refining, not just showing up.",
      actionLabel: null,
      action: null,
    };
  }
  if (currentStreak >= 7) {
    return {
      title: `${currentStreak} days strong`,
      body: "A full week of logging. 92% of users quit before this point. You didn't.",
      actionLabel: null,
      action: null,
    };
  }

  // Default — progress-aware
  if (todayCalories > 0) {
    return {
      title: `${Math.round(caloriePercent)}% logged`,
      body: "Keep going. Every entry is a data point your future self will thank you for.",
      actionLabel: null,
      action: null,
    };
  }

  return null;
}
