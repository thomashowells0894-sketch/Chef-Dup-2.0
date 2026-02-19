import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMealTotals } from '../context/MealContext';
import { useGamification } from '../context/GamificationContext';

const CHALLENGE_KEY = '@vibefit_dynamic_challenges';

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: 'nutrition' | 'streak' | 'logging' | 'exploration';
  target: number;
  current: number;
  completed: boolean;
  generatedDate: string;
}

function generateChallenges(
  avgCalories: number,
  avgProtein: number,
  streak: number,
  todayCalories: number,
  todayProtein: number,
): DailyChallenge[] {
  const today = new Date().toISOString().split('T')[0];
  const challenges: DailyChallenge[] = [];
  const dayOfWeek = new Date().getDay();

  // Challenge 1: Based on weak areas
  if (avgProtein < 100) {
    challenges.push({
      id: `protein-${today}`,
      title: 'Protein Power',
      description: 'Hit 120g+ protein today',
      xpReward: 50,
      type: 'nutrition',
      target: 120,
      current: todayProtein,
      completed: todayProtein >= 120,
      generatedDate: today,
    });
  } else {
    challenges.push({
      id: `balanced-${today}`,
      title: 'Perfect Balance',
      description: 'Keep all macros within 10% of targets',
      xpReward: 75,
      type: 'nutrition',
      target: 1,
      current: 0,
      completed: false,
      generatedDate: today,
    });
  }

  // Challenge 2: Logging-based
  challenges.push({
    id: `log3-${today}`,
    title: 'Triple Logger',
    description: 'Log 3 meals today',
    xpReward: 30,
    type: 'logging',
    target: 3,
    current: 0,
    completed: false,
    generatedDate: today,
  });

  // Challenge 3: Streak-based (dynamic difficulty)
  if (streak > 7) {
    challenges.push({
      id: `streak-extend-${today}`,
      title: 'Streak Guardian',
      description: `Keep your ${streak}-day streak alive with a perfect log day`,
      xpReward: streak > 30 ? 100 : 50,
      type: 'streak',
      target: 1,
      current: 0,
      completed: false,
      generatedDate: today,
    });
  }

  // Challenge 4: Exploration (rotate weekly)
  const explorationChallenges = [
    { title: 'Water Warrior', description: 'Log 8+ glasses of water', target: 8 },
    { title: 'New Food Explorer', description: 'Log a food you haven\'t eaten this week', target: 1 },
    { title: 'Meal Prep Master', description: 'Plan tomorrow\'s meals using AI Meal Plan', target: 1 },
    { title: 'Macro Tracker', description: 'Log every meal with complete macros', target: 1 },
    { title: 'Early Bird', description: 'Log breakfast before 9am', target: 1 },
    { title: 'Snapshot', description: 'Take a progress photo', target: 1 },
    { title: 'Mindful Eater', description: 'Write a food journal entry', target: 1 },
  ];
  const exploration = explorationChallenges[dayOfWeek];
  challenges.push({
    id: `explore-${today}`,
    title: exploration.title,
    description: exploration.description,
    xpReward: 40,
    type: 'exploration',
    target: exploration.target,
    current: 0,
    completed: false,
    generatedDate: today,
  });

  return challenges;
}

export function useDynamicChallenges() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const { totals, goals } = useMealTotals();
  const { currentStreak, awardXP } = useGamification();

  // Load or generate challenges
  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const raw = await AsyncStorage.getItem(CHALLENGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.date === today && cached.challenges) {
            setChallenges(cached.challenges);
            return;
          }
        }
      } catch {}

      // Generate new challenges
      const newChallenges = generateChallenges(
        0, // avgCalories - will be refined as data comes in
        0, // avgProtein
        currentStreak || 0,
        totals?.calories || 0,
        totals?.protein || 0,
      );
      setChallenges(newChallenges);
      await AsyncStorage.setItem(CHALLENGE_KEY, JSON.stringify({ date: today, challenges: newChallenges }));
    })();
  }, []);

  // Update progress reactively
  useEffect(() => {
    if (!totals || challenges.length === 0) return;

    const updated = challenges.map(c => {
      if (c.completed) return c;

      if (c.id.startsWith('protein-')) {
        const newCurrent = totals.protein || 0;
        return { ...c, current: newCurrent, completed: newCurrent >= c.target };
      }
      return c;
    });

    const hasChanges = updated.some((c, i) => c.completed !== challenges[i].completed);
    if (hasChanges) {
      setChallenges(updated);
      // Save and award XP for newly completed
      const today = new Date().toISOString().split('T')[0];
      AsyncStorage.setItem(CHALLENGE_KEY, JSON.stringify({ date: today, challenges: updated }));

      updated.forEach((c, i) => {
        if (c.completed && !challenges[i].completed) {
          awardXP?.('COMPLETE_CHALLENGE', `Challenge: ${c.title}`);
        }
      });
    }
  }, [totals, challenges]);

  const completeChallenge = useCallback(async (id: string) => {
    const updated = challenges.map(c =>
      c.id === id ? { ...c, completed: true, current: c.target } : c
    );
    setChallenges(updated);
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(CHALLENGE_KEY, JSON.stringify({ date: today, challenges: updated }));

    const challenge = updated.find(c => c.id === id);
    if (challenge) {
      awardXP?.('COMPLETE_CHALLENGE', `Challenge: ${challenge.title}`);
    }
  }, [challenges, awardXP]);

  return { challenges, completeChallenge };
}

export type { DailyChallenge };
