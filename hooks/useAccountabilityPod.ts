import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface PodMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  todayCalories: number;
  todayProtein: number;
  streak: number;
  hasLoggedToday: boolean;
}

interface Pod {
  id: string;
  name: string;
  members: PodMember[];
  maxMembers: number;
  createdAt: string;
  goalType: 'calories' | 'protein' | 'logging';
}

export function useAccountabilityPod() {
  const { user } = useAuth();
  const [pod, setPod] = useState<Pod | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPod = useCallback(async () => {
    if (!user) return;
    try {
      // Get user's pod membership
      const { data: membership } = await supabase
        .from('pod_members')
        .select('pod_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      // Get pod details with members
      const { data: podData } = await supabase
        .from('pods')
        .select(`
          *,
          pod_members (
            user_id,
            profiles (name, avatar_url)
          )
        `)
        .eq('id', membership.pod_id)
        .single();

      if (podData) {
        setPod({
          id: podData.id,
          name: podData.name,
          members: (podData.pod_members || []).map((m: any) => ({
            userId: m.user_id,
            name: m.profiles?.name || 'Member',
            avatarUrl: m.profiles?.avatar_url,
            todayCalories: 0,
            todayProtein: 0,
            streak: 0,
            hasLoggedToday: false,
          })),
          maxMembers: podData.max_members || 5,
          createdAt: podData.created_at,
          goalType: podData.goal_type || 'logging',
        });
      }
    } catch (err) {
      if (__DEV__) console.error('[Pod] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPod(); }, [fetchPod]);

  const createPod = useCallback(async (name: string, goalType: string = 'logging') => {
    if (!user) return null;
    try {
      const { data: newPod, error } = await supabase
        .from('pods')
        .insert({ name, goal_type: goalType, created_by: user.id, max_members: 5 })
        .select()
        .single();

      if (error || !newPod) return null;

      // Add creator as member
      await supabase.from('pod_members').insert({
        pod_id: newPod.id,
        user_id: user.id,
        role: 'admin',
      });

      await fetchPod();
      return newPod;
    } catch {
      return null;
    }
  }, [user, fetchPod]);

  const inviteToPod = useCallback(async (friendUserId: string) => {
    if (!pod || !user) return false;
    if (pod.members.length >= pod.maxMembers) return false;

    try {
      const { error } = await supabase.from('pod_members').insert({
        pod_id: pod.id,
        user_id: friendUserId,
        role: 'member',
      });
      if (!error) {
        await fetchPod();
        return true;
      }
    } catch {}
    return false;
  }, [pod, user, fetchPod]);

  const leavePod = useCallback(async () => {
    if (!pod || !user) return;
    try {
      await supabase.from('pod_members')
        .delete()
        .eq('pod_id', pod.id)
        .eq('user_id', user.id);
      setPod(null);
    } catch {}
  }, [pod, user]);

  return { pod, loading, createPod, inviteToPod, leavePod, refresh: fetchPod };
}
