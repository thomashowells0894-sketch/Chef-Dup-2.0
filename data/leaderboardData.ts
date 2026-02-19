// VibeFit Leaderboard - Categories and types
// Simulated/fake users have been removed. The leaderboard now shows only
// real users fetched from Supabase. If there are no real users, the
// leaderboard will show an empty state instead of fabricated data.

interface LeaderboardUser {
  name: string;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  workouts: number;
  calories_accuracy: number;
  userId?: string;
  previousRank?: number | null;
  isFallback?: boolean;
}

interface LeaderboardCategory {
  id: string;
  name: string;
  emoji: string;
  key: keyof Pick<LeaderboardUser, 'xp' | 'streak' | 'workouts' | 'calories_accuracy'>;
  format: (v: number) => string;
}

/**
 * @deprecated Simulated users have been removed. This array is kept empty
 * for backward compatibility but should not be relied upon. The leaderboard
 * screen now exclusively uses real user data from Supabase.
 */
export const SIMULATED_USERS: LeaderboardUser[] = [];

export const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  { id: 'xp', name: 'Total XP', emoji: '\u26A1', key: 'xp', format: (v: number) => `${v.toLocaleString()} XP` },
  { id: 'streak', name: 'Streak', emoji: '\u{1F525}', key: 'streak', format: (v: number) => `${v} days` },
  { id: 'workouts', name: 'Workouts', emoji: '\u{1F4AA}', key: 'workouts', format: (v: number) => `${v} sessions` },
  { id: 'accuracy', name: 'Nutrition', emoji: '\u{1F3AF}', key: 'calories_accuracy', format: (v: number) => `${v}%` },
];

export type { LeaderboardUser, LeaderboardCategory };
