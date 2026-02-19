import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBlocked = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlockedUsers(data || []);
      setBlockedIds(new Set((data || []).map((b: BlockedUser) => b.blocked_id)));
    } catch (e) {
      if (__DEV__) console.warn('Failed to fetch blocked users:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  const blockUser = useCallback(async (targetId: string, targetName?: string) => {
    if (!user) return;

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Block User',
        `Are you sure you want to block ${targetName || 'this user'}? They won't be able to see your posts or interact with you.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('blocked_users')
                  .insert({ blocker_id: user.id, blocked_id: targetId });
                if (error) throw error;

                // Also remove friendship if exists
                await supabase
                  .from('friendships')
                  .delete()
                  .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`);

                await fetchBlocked();
                resolve(true);
              } catch (e) {
                Alert.alert('Error', 'Failed to block user. Please try again.');
                resolve(false);
              }
            },
          },
        ]
      );
    });
  }, [user, fetchBlocked]);

  const unblockUser = useCallback(async (targetId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetId);
      if (error) throw error;
      await fetchBlocked();
    } catch (e) {
      Alert.alert('Error', 'Failed to unblock user.');
    }
  }, [user, fetchBlocked]);

  const isBlocked = useCallback((targetId: string) => blockedIds.has(targetId), [blockedIds]);

  const reportContent = useCallback(async (params: {
    reportedUserId?: string;
    contentType: 'post' | 'comment' | 'challenge' | 'profile' | 'message';
    contentId?: string;
    reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'self_harm' | 'other';
    description?: string;
  }) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: params.reportedUserId,
          content_type: params.contentType,
          content_id: params.contentId,
          reason: params.reason,
          description: params.description,
        });
      if (error) throw error;
      Alert.alert('Report Submitted', 'Thank you for reporting. Our team will review this content.');
    } catch (e) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  }, [user]);

  return {
    blockedUsers,
    blockedIds,
    loading,
    blockUser,
    unblockUser,
    isBlocked,
    reportContent,
    refreshBlocked: fetchBlocked,
  };
}
