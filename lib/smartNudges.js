/**
 * getSmartNudge - Pure function that returns contextual nudge messages
 * based on time of day, nutrition progress, and user behavior.
 */
export function getSmartNudge({ todayCalories, calorieGoal, todayProtein, proteinGoal, isFasting, currentStreak, waterPercentage }) {
  const hour = new Date().getHours();
  const caloriePercent = calorieGoal > 0 ? (todayCalories / calorieGoal) * 100 : 0;
  const proteinPercent = proteinGoal > 0 ? (todayProtein / proteinGoal) * 100 : 0;

  // Morning, no food logged
  if (hour >= 6 && hour < 11 && todayCalories === 0 && !isFasting) {
    return { title: 'Good morning!', body: 'Ready to log breakfast? Starting early helps you stay on track.', actionLabel: 'Log Breakfast', action: 'logFood' };
  }

  // Late morning, still no food
  if (hour >= 11 && hour < 14 && todayCalories === 0 && !isFasting) {
    return { title: "Haven't logged yet today", body: "It's almost lunchtime \u2014 don't forget to track your meals.", actionLabel: 'Log Food', action: 'logFood' };
  }

  // Fasting and morning
  if (isFasting && hour >= 6 && hour < 12) {
    return { title: 'Stay strong!', body: "You're in your fasting window. Keep going \u2014 the results are worth it.", actionLabel: null, action: null };
  }

  // Afternoon, low protein
  if (hour >= 14 && proteinPercent < 40 && proteinPercent > 0) {
    return { title: 'Protein check', body: `You're at ${Math.round(proteinPercent)}% of your protein goal. Try adding chicken, eggs, or Greek yogurt.`, actionLabel: 'Find Protein Foods', action: 'logFood' };
  }

  // Close to calorie goal
  if (caloriePercent >= 80 && caloriePercent < 100) {
    return { title: 'Almost there!', body: `${Math.round(calorieGoal - todayCalories)} cal remaining \u2014 you're crushing it today.`, actionLabel: null, action: null };
  }

  // Over calorie goal
  if (caloriePercent > 110) {
    return { title: 'Over target today', body: `You're ${Math.round(todayCalories - calorieGoal)} cal over \u2014 that's okay! One day doesn't define your journey.`, actionLabel: null, action: null };
  }

  // Hit calorie goal
  if (caloriePercent >= 95 && caloriePercent <= 105) {
    return { title: 'Nailed it!', body: 'You hit your calorie goal perfectly. Consistency like this is how results happen.', actionLabel: null, action: null };
  }

  // Streak celebration
  if (currentStreak >= 7) {
    return { title: `${currentStreak}-day streak!`, body: "You're building serious momentum. Most people give up by day 3 \u2014 you're different.", actionLabel: null, action: null };
  }

  // Water reminder
  if (hour >= 14 && waterPercentage < 50) {
    return { title: 'Hydration check', body: `You're at ${Math.round(waterPercentage)}% of your water goal. Grab a glass!`, actionLabel: 'Log Water', action: 'logWater' };
  }

  // Evening, haven't logged much
  if (hour >= 19 && caloriePercent < 50 && todayCalories > 0) {
    return { title: "Don't forget dinner", body: "You're under 50% of your goal \u2014 make sure to log your evening meal.", actionLabel: 'Log Dinner', action: 'logFood' };
  }

  // Default encouraging message
  if (todayCalories > 0) {
    return { title: 'Keep it up!', body: `${Math.round(caloriePercent)}% of your daily goal logged. Every entry counts.`, actionLabel: null, action: null };
  }

  return null;
}
