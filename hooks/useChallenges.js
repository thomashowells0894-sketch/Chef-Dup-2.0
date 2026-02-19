/**
 * useChallenges - Community challenges, competitions, auto-sync, and team support
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CHALLENGE_TYPES = {
  steps: { label: 'Step Challenge', icon: '\uD83D\uDC5F', unit: 'steps', defaultGoal: 70000 },
  calories_burned: { label: 'Calorie Burn', icon: '\uD83D\uDD25', unit: 'kcal', defaultGoal: 3500 },
  workouts: { label: 'Workout Streak', icon: '\uD83D\uDCAA', unit: 'workouts', defaultGoal: 5 },
  water: { label: 'Hydration Challenge', icon: '\uD83D\uDCA7', unit: 'ml', defaultGoal: 17500 },
  protein: { label: 'Protein Power', icon: '\uD83E\uDD69', unit: 'g', defaultGoal: 1050 },
  logging: { label: 'Logging Streak', icon: '\uD83D\uDCDD', unit: 'days', defaultGoal: 7 },
  meditation: { label: 'Mindfulness', icon: '\uD83E\uDDD8', unit: 'minutes', defaultGoal: 70 },
  sleep: { label: 'Sleep Challenge', icon: '\uD83D\uDE34', unit: 'hours', defaultGoal: 56 },
};

/**
 * Calculate challenge progress from user data based on challenge type.
 * @param {Object} challenge - The challenge object with type, startDate, endDate, goal
 * @param {Object} userData - Object with health/app data:
 *   { stepCount, activeCalories, workoutHistory, waterIntake, proteinTotal,
 *     foodLogDays, breathingSessions, sleepHours }
 * @returns {number} Calculated progress value
 */
export function syncChallengeProgress(challenge, userData) {
  if (!challenge || !userData) return 0;

  switch (challenge.type) {
    case 'steps':
      return userData.stepCount || 0;

    case 'calories_burned':
      return userData.activeCalories || 0;

    case 'workouts': {
      // Count workouts within the challenge period
      const start = new Date(challenge.startDate);
      const end = new Date(challenge.endDate);
      const history = userData.workoutHistory || [];
      return history.filter(w => {
        const d = new Date(w.date || w.created_at);
        return d >= start && d <= end;
      }).length;
    }

    case 'water':
      return userData.waterIntake || 0;

    case 'protein':
      return userData.proteinTotal || 0;

    case 'logging': {
      // Count distinct days with food logged in challenge period
      const start = new Date(challenge.startDate);
      const end = new Date(challenge.endDate);
      const logDays = userData.foodLogDays || [];
      return logDays.filter(d => {
        const date = new Date(d);
        return date >= start && date <= end;
      }).length;
    }

    case 'meditation': {
      // Sum breathing/meditation session minutes
      const sessions = userData.breathingSessions || [];
      const start = new Date(challenge.startDate);
      const end = new Date(challenge.endDate);
      return sessions
        .filter(s => {
          const d = new Date(s.date || s.created_at);
          return d >= start && d <= end;
        })
        .reduce((sum, s) => sum + (s.duration || 0), 0);
    }

    case 'sleep': {
      // Sum sleep hours within challenge period
      const sleepData = userData.sleepHours || [];
      const start = new Date(challenge.startDate);
      const end = new Date(challenge.endDate);
      return sleepData
        .filter(s => {
          const d = new Date(s.date || s.created_at);
          return d >= start && d <= end;
        })
        .reduce((sum, s) => sum + (s.hours || 0), 0);
    }

    default:
      return 0;
  }
}

export function useChallenges() {
  const { user } = useAuth();
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [availableChallenges, setAvailableChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const syncInProgressRef = useRef(false);

  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [activeResult, availableResult, completedResult] = await Promise.all([
        supabase.from('challenge_participants').select('*, challenges(*)').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('challenges').select('*, challenge_participants(user_id)').eq('status', 'active').gte('end_date', new Date().toISOString()),
        supabase.from('challenge_participants').select('*, challenges(*)').eq('user_id', user.id).eq('status', 'completed').order('completed_at', { ascending: false }).limit(20),
      ]);

      if (activeResult.data) setActiveChallenges(activeResult.data.map(formatChallenge));
      if (availableResult.data) {
        const notJoined = availableResult.data.filter(c => !c.challenge_participants?.some(p => p.user_id === user.id));
        setAvailableChallenges(notJoined.map(formatAvailableChallenge));
      }
      if (completedResult.data) setCompletedChallenges(completedResult.data.map(formatChallenge));
    } catch (error) {
      if (__DEV__) console.error('[Challenges] Fetch error:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  /**
   * Auto-sync: when active challenges change, attempt to sync progress
   * using available data from the app. This effect uses a ref to prevent
   * concurrent syncs.
   */
  useEffect(() => {
    if (!user || activeChallenges.length === 0 || syncInProgressRef.current) return;

    const runSync = async () => {
      syncInProgressRef.current = true;
      try {
        // Gather user data from various sources for auto-sync
        const userData = await gatherUserData(user.id);
        if (!userData) return;

        for (const challenge of activeChallenges) {
          const newProgress = syncChallengeProgress(challenge, userData);
          // Only update if progress actually increased
          if (newProgress > challenge.progress) {
            await supabase
              .from('challenge_participants')
              .update({ progress: newProgress, updated_at: new Date().toISOString() })
              .eq('challenge_id', challenge.challengeId)
              .eq('user_id', user.id);

            // Check if challenge is now complete
            if (newProgress >= challenge.goal) {
              await supabase
                .from('challenge_participants')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('challenge_id', challenge.challengeId)
                .eq('user_id', user.id);
            }
          }
        }

        // Refresh challenges to reflect updated progress
        await fetchChallenges();
      } catch (error) {
        if (__DEV__) console.error('[Challenges] Auto-sync error:', error.message);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    // Debounce sync to avoid rapid successive calls
    const timer = setTimeout(runSync, 2000);
    return () => clearTimeout(timer);
  }, [user, activeChallenges.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const joinChallenge = useCallback(async (challengeId, teamId) => {
    if (!user) return false;
    try {
      const insertData = { challenge_id: challengeId, user_id: user.id, status: 'active', progress: 0 };
      if (teamId) insertData.team_id = teamId;
      const { error } = await supabase.from('challenge_participants').insert(insertData);
      if (error) throw error;
      await fetchChallenges();
      return true;
    } catch { return false; }
  }, [user, fetchChallenges]);

  const updateProgress = useCallback(async (challengeId, progress) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('challenge_participants').update({ progress, updated_at: new Date().toISOString() }).eq('challenge_id', challengeId).eq('user_id', user.id);
      if (error) throw error;
      setActiveChallenges(prev => prev.map(c => c.challengeId === challengeId ? { ...c, progress } : c));
      return true;
    } catch { return false; }
  }, [user]);

  const createChallenge = useCallback(async (challengeData) => {
    if (!user) return null;
    try {
      const insertData = {
        creator_id: user.id,
        type: challengeData.type,
        title: challengeData.title,
        description: challengeData.description,
        goal: challengeData.goal,
        start_date: challengeData.startDate,
        end_date: challengeData.endDate,
        status: 'active',
        max_participants: challengeData.maxParticipants || 50,
        reward_xp: challengeData.rewardXP || 100,
      };

      const { data, error } = await supabase
        .from('challenges')
        .insert(insertData)
        .select().single();
      if (error) throw error;
      // Auto-join as creator
      await joinChallenge(data.id);
      return data;
    } catch { return null; }
  }, [user, joinChallenge]);

  const getLeaderboard = useCallback(async (challengeId) => {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('*, profiles!challenge_participants_user_id_fkey(name, avatar_url)')
        .eq('challenge_id', challengeId)
        .order('progress', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((p, idx) => ({
        rank: idx + 1, userId: p.user_id, userName: p.profiles?.name || 'Anonymous',
        avatarUrl: p.profiles?.avatar_url, progress: p.progress, isCurrentUser: p.user_id === user?.id,
        teamId: p.team_id || null,
      }));
    } catch { return []; }
  }, [user]);

  // --- Team Challenge Support ---

  /**
   * Create a team for a challenge.
   * @param {string} challengeId - The challenge to create a team for
   * @param {string} name - Team name
   */
  const createTeam = useCallback(async (challengeId, name) => {
    if (!user || !name?.trim()) return null;
    try {
      const { data, error } = await supabase
        .from('challenge_teams')
        .insert({ challenge_id: challengeId, name: name.trim(), created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      if (__DEV__) console.error('[Challenges] Create team error:', error.message);
      return null;
    }
  }, [user]);

  /**
   * Join a team within a challenge. Updates the participant's team_id.
   * @param {string} challengeId - The challenge ID
   * @param {string} teamId - The team ID to join
   */
  const joinTeam = useCallback(async (challengeId, teamId) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .update({ team_id: teamId })
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id);
      if (error) throw error;
      await fetchChallenges();
      return true;
    } catch (error) {
      if (__DEV__) console.error('[Challenges] Join team error:', error.message);
      return false;
    }
  }, [user, fetchChallenges]);

  /**
   * Get team aggregate progress for a challenge.
   * Returns an array of teams with their combined progress.
   * @param {string} challengeId
   */
  const getTeamProgress = useCallback(async (challengeId) => {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('team_id, progress, profiles!challenge_participants_user_id_fkey(name, avatar_url), challenge_teams!challenge_participants_team_id_fkey(name)')
        .eq('challenge_id', challengeId)
        .not('team_id', 'is', null);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by team
      const teamMap = {};
      for (const p of data) {
        const tid = p.team_id;
        if (!teamMap[tid]) {
          teamMap[tid] = {
            teamId: tid,
            teamName: p.challenge_teams?.name || 'Unnamed Team',
            totalProgress: 0,
            members: [],
          };
        }
        teamMap[tid].totalProgress += p.progress || 0;
        teamMap[tid].members.push({
          userName: p.profiles?.name || 'Anonymous',
          avatarUrl: p.profiles?.avatar_url,
          progress: p.progress || 0,
        });
      }

      return Object.values(teamMap).sort((a, b) => b.totalProgress - a.totalProgress);
    } catch (error) {
      if (__DEV__) console.error('[Challenges] Team progress error:', error.message);
      return [];
    }
  }, []);

  /**
   * Invite friends to a challenge by creating notifications / friend activity entries.
   * @param {string} challengeId - The challenge to invite to
   * @param {string[]} friendUserIds - Array of friend user IDs to invite
   * @param {string} challengeTitle - The title of the challenge (for the notification text)
   */
  const inviteFriendsToChallenge = useCallback(async (challengeId, friendUserIds, challengeTitle) => {
    if (!user || !challengeId || !friendUserIds?.length) return false;
    try {
      // Insert friend_activity entries as invitations for each friend
      const invitations = friendUserIds.map(friendId => ({
        user_id: user.id,
        activity_type: 'challenge_invite',
        title: `Invited you to join "${challengeTitle || 'a challenge'}"`,
        metadata: { challenge_id: challengeId, invited_user_id: friendId },
      }));

      const { error } = await supabase.from('friend_activity').insert(invitations);
      if (error) throw error;
      return true;
    } catch (error) {
      if (__DEV__) console.error('[Challenges] Invite friends error:', error.message);
      return false;
    }
  }, [user]);

  /**
   * Check and auto-complete challenges that have reached their goal.
   * Awards XP to the user's profile when a challenge is completed.
   */
  const checkAndAutoComplete = useCallback(async () => {
    if (!user || activeChallenges.length === 0) return;
    try {
      for (const challenge of activeChallenges) {
        if (challenge.progress >= challenge.goal && challenge.status === 'active') {
          // Mark as completed
          const { error: updateError } = await supabase
            .from('challenge_participants')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('challenge_id', challenge.challengeId)
            .eq('user_id', user.id);

          if (updateError) continue;

          // Award XP by incrementing profile total_xp
          const rewardXP = challenge.rewardXP || 100;
          const { data: profileData } = await supabase
            .from('profiles')
            .select('total_xp')
            .eq('user_id', user.id)
            .single();

          if (profileData) {
            await supabase
              .from('profiles')
              .update({ total_xp: (profileData.total_xp || 0) + rewardXP })
              .eq('user_id', user.id);
          }

          // Log achievement as friend activity
          await supabase.from('friend_activity').insert({
            user_id: user.id,
            activity_type: 'challenge_complete',
            title: `Completed "${challenge.title}" and earned ${rewardXP} XP!`,
            metadata: {
              challenge_id: challenge.challengeId,
              reward_xp: rewardXP,
              progress: challenge.progress,
              goal: challenge.goal,
            },
          });
        }
      }

      // Refresh to reflect updated statuses
      await fetchChallenges();
    } catch (error) {
      if (__DEV__) console.error('[Challenges] Auto-complete error:', error.message);
    }
  }, [user, activeChallenges, fetchChallenges]);

  // Run auto-complete check after progress sync
  useEffect(() => {
    if (!user || activeChallenges.length === 0) return;
    const hasCompletable = activeChallenges.some(c => c.progress >= c.goal && c.status === 'active');
    if (hasCompletable) {
      const timer = setTimeout(checkAndAutoComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeChallenges, checkAndAutoComplete, user]);

  return {
    activeChallenges,
    availableChallenges,
    completedChallenges,
    isLoading,
    joinChallenge,
    updateProgress,
    createChallenge,
    getLeaderboard,
    createTeam,
    joinTeam,
    getTeamProgress,
    inviteFriendsToChallenge,
    checkAndAutoComplete,
    refresh: fetchChallenges,
    challengeTypes: CHALLENGE_TYPES,
  };
}

/**
 * Gather user data from Supabase for auto-sync calculations.
 * Fetches health data, workout history, meal data, breathing sessions, and sleep.
 */
async function gatherUserData(userId) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    const [healthResult, workoutResult, mealResult, breathingResult, sleepResult, logResult] = await Promise.all([
      // Health data (steps + active calories) - from health_data table if it exists
      supabase.from('health_data').select('step_count, active_calories').eq('user_id', userId).gte('date', since).maybeSingle().catch(() => ({ data: null })),
      // Workout history
      supabase.from('workout_sessions').select('id, date, created_at').eq('user_id', userId).gte('created_at', since).catch(() => ({ data: null })),
      // Meal data (water, protein)
      supabase.from('food_entries').select('date, water_ml, protein').eq('user_id', userId).gte('date', since).catch(() => ({ data: null })),
      // Breathing/meditation sessions
      supabase.from('breathing_sessions').select('duration, date, created_at').eq('user_id', userId).gte('created_at', since).catch(() => ({ data: null })),
      // Sleep data
      supabase.from('sleep_entries').select('hours, date, created_at').eq('user_id', userId).gte('created_at', since).catch(() => ({ data: null })),
      // Food log days (distinct dates)
      supabase.from('food_entries').select('date').eq('user_id', userId).gte('date', since).catch(() => ({ data: null })),
    ]);

    // Aggregate water and protein from meal entries
    const mealEntries = mealResult?.data || [];
    const waterIntake = mealEntries.reduce((sum, e) => sum + (e.water_ml || 0), 0);
    const proteinTotal = mealEntries.reduce((sum, e) => sum + (e.protein || 0), 0);

    // Distinct food log days
    const logDates = logResult?.data || [];
    const foodLogDays = [...new Set(logDates.map(e => e.date))];

    return {
      stepCount: healthResult?.data?.step_count || 0,
      activeCalories: healthResult?.data?.active_calories || 0,
      workoutHistory: workoutResult?.data || [],
      waterIntake,
      proteinTotal,
      foodLogDays,
      breathingSessions: breathingResult?.data || [],
      sleepHours: sleepResult?.data || [],
    };
  } catch (error) {
    if (__DEV__) console.error('[Challenges] Gather user data error:', error.message);
    return null;
  }
}

function formatChallenge(raw) {
  const challenge = raw.challenges || {};
  const typeInfo = CHALLENGE_TYPES[challenge.type] || {};
  return {
    id: raw.id, challengeId: challenge.id, type: challenge.type, title: challenge.title || typeInfo.label,
    description: challenge.description, goal: challenge.goal || typeInfo.defaultGoal,
    progress: raw.progress || 0, status: raw.status, startDate: challenge.start_date, endDate: challenge.end_date,
    icon: typeInfo.icon, unit: typeInfo.unit, rewardXP: challenge.reward_xp || 100,
    percentComplete: Math.min(100, Math.round(((raw.progress || 0) / (challenge.goal || 1)) * 100)),
    teamId: raw.team_id || null,
  };
}

function formatAvailableChallenge(raw) {
  const typeInfo = CHALLENGE_TYPES[raw.type] || {};
  return {
    id: raw.id, type: raw.type, title: raw.title || typeInfo.label, description: raw.description,
    goal: raw.goal || typeInfo.defaultGoal, startDate: raw.start_date, endDate: raw.end_date,
    icon: typeInfo.icon, unit: typeInfo.unit, rewardXP: raw.reward_xp || 100,
    participantCount: raw.challenge_participants?.length || 0, maxParticipants: raw.max_participants || 50,
  };
}

export default useChallenges;
