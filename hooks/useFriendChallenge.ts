import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface FriendChallenge {
  id: string;
  challengerUserId: string;
  challengedUserId: string;
  challengerName: string;
  challengedName: string;
  type: 'calories' | 'protein' | 'streak' | 'logging';
  target: number;
  challengerProgress: number;
  challengedProgress: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed' | 'declined';
  winnerId?: string;
  xpReward: number;
}

export function useFriendChallenge() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<FriendChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('friend_challenges')
        .select('*')
        .or(`challenger_user_id.eq.${user.id},challenged_user_id.eq.${user.id}`)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setChallenges(data.map(row => ({
          id: row.id,
          challengerUserId: row.challenger_user_id,
          challengedUserId: row.challenged_user_id,
          challengerName: row.challenger_name || 'User',
          challengedName: row.challenged_name || 'Friend',
          type: row.challenge_type,
          target: row.target,
          challengerProgress: row.challenger_progress || 0,
          challengedProgress: row.challenged_progress || 0,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
          winnerId: row.winner_id,
          xpReward: row.xp_reward || 100,
        })));
      }
    } catch (err) {
      if (__DEV__) console.error('[FriendChallenge] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const createChallenge = useCallback(async (
    friendId: string,
    friendName: string,
    type: FriendChallenge['type'],
    durationDays: number = 7,
  ) => {
    if (!user) return null;

    const targets: Record<string, number> = {
      calories: 14000, // 2000/day * 7 days
      protein: 700,    // 100g/day * 7 days
      streak: durationDays,
      logging: durationDays * 3, // 3 meals/day
    };

    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { data, error } = await supabase.from('friend_challenges').insert({
        challenger_user_id: user.id,
        challenged_user_id: friendId,
        challenger_name: (user as any).user_metadata?.name || 'You',
        challenged_name: friendName,
        challenge_type: type,
        target: targets[type] || 7,
        start_date: startDate,
        end_date: endDate,
        status: 'pending',
        xp_reward: 100,
      }).select().single();

      if (!error && data) {
        await fetchChallenges();
        return data;
      }
    } catch (err) {
      if (__DEV__) console.error('[FriendChallenge] Create error:', err);
    }
    return null;
  }, [user, fetchChallenges]);

  const acceptChallenge = useCallback(async (challengeId: string) => {
    try {
      await supabase.from('friend_challenges')
        .update({ status: 'active' })
        .eq('id', challengeId);
      await fetchChallenges();
    } catch (err) {
      if (__DEV__) console.error('[FriendChallenge] Accept error:', err);
    }
  }, [fetchChallenges]);

  const declineChallenge = useCallback(async (challengeId: string) => {
    try {
      await supabase.from('friend_challenges')
        .update({ status: 'declined' })
        .eq('id', challengeId);
      await fetchChallenges();
    } catch (err) {
      if (__DEV__) console.error('[FriendChallenge] Decline error:', err);
    }
  }, [fetchChallenges]);

  const pendingIncoming = challenges.filter(
    c => c.status === 'pending' && c.challengedUserId === user?.id
  );
  const activeChallenges = challenges.filter(c => c.status === 'active');

  return {
    challenges,
    activeChallenges,
    pendingIncoming,
    loading,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    refresh: fetchChallenges,
  };
}
