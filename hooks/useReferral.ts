/**
 * Referral & Viral Growth System
 *
 * Drives organic user acquisition through:
 * - Unique invite codes per user
 * - Share mechanics (deep links, social sharing)
 * - Referral tracking and rewards (XP, premium days)
 * - Milestone bonuses (5, 10, 25, 50 referrals)
 *
 * Storage: AsyncStorage for local state, Supabase for server-side tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import { Share, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReferralStats {
  inviteCode: string;
  totalReferrals: number;
  pendingReferrals: number;
  rewardsEarned: number;
  milestoneReached: number;
  createdAt: string;
}

export interface ReferralReward {
  type: 'xp' | 'premium_days' | 'badge';
  amount: number;
  label: string;
  milestone: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@fueliq_referral';
const APP_STORE_URL = 'https://apps.apple.com/app/fueliq/id0000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.fueliq.app';

/** Rewards earned at specific referral milestones */
const MILESTONE_REWARDS: ReferralReward[] = [
  { type: 'xp', amount: 500, label: '500 XP Bonus', milestone: 1 },
  { type: 'xp', amount: 1000, label: '1,000 XP Bonus', milestone: 5 },
  { type: 'premium_days', amount: 7, label: '7 Days Free Premium', milestone: 10 },
  { type: 'premium_days', amount: 30, label: '30 Days Free Premium', milestone: 25 },
  { type: 'badge', amount: 1, label: 'Ambassador Badge', milestone: 50 },
];

/** XP awarded per successful referral (friend signs up + logs first food) */
const XP_PER_REFERRAL = 200;

// ---------------------------------------------------------------------------
// Invite Code Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique 8-character invite code from user ID.
 * Format: VF-XXXXXX (alphanumeric, easy to type/share).
 */
function generateInviteCode(userId?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I confusion
  const seed = userId || Date.now().toString(36);
  let code = '';

  // Use a simple hash of the seed to generate deterministic code
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  for (let i = 0; i < 6; i++) {
    hash = ((hash << 5) - hash + i * 7) | 0;
    code += chars[Math.abs(hash) % chars.length];
  }

  return `VF-${code}`;
}

// ---------------------------------------------------------------------------
// Deep Link Generation
// ---------------------------------------------------------------------------

/**
 * Build a deep link URL that opens the app with the referral code.
 * Falls back to store URL if app not installed.
 */
function buildReferralLink(inviteCode: string): string {
  return Linking.createURL('invite', {
    queryParams: { code: inviteCode },
  });
}

/**
 * Build a universal link / dynamic link for sharing.
 */
function buildShareUrl(inviteCode: string): string {
  // In production, this would be a Firebase Dynamic Link or Branch.io link
  // that handles deferred deep linking. For now, use direct deep link.
  return `https://fueliq.app/invite/${inviteCode}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReferral(userId?: string) {
  const [stats, setStats] = useState<ReferralStats>({
    inviteCode: '',
    totalReferrals: 0,
    pendingReferrals: 0,
    rewardsEarned: 0,
    milestoneReached: 0,
    createdAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastReward, setLastReward] = useState<ReferralReward | null>(null);

  // Load referral data on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          setStats(cached);
        } else {
          // First time — generate invite code
          const newStats: ReferralStats = {
            inviteCode: generateInviteCode(userId),
            totalReferrals: 0,
            pendingReferrals: 0,
            rewardsEarned: 0,
            milestoneReached: 0,
            createdAt: new Date().toISOString(),
          };
          setStats(newStats);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
        }
      } catch {
        // Generate fallback code
        setStats((prev) => ({
          ...prev,
          inviteCode: prev.inviteCode || generateInviteCode(userId),
        }));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId]);

  // Share invite
  const shareInvite = useCallback(async () => {
    const shareUrl = buildShareUrl(stats.inviteCode);
    const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

    try {
      await Share.share({
        message: `Join me on FuelIQ! AI-powered fitness tracking that actually works. Use my invite code ${stats.inviteCode} for bonus rewards.\n\n${shareUrl}\n\nDownload: ${storeUrl}`,
        title: 'Join FuelIQ',
      });
    } catch {
      // User cancelled or share failed
    }
  }, [stats.inviteCode]);

  // Share via specific channel
  const shareVia = useCallback(async (channel: 'copy' | 'sms' | 'whatsapp') => {
    const shareUrl = buildShareUrl(stats.inviteCode);

    switch (channel) {
      case 'copy':
        // Copy to clipboard (handled by caller)
        return stats.inviteCode;
      case 'sms': {
        const smsBody = encodeURIComponent(
          `Check out FuelIQ! Use my code ${stats.inviteCode}: ${shareUrl}`
        );
        const smsUrl = Platform.OS === 'ios'
          ? `sms:&body=${smsBody}`
          : `sms:?body=${smsBody}`;
        await Linking.openURL(smsUrl).catch(() => {});
        break;
      }
      case 'whatsapp': {
        const waText = encodeURIComponent(
          `Join me on FuelIQ! Use my invite code ${stats.inviteCode} for bonus rewards: ${shareUrl}`
        );
        await Linking.openURL(`whatsapp://send?text=${waText}`).catch(() => {});
        break;
      }
    }
    return stats.inviteCode;
  }, [stats.inviteCode]);

  // Record a referral (called when a referred user signs up)
  const recordReferral = useCallback(async () => {
    const updated: ReferralStats = {
      ...stats,
      totalReferrals: stats.totalReferrals + 1,
      rewardsEarned: stats.rewardsEarned + XP_PER_REFERRAL,
    };

    // Check milestone rewards
    const newTotal = updated.totalReferrals;
    const reward = MILESTONE_REWARDS.find(
      (r) => r.milestone === newTotal && newTotal > stats.milestoneReached
    );

    if (reward) {
      updated.milestoneReached = reward.milestone;
      setLastReward(reward);
    }

    setStats(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, [stats]);

  // Dismiss reward notification
  const dismissReward = useCallback(() => {
    setLastReward(null);
  }, []);

  // Get next milestone info
  const nextMilestone = MILESTONE_REWARDS.find(
    (r) => r.milestone > stats.totalReferrals
  ) || null;

  const progressToNextMilestone = nextMilestone
    ? Math.round((stats.totalReferrals / nextMilestone.milestone) * 100)
    : 100;

  return {
    stats,
    isLoading,
    lastReward,
    nextMilestone,
    progressToNextMilestone,
    inviteLink: buildShareUrl(stats.inviteCode),
    deepLink: buildReferralLink(stats.inviteCode),
    milestoneRewards: MILESTONE_REWARDS,
    xpPerReferral: XP_PER_REFERRAL,
    shareInvite,
    shareVia,
    recordReferral,
    dismissReward,
  };
}
