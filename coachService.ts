
import { UserProfile, MealPlanEntry } from '../types';

interface CoachRecommendation {
    newCalorieTarget: number;
    reason: string;
    direction: 'maintain' | 'increase' | 'decrease';
    weeklyChangeKg: number;
}

/**
 * Calculates the dynamic TDEE adjustment based on weight trends and intake.
 * This effectively copies the "MacroFactor" algorithm (simplified).
 */
export const calculateDynamicTDEE = (
    profile: UserProfile, 
    mealHistory: MealPlanEntry[]
): CoachRecommendation => {
    
    // 1. Get last 2 weeks of data
    const now = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(now.getDate() - 14);
    
    const relevantWeight = profile.weightHistory.filter(w => new Date(w.date) >= twoWeeksAgo);
    
    // Minimum data requirement: need start and end of a week
    if (relevantWeight.length < 2) {
        return {
            newCalorieTarget: profile.dailyCalorieGoal,
            reason: "Log your weight for at least 3 days to get smart adjustments.",
            direction: 'maintain',
            weeklyChangeKg: 0
        };
    }

    // 2. Calculate Weekly Average Weight Change
    // Simple linear regression or start/end avg for MVP
    const sortedWeight = relevantWeight.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstWeight = sortedWeight[0].weight;
    const lastWeight = sortedWeight[sortedWeight.length - 1].weight;
    const daysDiff = (new Date(lastWeight).getTime() - new Date(firstWeight).getTime()) / (1000 * 3600 * 24) || 1;
    
    const totalChange = lastWeight - firstWeight;
    const weeklyRate = (totalChange / daysDiff) * 7;

    // 3. Compare with Goal
    let suggestion = profile.dailyCalorieGoal;
    let reason = "Your progress is on track.";
    let direction: 'maintain' | 'increase' | 'decrease' = 'maintain';

    if (profile.goal === 'lose_weight') {
        const targetLoss = -0.5; // kg per week
        
        if (weeklyRate > 0) {
            // Gaining weight while trying to lose
            suggestion -= 250;
            reason = `You gained ${weeklyRate.toFixed(2)}kg/week. Let's reduce calories to get back on track.`;
            direction = 'decrease';
        } else if (weeklyRate > targetLoss + 0.1) {
            // Losing too slowly (e.g. -0.1)
            suggestion -= 100;
            reason = `Loss is slow (${weeklyRate.toFixed(2)}kg/week). A small deficit increase will help.`;
            direction = 'decrease';
        } else if (weeklyRate < targetLoss - 0.5) {
            // Losing too fast (e.g. -1.5kg)
            suggestion += 150;
            reason = `You're losing fast (${weeklyRate.toFixed(2)}kg/week)! Let's eat a bit more to preserve muscle.`;
            direction = 'increase';
        }
    } else if (profile.goal === 'build_muscle') {
        const targetGain = 0.25; // kg per week
        
        if (weeklyRate < 0) {
            // Losing weight while trying to build
            suggestion += 250;
            reason = `You lost weight. We need more fuel for muscle growth.`;
            direction = 'increase';
        } else if (weeklyRate < targetGain - 0.1) {
            // Gaining too slow
            suggestion += 100;
            reason = `Gain is slow (${weeklyRate.toFixed(2)}kg/week). Increasing surplus.`;
            direction = 'increase';
        } else if (weeklyRate > targetGain + 0.3) {
            // Gaining too fast (fat gain risk)
            suggestion -= 150;
            reason = `Gaining fast (${weeklyRate.toFixed(2)}kg/week). Pulling back to minimize fat gain.`;
            direction = 'decrease';
        }
    }

    return {
        newCalorieTarget: Math.round(suggestion),
        reason,
        direction,
        weeklyChangeKg: weeklyRate
    };
};
