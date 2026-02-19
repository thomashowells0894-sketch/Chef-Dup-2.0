import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';

declare const __DEV__: boolean;

interface CohortBenchmark {
  avgCalories: number;
  avgProtein: number;
  avgStreak: number;
  avgAdherence: number;
  userPercentile: number;
  cohortSize: number;
  cohortLabel: string;
}

export function useCohortBenchmark(userCalories: number, userProtein: number, userStreak: number) {
  const { profile } = useProfile();
  const [benchmark, setBenchmark] = useState<CohortBenchmark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    (async () => {
      try {
        // Build cohort filter based on user demographics
        const cohortFilters: Record<string, unknown> = {};
        if (profile.gender) cohortFilters.gender = profile.gender;
        if (profile.age) {
          const ageGroup = profile.age < 25 ? '18-24' :
                          profile.age < 35 ? '25-34' :
                          profile.age < 45 ? '35-44' :
                          profile.age < 55 ? '45-54' : '55+';
          cohortFilters.age_group = ageGroup;
        }
        if (profile.weeklyGoal) cohortFilters.goal = profile.weeklyGoal;

        const { data, error } = await supabase.rpc('get_cohort_benchmarks', {
          p_gender: cohortFilters.gender || null,
          p_age_group: cohortFilters.age_group || null,
          p_goal: cohortFilters.goal || null,
        });

        if (!error && data) {
          const percentile = calculatePercentile(userStreak, data.streak_distribution || []);
          setBenchmark({
            avgCalories: data.avg_calories || 0,
            avgProtein: data.avg_protein || 0,
            avgStreak: data.avg_streak || 0,
            avgAdherence: data.avg_adherence || 0,
            userPercentile: percentile,
            cohortSize: data.cohort_size || 0,
            cohortLabel: buildCohortLabel(cohortFilters),
          });
        }
      } catch (err) {
        if (__DEV__) console.error('[Cohort] Benchmark error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile, userCalories, userProtein, userStreak]);

  return { benchmark, loading };
}

function calculatePercentile(value: number, distribution: number[]): number {
  if (!distribution.length) return 50;
  const below = distribution.filter(v => v < value).length;
  return Math.round((below / distribution.length) * 100);
}

function buildCohortLabel(filters: Record<string, unknown>): string {
  const parts: string[] = [];
  if (filters.gender) parts.push(String(filters.gender));
  if (filters.age_group) parts.push(String(filters.age_group));
  if (filters.goal) parts.push(String(filters.goal));
  return parts.join(', ') || 'All Users';
}
