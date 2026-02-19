/**
 * VibeFit Monetization & Growth Engine
 * Tiered subscriptions, referral system, retention hooks,
 * A/B testing framework, and lifetime value optimization.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureEntry {
  id: string;
  name: string;
  included: boolean;
  limit?: string;
}

interface FreeTier {
  id: string;
  name: string;
  price: number;
  period: null;
  features: FeatureEntry[];
  color: string;
  badge: null;
}

interface PaidTier {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: FeatureEntry[];
  color: string;
  badge: string;
  savings: string;
}

interface SubscriptionTiers {
  free: FreeTier;
  pro: PaidTier;
  elite: PaidTier;
}

interface ReferralReward {
  xp: number;
  freeProDays: number;
}

interface ReferralMilestone {
  count: number;
  reward: string;
  xpBonus: number;
}

interface ReferralRewards {
  referrer: ReferralReward;
  referee: ReferralReward;
  milestones: ReferralMilestone[];
}

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  earnedXP: number;
  freeProDays: number;
  referralCode: string;
  unlockedMilestone?: ReferralMilestone;
}

interface ProcessReferralResult {
  success: boolean;
  stats?: ReferralStats;
  milestone?: ReferralMilestone;
}

interface ABTest {
  variants: string[];
  weights: number[];
}

interface RetentionTrigger {
  action: string;
  message: string;
}

interface LTVUserData {
  subscriptionType?: string;
  monthsActive?: number;
  totalSpent?: number;
  referrals?: number;
  engagementScore?: number;
}

interface LTVResult {
  currentValue: number;
  projectedLTV: number;
  churnRisk: number;
  referralValue: number;
  segment: string;
}

interface PaywallTrigger {
  screen: string;
  reason: string;
  tier: string;
}

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export const SUBSCRIPTION_TIERS: SubscriptionTiers = {
  free: {
    id: 'free',
    name: 'VibeFit Free',
    price: 0,
    period: null,
    features: [
      { id: 'basic_tracking', name: 'Basic food & calorie tracking', included: true },
      { id: 'water_tracking', name: 'Water intake tracking', included: true },
      { id: 'weight_log', name: 'Weight logging', included: true },
      { id: 'basic_stats', name: 'Basic weekly stats', included: true },
      { id: 'manual_entry', name: 'Manual food entry', included: true },
      { id: 'ai_scans', name: 'AI food scans', included: false, limit: '3/month' },
      { id: 'ai_workouts', name: 'AI workout generation', included: false },
      { id: 'meal_plans', name: 'AI meal plans', included: false },
      { id: 'advanced_analytics', name: 'Advanced analytics', included: false },
      { id: 'social_features', name: 'Community features', included: false },
      { id: 'challenges', name: 'Challenges', included: false },
      { id: 'coach_chat', name: 'AI coach chat', included: false },
    ],
    color: '#6B6B73',
    badge: null,
  },
  pro: {
    id: 'pro',
    name: 'VibeFit Pro',
    monthlyPrice: 9.99,
    yearlyPrice: 79.99,
    features: [
      { id: 'basic_tracking', name: 'Unlimited food & calorie tracking', included: true },
      { id: 'water_tracking', name: 'Water intake tracking', included: true },
      { id: 'weight_log', name: 'Weight logging with trends', included: true },
      { id: 'advanced_stats', name: 'Advanced analytics & insights', included: true },
      { id: 'ai_scans', name: 'Unlimited AI food scans', included: true },
      { id: 'ai_workouts', name: 'AI workout generation', included: true },
      { id: 'meal_plans', name: 'AI meal plans', included: true },
      { id: 'barcode', name: 'Barcode scanner', included: true },
      { id: 'fasting', name: 'Intermittent fasting tracker', included: true },
      { id: 'social_features', name: 'Community features', included: true },
      { id: 'challenges', name: 'Challenges & competitions', included: true },
      { id: 'coach_chat', name: 'AI coach chat (50 messages/day)', included: true },
      { id: 'export', name: 'Data export (CSV/PDF)', included: true },
      { id: 'elite_coaching', name: 'Elite AI coaching', included: false },
      { id: 'white_label', name: 'White-label for coaches', included: false },
    ],
    color: '#00D4FF',
    badge: 'PRO',
    savings: '33% off yearly',
  },
  elite: {
    id: 'elite',
    name: 'VibeFit Elite',
    monthlyPrice: 19.99,
    yearlyPrice: 149.99,
    features: [
      { id: 'everything_pro', name: 'Everything in Pro', included: true },
      { id: 'elite_coaching', name: 'Elite AI coaching with periodization', included: true },
      { id: 'coach_chat_unlimited', name: 'Unlimited AI coach chat', included: true },
      { id: 'body_composition', name: 'Body composition tracking', included: true },
      { id: 'recovery_tracking', name: 'Recovery & HRV tracking', included: true },
      { id: 'supplement_guidance', name: 'Supplement stack guidance', included: true },
      { id: 'meal_prep', name: 'Meal prep with shopping lists', included: true },
      { id: 'progress_photos', name: 'Progress photo comparison', included: true },
      { id: 'priority_support', name: 'Priority support', included: true },
      { id: 'early_access', name: 'Early access to new features', included: true },
      { id: 'no_ads', name: 'Completely ad-free', included: true },
      { id: 'personal_brand', name: 'Custom branding for coaches', included: true },
    ],
    color: '#FFD700',
    badge: 'ELITE',
    savings: '37% off yearly',
  },
};

// ============================================================================
// REFERRAL SYSTEM
// ============================================================================

const REFERRAL_KEY: string = '@vibefit_referral';

const REFERRAL_REWARDS: ReferralRewards = {
  referrer: { xp: 500, freeProDays: 7 },
  referee: { xp: 200, freeProDays: 7 },
  milestones: [
    { count: 3, reward: '1 month free Pro', xpBonus: 1000 },
    { count: 5, reward: '1 month free Elite', xpBonus: 2000 },
    { count: 10, reward: '3 months free Elite', xpBonus: 5000 },
    { count: 25, reward: 'Lifetime VibeFit Elite', xpBonus: 10000 },
  ],
};

async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    const raw: string | null = await AsyncStorage.getItem(`${REFERRAL_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : { totalReferrals: 0, pendingReferrals: 0, earnedXP: 0, freeProDays: 0, referralCode: await generateReferralCode(userId) };
  } catch {
    return { totalReferrals: 0, pendingReferrals: 0, earnedXP: 0, freeProDays: 0, referralCode: await generateReferralCode(userId) };
  }
}

async function generateReferralCode(userId: string): Promise<string> {
  if (!userId) return 'VIBEFIT';
  const bytes = await Crypto.getRandomBytesAsync(6);
  const code = Array.from(bytes).map(b => b.toString(36)).join('').toUpperCase().slice(0, 8);
  return `VIBE${code}`;
}

async function processReferral(referrerId: string, refereeId: string): Promise<ProcessReferralResult> {
  try {
    const stats: ReferralStats = await getReferralStats(referrerId);
    stats.totalReferrals += 1;
    stats.earnedXP += REFERRAL_REWARDS.referrer.xp;
    stats.freeProDays += REFERRAL_REWARDS.referrer.freeProDays;

    // Check milestones
    const milestone: ReferralMilestone | undefined = REFERRAL_REWARDS.milestones.find((m: ReferralMilestone) => m.count === stats.totalReferrals);
    if (milestone) {
      stats.earnedXP += milestone.xpBonus;
      stats.unlockedMilestone = milestone;
    }

    await AsyncStorage.setItem(`${REFERRAL_KEY}_${referrerId}`, JSON.stringify(stats));
    return { success: true, stats, milestone };
  } catch {
    return { success: false };
  }
}

// ============================================================================
// A/B TESTING FRAMEWORK
// ============================================================================

const AB_TEST_KEY: string = '@vibefit_ab_tests';

const ACTIVE_TESTS: Record<string, ABTest> = {
  onboarding_flow: { variants: ['classic', 'ai_genesis', 'guided_wizard'], weights: [0.33, 0.34, 0.33] },
  paywall_design: { variants: ['minimal', 'feature_rich', 'social_proof'], weights: [0.33, 0.34, 0.33] },
  dashboard_layout: { variants: ['cards', 'bento', 'timeline'], weights: [0.33, 0.34, 0.33] },
  cta_text: { variants: ['Start Free Trial', 'Unlock Your Potential', 'Join 100K+ Users'], weights: [0.33, 0.34, 0.33] },
};

async function getABTestVariant(testName: string): Promise<string | null> {
  try {
    const raw: string | null = await AsyncStorage.getItem(AB_TEST_KEY);
    const assignments: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (assignments[testName]) return assignments[testName];

    const test: ABTest | undefined = ACTIVE_TESTS[testName];
    if (!test) return null;

    // Assign variant based on weights
    const random: number = Math.random();
    let cumulative: number = 0;
    let assignedVariant: string = test.variants[0];
    for (let i = 0; i < test.variants.length; i++) {
      cumulative += test.weights[i];
      if (random <= cumulative) { assignedVariant = test.variants[i]; break; }
    }

    assignments[testName] = assignedVariant;
    await AsyncStorage.setItem(AB_TEST_KEY, JSON.stringify(assignments));
    return assignedVariant;
  } catch {
    return ACTIVE_TESTS[testName]?.variants[0] || null;
  }
}

declare const __DEV__: boolean;

async function trackABTestEvent(testName: string, event: string, metadata: Record<string, unknown> = {}): Promise<void> {
  // In production, this would send to analytics
  if (__DEV__) {
    const variant: string | null = await getABTestVariant(testName);
    console.log(`[AB Test] ${testName}:${variant} - ${event}`, metadata);
  }
}

// ============================================================================
// RETENTION HOOKS
// ============================================================================

const RETENTION_EVENTS_KEY: string = '@vibefit_retention';

const RETENTION_TRIGGERS: Record<string, RetentionTrigger> = {
  day1: { action: 'welcome_notification', message: 'Welcome to VibeFit! Log your first meal to get started.' },
  day3: { action: 'streak_reminder', message: 'You\'re building momentum! Keep your streak alive today.' },
  day7: { action: 'weekly_celebration', message: 'One week in! Check out your weekly digest.' },
  day14: { action: 'feature_discovery', message: 'Did you know? You can scan food with AI for instant tracking.' },
  day30: { action: 'milestone_celebration', message: 'One month strong! You\'ve logged over 90 meals.' },
  day90: { action: 'transformation_prompt', message: 'It\'s been 3 months! Take a progress photo to see your transformation.' },
  streak_break: { action: 'streak_repair', message: 'Your streak ended at X days. Repair it today to keep going!' },
  inactivity_3d: { action: 'comeback_nudge', message: 'We miss you! Your goals are waiting. Log one meal to restart.' },
  inactivity_7d: { action: 'comeback_offer', message: 'Come back and get 50 bonus XP! Your data is safe and waiting.' },
};

async function checkRetentionTrigger(daysSinceSignup: number, currentStreak: number, lastActiveDate: string | null): Promise<RetentionTrigger[]> {
  const triggers: RetentionTrigger[] = [];
  const dayKey: string = `day${daysSinceSignup}`;
  if (RETENTION_TRIGGERS[dayKey]) triggers.push(RETENTION_TRIGGERS[dayKey]);

  if (lastActiveDate) {
    const daysSinceActive: number = Math.floor((Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceActive >= 7) triggers.push(RETENTION_TRIGGERS.inactivity_7d);
    else if (daysSinceActive >= 3) triggers.push(RETENTION_TRIGGERS.inactivity_3d);
  }

  return triggers;
}

// ============================================================================
// LIFETIME VALUE OPTIMIZATION
// ============================================================================

function calculateLTV(userData: LTVUserData): LTVResult {
  const { subscriptionType = 'free', monthsActive = 1, totalSpent = 0, referrals = 0, engagementScore = 0 } = userData;

  const baseValue: number = totalSpent;
  const projectedMonthly: number = subscriptionType === 'elite' ? 19.99 : subscriptionType === 'pro' ? 9.99 : 0;
  const churnRisk: number = engagementScore < 30 ? 0.3 : engagementScore < 60 ? 0.15 : 0.05;
  const referralValue: number = referrals * 25; // Average value per referral

  const projectedLTV: number = baseValue + (projectedMonthly * 12 * (1 - churnRisk)) + referralValue;

  return {
    currentValue: Math.round(baseValue),
    projectedLTV: Math.round(projectedLTV),
    churnRisk: Math.round(churnRisk * 100),
    referralValue: Math.round(referralValue),
    segment: projectedLTV > 200 ? 'whale' : projectedLTV > 100 ? 'dolphin' : projectedLTV > 50 ? 'fish' : 'free',
  };
}

// ============================================================================
// SMART PAYWALL TRIGGERS
// ============================================================================

const PAYWALL_TRIGGERS: Record<string, PaywallTrigger> = {
  ai_scan_limit: { screen: 'paywall', reason: 'AI scan limit reached', tier: 'pro' },
  workout_generation: { screen: 'paywall', reason: 'Unlock AI workouts', tier: 'pro' },
  meal_plan: { screen: 'paywall', reason: 'Get personalized meal plans', tier: 'pro' },
  advanced_analytics: { screen: 'paywall', reason: 'See your trends & predictions', tier: 'pro' },
  body_composition: { screen: 'paywall', reason: 'Track body composition', tier: 'elite' },
  recovery_tracking: { screen: 'paywall', reason: 'Monitor recovery readiness', tier: 'elite' },
  coach_chat: { screen: 'paywall', reason: 'Chat with AI nutritionist', tier: 'pro' },
};

function getPaywallTrigger(feature: string): PaywallTrigger | null {
  return PAYWALL_TRIGGERS[feature] || null;
}

export {
  REFERRAL_REWARDS,
  getReferralStats,
  generateReferralCode,
  processReferral,
  ACTIVE_TESTS,
  getABTestVariant,
  trackABTestEvent,
  RETENTION_TRIGGERS,
  checkRetentionTrigger,
  calculateLTV,
  PAYWALL_TRIGGERS,
  getPaywallTrigger,
};
