import { useMemo } from 'react';

interface ChurnSignals {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  signals: string[];
  interventions: string[];
}

interface UserBehavior {
  daysActive: number;
  daysSinceLastLog: number;
  currentStreak: number;
  peakStreak: number;
  weeklyLogFrequency: number; // logs per week (rolling 2 weeks)
  previousWeeklyLogFrequency: number;
  featuresUsed: number; // out of total
  socialConnections: number;
  hasPremium: boolean;
}

export function useChurnDetection(behavior: UserBehavior | null): ChurnSignals {
  return useMemo(() => {
    if (!behavior) {
      return { riskLevel: 'low', riskScore: 0, signals: [], interventions: [] };
    }

    let riskScore = 0;
    const signals: string[] = [];
    const interventions: string[] = [];

    // Signal 1: Days since last log (strongest predictor)
    if (behavior.daysSinceLastLog > 7) {
      riskScore += 40;
      signals.push(`No activity for ${behavior.daysSinceLastLog} days`);
      interventions.push('win_back_notification');
    } else if (behavior.daysSinceLastLog > 3) {
      riskScore += 20;
      signals.push(`${behavior.daysSinceLastLog} days since last log`);
      interventions.push('streak_reminder');
    } else if (behavior.daysSinceLastLog > 1) {
      riskScore += 5;
    }

    // Signal 2: Declining frequency
    if (behavior.previousWeeklyLogFrequency > 0) {
      const frequencyDrop = 1 - (behavior.weeklyLogFrequency / behavior.previousWeeklyLogFrequency);
      if (frequencyDrop > 0.5) {
        riskScore += 25;
        signals.push('Logging frequency dropped >50%');
        interventions.push('re_engagement_challenge');
      } else if (frequencyDrop > 0.25) {
        riskScore += 10;
        signals.push('Logging frequency declining');
      }
    }

    // Signal 3: Broken streak (especially long ones)
    if (behavior.peakStreak > 7 && behavior.currentStreak === 0) {
      riskScore += 15;
      signals.push(`Lost a ${behavior.peakStreak}-day streak`);
      interventions.push('streak_repair_offer');
    }

    // Signal 4: Low feature adoption
    if (behavior.featuresUsed < 3) {
      riskScore += 10;
      signals.push('Few features explored');
      interventions.push('feature_discovery_tour');
    }

    // Protective factors (reduce risk)
    if (behavior.socialConnections > 0) riskScore -= 10;
    if (behavior.hasPremium) riskScore -= 15;
    if (behavior.currentStreak > 14) riskScore -= 15;

    riskScore = Math.max(0, Math.min(100, riskScore));

    const riskLevel: ChurnSignals['riskLevel'] =
      riskScore >= 60 ? 'critical' :
      riskScore >= 40 ? 'high' :
      riskScore >= 20 ? 'medium' : 'low';

    return { riskLevel, riskScore, signals, interventions };
  }, [behavior]);
}
