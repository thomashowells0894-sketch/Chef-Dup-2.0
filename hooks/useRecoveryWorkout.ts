import { useMemo } from 'react';

interface RecoveryWorkoutAdvice {
  intensity: 'rest' | 'light' | 'moderate' | 'full';
  recommendation: string;
  suggestedTypes: string[];
  maxDuration: number;
  avoidTypes: string[];
}

export function useRecoveryWorkout(recoveryScore?: number, sleepHours?: number): RecoveryWorkoutAdvice {
  return useMemo(() => {
    if (recoveryScore == null) {
      return {
        intensity: 'moderate',
        recommendation: 'No recovery data available. Listen to your body.',
        suggestedTypes: ['Strength', 'Cardio', 'HIIT'],
        maxDuration: 60,
        avoidTypes: [],
      };
    }

    if (recoveryScore < 30) {
      return {
        intensity: 'rest',
        recommendation: 'Your body needs rest. Consider a rest day or very light activity.',
        suggestedTypes: ['Walking', 'Stretching', 'Yoga', 'Breathing'],
        maxDuration: 20,
        avoidTypes: ['HIIT', 'Heavy Lifting', 'Sprints'],
      };
    }

    if (recoveryScore < 50) {
      return {
        intensity: 'light',
        recommendation: 'Recovery is low. Stick to light, low-impact work.',
        suggestedTypes: ['Light Cardio', 'Yoga', 'Mobility', 'Swimming'],
        maxDuration: 35,
        avoidTypes: ['HIIT', 'Heavy Compound Lifts'],
      };
    }

    if (recoveryScore < 70) {
      return {
        intensity: 'moderate',
        recommendation: 'Moderate recovery. You can train but avoid maximal effort.',
        suggestedTypes: ['Strength', 'Moderate Cardio', 'Hypertrophy'],
        maxDuration: 50,
        avoidTypes: ['Max Effort Sets'],
      };
    }

    return {
      intensity: 'full',
      recommendation: 'Great recovery! You\'re cleared for intense training.',
      suggestedTypes: ['HIIT', 'Heavy Strength', 'Sprints', 'CrossFit'],
      maxDuration: 75,
      avoidTypes: [],
    };
  }, [recoveryScore, sleepHours]);
}
