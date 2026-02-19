/**
 * useFriends - Friend system with accountability partners, block/unblock,
 * online status tracking, mutual friends, and friend profile preview data.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FRIEND_STREAKS_KEY = '@vibefit_friend_streaks';

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [brokenStreakFriends, setBrokenStreakFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch accepted friendships with profile data including streak, level, xp
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(name, avatar_url, current_streak, level, total_xp, last_active_at),
          addressee:profiles!friendships_addressee_id_fkey(name, avatar_url, current_streak, level, total_xp, last_active_at)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!error && friendships) {
        const mappedFriends = friendships.map(f => {
          const isRequester = f.requester_id === user.id;
          const friend = isRequester ? f.addressee : f.requester;
          const friendId = isRequester ? f.addressee_id : f.requester_id;
          const lastActive = friend?.last_active_at;
          const isOnline = lastActive ? (Date.now() - new Date(lastActive).getTime()) < 5 * 60 * 1000 : false;
          return {
            id: f.id,
            friendId,
            name: friend?.name || 'Anonymous',
            avatarUrl: friend?.avatar_url,
            since: f.created_at,
            streak: friend?.current_streak || 0,
            level: friend?.level || 1,
            totalXp: friend?.total_xp || 0,
            isOnline,
            lastActiveAt: lastActive,
          };
        });
        setFriends(mappedFriends);

        // ── STREAK LOSS DETECTION ──────────────────────────────
        // Compare current streaks with previously stored values.
        // If any friend went from >0 to 0, surface them for social nudge.
        try {
          const raw = await AsyncStorage.getItem(FRIEND_STREAKS_KEY);
          const previousStreaks = raw ? JSON.parse(raw) : {};
          const broken = [];
          const newStreaks = {};

          for (const f of mappedFriends) {
            newStreaks[f.friendId] = f.streak;
            const prev = previousStreaks[f.friendId];
            if (prev != null && prev > 0 && f.streak === 0) {
              broken.push({ friendId: f.friendId, name: f.name, previousStreak: prev });
            }
          }

          setBrokenStreakFriends(broken);
          await AsyncStorage.setItem(FRIEND_STREAKS_KEY, JSON.stringify(newStreaks));
        } catch {
          // Ignore storage errors
        }
      }

      // Fetch pending incoming requests
      const { data: pending } = await supabase
        .from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(name, avatar_url)')
        .eq('addressee_id', user.id)
        .eq('status', 'pending');
      if (pending) setPendingRequests(pending.map(r => ({ id: r.id, userId: r.requester_id, name: r.requester?.name || 'Anonymous', avatarUrl: r.requester?.avatar_url, sentAt: r.created_at })));

      // Fetch sent requests
      const { data: sent } = await supabase
        .from('friendships')
        .select('*, addressee:profiles!friendships_addressee_id_fkey(name, avatar_url)')
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      if (sent) setSentRequests(sent.map(r => ({ id: r.id, userId: r.addressee_id, name: r.addressee?.name || 'Anonymous', avatarUrl: r.addressee?.avatar_url, sentAt: r.created_at })));

      // Fetch blocked users
      const { data: blocked } = await supabase
        .from('blocked_users')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', user.id);
      if (blocked) setBlockedUsers(blocked.map(b => ({ id: b.id, userId: b.blocked_id, since: b.created_at })));
    } catch (error) {
      if (__DEV__) console.error('[Friends] Fetch error:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  // Friend count
  const friendCount = useMemo(() => friends.length, [friends]);

  // Online friends count
  const onlineFriendsCount = useMemo(() => friends.filter(f => f.isOnline).length, [friends]);

  // Blocked IDs set for quick lookup
  const blockedIds = useMemo(() => new Set(blockedUsers.map(b => b.userId)), [blockedUsers]);

  const sendRequest = useCallback(async (addresseeId) => {
    if (!user || addresseeId === user.id) return false;
    // Prevent sending to blocked users
    if (blockedIds.has(addresseeId)) return false;
    try {
      const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' });
      if (error) throw error;
      await fetchFriends();
      return true;
    } catch { return false; }
  }, [user, fetchFriends, blockedIds]);

  const acceptRequest = useCallback(async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      if (error) throw error;
      await fetchFriends();
      return true;
    } catch { return false; }
  }, [fetchFriends]);

  const declineRequest = useCallback(async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
      await fetchFriends();
      return true;
    } catch { return false; }
  }, [fetchFriends]);

  const removeFriend = useCallback(async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
      setFriends(prev => prev.filter(f => f.id !== friendshipId));
      return true;
    } catch { return false; }
  }, []);

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) return [];
    try {
      // Search by name or email-like patterns
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url, current_streak, level, total_xp')
        .or(`name.ilike.%${query}%`)
        .neq('user_id', user?.id)
        .limit(20);
      if (error) throw error;
      return (data || [])
        .filter(u => !blockedIds.has(u.user_id))
        .map(u => ({
          userId: u.user_id,
          name: u.name || 'Anonymous',
          avatarUrl: u.avatar_url,
          streak: u.current_streak || 0,
          level: u.level || 1,
          totalXp: u.total_xp || 0,
        }));
    } catch { return []; }
  }, [user, blockedIds]);

  /**
   * Block a user. Removes any existing friendship.
   * @param {string} targetId - User ID to block
   */
  const blockUser = useCallback(async (targetId) => {
    if (!user || !targetId) return false;
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: targetId });
      if (error) throw error;

      // Remove friendship if it exists
      await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`);

      await fetchFriends();
      return true;
    } catch { return false; }
  }, [user, fetchFriends]);

  /**
   * Unblock a user.
   * @param {string} targetId - User ID to unblock
   */
  const unblockUser = useCallback(async (targetId) => {
    if (!user || !targetId) return false;
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetId);
      if (error) throw error;
      await fetchFriends();
      return true;
    } catch { return false; }
  }, [user, fetchFriends]);

  /**
   * Get mutual friends between the current user and another user.
   * @param {string} otherUserId - The other user's ID
   * @returns {Promise<Array>} List of mutual friend objects
   */
  const getMutualFriends = useCallback(async (otherUserId) => {
    if (!user || !otherUserId) return [];
    try {
      // Get the other user's friends
      const { data: otherFriendships, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${otherUserId},addressee_id.eq.${otherUserId}`)
        .eq('status', 'accepted');

      if (error) throw error;
      if (!otherFriendships) return [];

      const otherFriendIds = new Set(
        otherFriendships.map(f =>
          f.requester_id === otherUserId ? f.addressee_id : f.requester_id
        )
      );

      // Intersect with current user's friends
      return friends.filter(f => otherFriendIds.has(f.friendId));
    } catch {
      return [];
    }
  }, [user, friends]);

  /**
   * Get a friend's recent activity for profile preview.
   * @param {string} friendUserId - Friend's user ID
   * @returns {Promise<Array>} Recent activity items
   */
  const getFriendRecentActivity = useCallback(async (friendUserId) => {
    if (!user || !friendUserId) return [];
    try {
      const { data, error } = await supabase
        .from('friend_activity')
        .select('id, activity_type, title, created_at')
        .eq('user_id', friendUserId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        activityType: item.activity_type,
        title: item.title,
        createdAt: item.created_at,
      }));
    } catch {
      return [];
    }
  }, [user]);

  /**
   * Update last active timestamp (call periodically to track online status).
   */
  const updateOnlineStatus = useCallback(async () => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch {
      // Silent fail
    }
  }, [user]);

  // Update online status on mount and every 2 minutes
  useEffect(() => {
    if (!user) return;
    updateOnlineStatus();
    const interval = setInterval(updateOnlineStatus, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, updateOnlineStatus]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    blockedUsers,
    blockedIds,
    brokenStreakFriends,
    isLoading,
    friendCount,
    onlineFriendsCount,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    searchUsers,
    blockUser,
    unblockUser,
    getMutualFriends,
    getFriendRecentActivity,
    updateOnlineStatus,
    refresh: fetchFriends,
  };
}

export default useFriends;
