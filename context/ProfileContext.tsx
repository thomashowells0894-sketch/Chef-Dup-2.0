import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticHeavy } from '../lib/haptics';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { MacroSet } from '../types';
import {
  buildProfileCacheKey,
  createStoredProfileMeta,
  deriveTargetsFromProfile,
  isEssentialProfileComplete,
  getLegacyProfileCacheKeys,
  normalizeStoredProfileCache,
  resolveProfileHydration,
  sanitizeMacroSet,
  shouldRegenerateTargets,
  type ProfileHydrationState,
} from '../lib/profileState';

interface ActivityLevelInfo {
  label: string;
  description: string;
  multiplier: number;
}

interface WeeklyGoalInfo {
  label: string;
  adjustment: number;
}

interface GoalTypeInfo {
  label: string;
  description: string;
  weeklyGoal: string;
  macroPreset: string;
  icon: string;
  color: string;
}

interface MacroPresetInfo {
  label: string;
  description: string;
  protein: number;
  carbs: number;
  fat: number;
  isBodyweightBased?: boolean;
}

interface Profile {
  name: string;
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: string;
  activityLevel: string;
  bmr: number | null;
  tdee: number | null;
  goalWeight: number | null;
  weeklyGoal: string;
  macroPreset: string;
  customMacros: { protein: number; carbs: number; fat: number };
  weightUnit: string;
  injuries: string;
  equipment: string[];
  dietaryRestrictions: string[];
}

interface WeightHistoryEntry {
  date: string;
  weight: number;
}

interface WeeklyWeightDataEntry {
  date: string;
  day: string;
  weight: number | null;
  isToday: boolean;
  interpolated?: boolean;
}

interface WeightStats {
  currentWeight: number | null;
  weeklyChange: number | null;
  startWeight: number | null;
  totalChange: number | null;
  goalWeight: number | null;
  toGoal: number | null;
}

interface ProfileContextValue {
  profile: Profile;
  isLoading: boolean;
  isHydrated: boolean;
  updateProfile: (
    updates: Partial<Profile>,
    options?: ProfileUpdateOptions
  ) => Promise<ProfileUpdateResult>;
  fetchProfile: () => Promise<void>;
  calculatedGoals: MacroSet;
  pendingTargets: MacroSet | null;
  hasCompletedOnboarding: boolean;
  profileHydrationState: ProfileHydrationState;
  applyPendingTargets: () => Promise<void>;
  discardPendingTargets: () => Promise<void>;
  activityLevels: Record<string, ActivityLevelInfo>;
  weeklyGoals: Record<string, WeeklyGoalInfo>;
  macroPresets: Record<string, MacroPresetInfo>;
  goalTypes: Record<string, GoalTypeInfo>;
  currentMacroSplit: { protein: number; carbs: number; fat: number; isBodyweightBased?: boolean };
  switchGoalType: (goalType: string) => Promise<void>;
  currentGoalType: string;
  isProfileComplete: boolean;
  weightHistory: WeightHistoryEntry[];
  weeklyWeightData: WeeklyWeightDataEntry[];
  weightStats: WeightStats;
  calculatedWaterGoal: number;
}

interface ProfileUpdateOptions {
  commitTargets?: MacroSet | null;
  onboardingCompleted?: boolean;
  onboardingData?: Record<string, unknown> | null;
  targetBehavior?: 'preserve' | 'commit_generated';
}

interface ProfileUpdateResult {
  activeTargets: MacroSet | null;
  pendingTargets: MacroSet | null;
  targetAction: 'preserved' | 'committed' | 'pending';
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

// Activity level multipliers for TDEE calculation
export const ACTIVITY_LEVELS: Record<string, ActivityLevelInfo> = {
  sedentary: {
    label: 'Sedentary',
    description: 'Little or no exercise',
    multiplier: 1.2,
  },
  light: {
    label: 'Lightly Active',
    description: 'Light exercise 1-3 days/week',
    multiplier: 1.375,
  },
  moderate: {
    label: 'Moderately Active',
    description: 'Moderate exercise 3-5 days/week',
    multiplier: 1.55,
  },
  active: {
    label: 'Very Active',
    description: 'Hard exercise 6-7 days/week',
    multiplier: 1.725,
  },
  extreme: {
    label: 'Extremely Active',
    description: 'Very hard exercise & physical job',
    multiplier: 1.9,
  },
};

const initialProfile: Profile = {
  name: '',
  weight: null, // in lbs (stored internally as lbs)
  height: null, // in inches
  age: null,
  gender: 'male', // 'male' or 'female'
  activityLevel: 'moderate',
  // Calculated values
  bmr: null,
  tdee: null,
  // Goal adjustments
  goalWeight: null,
  weeklyGoal: 'maintain', // 'lose2', 'lose1', 'lose05', 'maintain', 'gain05', 'gain1'
  // Macro split
  macroPreset: 'balanced', // Key from MACRO_PRESETS
  customMacros: { protein: 30, carbs: 40, fat: 30 }, // Only used when macroPreset is 'custom'
  // Unit preferences
  weightUnit: 'lbs', // 'lbs' or 'kg'
  // Training Context - for AI Trainer personalization
  injuries: '', // e.g., "bad knees, lower back pain"
  equipment: [], // e.g., ["dumbbells", "resistance bands", "pull-up bar"]
  dietaryRestrictions: [], // e.g., ["vegan", "gluten-free", "dairy-free"]
};

// Goal type presets for quick switching
export const GOAL_TYPES: Record<string, GoalTypeInfo> = {
  cut: {
    label: 'Cut',
    description: 'Lose fat, preserve muscle',
    weeklyGoal: 'lose1',
    macroPreset: 'highProtein',
    icon: 'TrendingDown',
    color: '#FF6B35',
  },
  maintain: {
    label: 'Maintain',
    description: 'Stay at current weight',
    weeklyGoal: 'maintain',
    macroPreset: 'balanced',
    icon: 'Minus',
    color: '#00D4FF',
  },
  bulk: {
    label: 'Bulk',
    description: 'Build muscle, gain strength',
    weeklyGoal: 'gain05',
    macroPreset: 'highProtein',
    icon: 'TrendingUp',
    color: '#00E676',
  },
};

// Weekly goal calorie adjustments
const WEEKLY_GOALS: Record<string, WeeklyGoalInfo> = {
  lose2: { label: 'Lose 2 lbs/week', adjustment: -1000 },
  lose1: { label: 'Lose 1 lb/week', adjustment: -500 },
  lose05: { label: 'Lose 0.5 lbs/week', adjustment: -250 },
  maintain: { label: 'Maintain weight', adjustment: 0 },
  gain05: { label: 'Gain 0.5 lbs/week', adjustment: 250 },
  gain1: { label: 'Gain 1 lb/week', adjustment: 500 },
};

// Macro split presets
export const MACRO_PRESETS: Record<string, MacroPresetInfo> = {
  bodyweight: {
    label: 'Bodyweight-Based',
    description: '2g protein/kg, 0.8g fat/kg, fill carbs',
    protein: 0, // Calculated dynamically
    carbs: 0,
    fat: 0,
    isBodyweightBased: true,
  },
  balanced: {
    label: 'Balanced',
    description: 'Standard healthy diet',
    protein: 30,
    carbs: 40,
    fat: 30,
  },
  highProtein: {
    label: 'High Protein',
    description: 'Muscle building & recovery',
    protein: 40,
    carbs: 30,
    fat: 30,
  },
  lowCarb: {
    label: 'Low Carb',
    description: 'Reduced carbohydrate intake',
    protein: 35,
    carbs: 25,
    fat: 40,
  },
  keto: {
    label: 'Keto',
    description: 'Very low carb, high fat',
    protein: 25,
    carbs: 5,
    fat: 70,
  },
  athletic: {
    label: 'Athletic',
    description: 'High carb for performance',
    protein: 25,
    carbs: 50,
    fat: 25,
  },
  custom: {
    label: 'Custom',
    description: 'Your own split',
    protein: 30,
    carbs: 40,
    fat: 30,
  },
};

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * For men: BMR = (10 * weight in kg) + (6.25 * height in cm) - (5 * age) + 5
 * For women: BMR = (10 * weight in kg) + (6.25 * height in cm) - (5 * age) - 161
 */
function calculateBMR(weightLbs: number | null, heightInches: number | null, age: number | null, gender: string): number | null {
  if (weightLbs == null || heightInches == null || age == null) return null;

  // Convert to metric
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;

  // Mifflin-St Jeor Equation
  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender === 'male') {
    return Math.round(baseBMR + 5);
  } else {
    return Math.round(baseBMR - 161);
  }
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = BMR * Activity Multiplier
 */
function calculateTDEE(bmr: number | null, activityLevel: string): number | null {
  if (!bmr) return null;
  const multiplier = ACTIVITY_LEVELS[activityLevel]?.multiplier || 1.55;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate daily calorie goal based on TDEE and weight goal
 */
function calculateDailyCalorieGoal(tdee: number | null, weeklyGoal: string): number {
  if (!tdee) return 2000; // Default fallback
  const adjustment = WEEKLY_GOALS[weeklyGoal]?.adjustment || 0;
  const goal = tdee + adjustment;
  // Ensure minimum safe calorie intake
  return Math.max(goal, 1200);
}

/**
 * Calculate macro goals based on bodyweight
 * Protein: 2.0g per kg bodyweight
 * Fat: 0.8g per kg bodyweight
 * Carbs: Fill remaining calories
 */
function calculateBodyweightMacros(calorieGoal: number, weightLbs: number | null): { protein: number; carbs: number; fat: number } {
  if (weightLbs == null || !calorieGoal) {
    return { protein: 150, carbs: 200, fat: 65 }; // Defaults
  }

  const weightKg = weightLbs * 0.453592;

  // Protein: 2.0g per kg
  const protein = Math.round(weightKg * 2.0);
  const proteinCals = protein * 4;

  // Fat: 0.8g per kg
  const fat = Math.round(weightKg * 0.8);
  const fatCals = fat * 9;

  // Carbs: Fill remaining calories
  const remainingCals = Math.max(calorieGoal - proteinCals - fatCals, 0);
  const carbs = Math.round(remainingCals / 4);

  return { protein, carbs, fat };
}

/**
 * Calculate macro goals based on calorie goal and macro split
 */
function calculateMacroGoals(
  calorieGoal: number,
  macroPreset: string = 'balanced',
  customMacros: { protein: number; carbs: number; fat: number } | null = null,
  weightLbs: number | null = null
): { protein: number; carbs: number; fat: number } {
  // Handle bodyweight-based calculation
  if (macroPreset === 'bodyweight') {
    return calculateBodyweightMacros(calorieGoal, weightLbs);
  }

  // Get the split percentages
  let split: { protein: number; carbs: number; fat: number };
  if (macroPreset === 'custom' && customMacros) {
    split = customMacros;
  } else {
    split = (MACRO_PRESETS[macroPreset] ?? MACRO_PRESETS.balanced) as { protein: number; carbs: number; fat: number };
  }

  // Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g
  return {
    protein: Math.round((calorieGoal * (split.protein / 100)) / 4),
    carbs: Math.round((calorieGoal * (split.carbs / 100)) / 4),
    fat: Math.round((calorieGoal * (split.fat / 100)) / 9),
  };
}

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]!;
}

// Get date string for N days ago
function getDateString(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0]!;
}

// Get day label (Mon, Tue, etc.) for a date string
function getDayLabel(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get the last N days of weight data for charts
 */
function getWeeklyWeightData(weightHistory: WeightHistoryEntry[], currentWeight: number | null, days: number = 7): WeeklyWeightDataEntry[] {
  const result: WeeklyWeightDataEntry[] = [];
  const historyMap: Record<string, number> = {};

  // Create a map for quick lookup
  weightHistory.forEach((entry) => {
    historyMap[entry.date] = entry.weight;
  });

  // Add today's weight
  const today = getTodayString();
  if (currentWeight && !historyMap[today]) {
    historyMap[today] = currentWeight;
  }

  for (let i = days - 1; i >= 0; i--) {
    const dateStr = getDateString(i);
    const dayLabel = getDayLabel(dateStr);
    const weight = historyMap[dateStr] || null;

    result.push({
      date: dateStr,
      day: dayLabel,
      weight: weight,
      isToday: i === 0,
    });
  }

  // Interpolate missing values for smoother chart
  let lastKnownWeight: number | null = null;
  for (let i = 0; i < result.length; i++) {
    const entry = result[i]!;
    if (entry.weight !== null) {
      lastKnownWeight = entry.weight;
    } else if (lastKnownWeight !== null) {
      entry.weight = lastKnownWeight;
      entry.interpolated = true;
    }
  }

  // Fill backwards for any remaining nulls at the start
  lastKnownWeight = null;
  for (let i = result.length - 1; i >= 0; i--) {
    const entry = result[i]!;
    if (entry.weight !== null && !entry.interpolated) {
      lastKnownWeight = entry.weight;
    } else if (entry.weight === null && lastKnownWeight !== null) {
      entry.weight = lastKnownWeight;
      entry.interpolated = true;
    }
  }

  return result;
}

function createHydratedProfile(
  rawProfile: Partial<Profile> | null | undefined,
  fallbackProfile: Profile = initialProfile
): Profile {
  const mergedProfile: Profile = {
    ...fallbackProfile,
    ...rawProfile,
    customMacros: {
      ...fallbackProfile.customMacros,
      ...(rawProfile?.customMacros || {}),
    },
    equipment: Array.isArray(rawProfile?.equipment) ? rawProfile.equipment : fallbackProfile.equipment,
    dietaryRestrictions: Array.isArray(rawProfile?.dietaryRestrictions)
      ? rawProfile.dietaryRestrictions
      : fallbackProfile.dietaryRestrictions,
    bmr: null,
    tdee: null,
  };

  const bmr = calculateBMR(
    mergedProfile.weight,
    mergedProfile.height,
    mergedProfile.age,
    mergedProfile.gender
  );
  const tdee = calculateTDEE(bmr, mergedProfile.activityLevel);

  return {
    ...mergedProfile,
    bmr,
    tdee,
  };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [weightHistory, setWeightHistory] = useState<WeightHistoryEntry[]>([]);
  const [activeTargets, setActiveTargets] = useState<MacroSet | null>(null);
  const [pendingTargets, setPendingTargets] = useState<MacroSet | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [profileHydrationState, setProfileHydrationState] = useState<ProfileHydrationState>('missing');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const onboardingDataRef = useRef<Record<string, unknown> | null>(null);

  const profileCacheKey = useMemo(() => buildProfileCacheKey(userId), [userId]);

  const applyResolvedState = useCallback((nextState: {
    profile: Profile;
    weightHistory: WeightHistoryEntry[];
    activeTargets: MacroSet | null;
    pendingTargets: MacroSet | null;
    hasCompletedOnboarding: boolean;
    hydrationState: ProfileHydrationState;
    onboardingData?: Record<string, unknown> | null;
  }) => {
    setProfile(nextState.profile);
    setWeightHistory(nextState.weightHistory);
    setActiveTargets(nextState.activeTargets);
    setPendingTargets(nextState.pendingTargets);
    setHasCompletedOnboarding(nextState.hasCompletedOnboarding);
    setProfileHydrationState(nextState.hydrationState);
    onboardingDataRef.current = nextState.onboardingData || null;
  }, []);

  const persistProfileCache = useCallback(async (payload: {
    profile: Profile;
    weightHistory: WeightHistoryEntry[];
    activeTargets: MacroSet | null;
    pendingTargets: MacroSet | null;
    hasCompletedOnboarding: boolean;
  }) => {
    if (!userId) {
      return;
    }

    try {
      await AsyncStorage.setItem(
        profileCacheKey,
        JSON.stringify({
          version: 2,
          profile: payload.profile,
          weightHistory: payload.weightHistory,
          meta: createStoredProfileMeta({
            hasCompletedOnboarding: payload.hasCompletedOnboarding,
            activeTargets: payload.activeTargets,
            pendingTargets: payload.pendingTargets,
            lastHydratedAt: Date.now(),
          }),
        })
      );
    } catch (cacheError: any) {
      if (__DEV__) {
        console.warn('Failed to write profile cache:', cacheError.message);
      }
    }
  }, [profileCacheKey, userId]);

  const readCachedProfile = useCallback(async () => {
    if (!userId) {
      return null;
    }

    for (const key of [profileCacheKey, ...getLegacyProfileCacheKeys()]) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) {
          continue;
        }

        const normalized = normalizeStoredProfileCache<Profile>(JSON.parse(raw));
        if (normalized) {
          const cachedWeightHistory = (normalized.weightHistory || []) as unknown as WeightHistoryEntry[];
          if (key !== profileCacheKey) {
            void persistProfileCache({
              profile: createHydratedProfile(normalized.profile || initialProfile),
              weightHistory: cachedWeightHistory,
              activeTargets: normalized.meta.activeTargets,
              pendingTargets: normalized.meta.pendingTargets,
              hasCompletedOnboarding: normalized.meta.hasCompletedOnboarding,
            });
          }
          return {
            ...normalized,
            weightHistory: cachedWeightHistory as unknown as Array<Record<string, unknown>>,
          };
        }
      } catch (cacheError: any) {
        if (__DEV__) {
          console.warn('Failed to read profile cache:', cacheError.message);
        }
      }
    }

    return null;
  }, [persistProfileCache, profileCacheKey, userId]);

  const hydrateProfile = useCallback(async (options: { preferCache?: boolean } = {}) => {
    if (!userId) {
      applyResolvedState({
        profile: initialProfile,
        weightHistory: [],
        activeTargets: null,
        pendingTargets: null,
        hasCompletedOnboarding: false,
        hydrationState: 'missing',
        onboardingData: null,
      });
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    const preferCache = options.preferCache !== false;
    setIsLoading(true);

    const cachedSnapshot = preferCache ? await readCachedProfile() : null;

    if (cachedSnapshot?.profile) {
      const cachedProfile = createHydratedProfile(cachedSnapshot.profile, initialProfile);
      const cachedResolution = resolveProfileHydration({
        cachedActivation: cachedSnapshot.meta.hasCompletedOnboarding,
        serverActivation: false,
        profile: cachedProfile,
        hasAnyPersistedProfileData: true,
      });

      applyResolvedState({
        profile: cachedProfile,
        weightHistory: (cachedSnapshot.weightHistory || []) as unknown as WeightHistoryEntry[],
        activeTargets: cachedSnapshot.meta.activeTargets || deriveTargetsFromProfile(cachedProfile),
        pendingTargets: cachedSnapshot.meta.pendingTargets,
        hasCompletedOnboarding: cachedResolution.hasCompletedOnboarding,
        hydrationState: cachedResolution.hydrationState,
      });
      setIsLoading(false);
      setIsHydrated(true);
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116' && __DEV__) {
        console.error('Error fetching profile:', profileError.code, profileError.message, profileError.details);
      }

      if (!profileData) {
        const fallbackProfile = cachedSnapshot?.profile
          ? createHydratedProfile(cachedSnapshot.profile, initialProfile)
          : initialProfile;
        const resolution = resolveProfileHydration({
          cachedActivation: cachedSnapshot?.meta.hasCompletedOnboarding || false,
          serverActivation: false,
          profile: fallbackProfile,
          hasAnyPersistedProfileData: Boolean(cachedSnapshot?.profile),
        });

        applyResolvedState({
          profile: fallbackProfile,
          weightHistory: (cachedSnapshot?.weightHistory || []) as unknown as WeightHistoryEntry[],
          activeTargets: cachedSnapshot?.meta.activeTargets || null,
          pendingTargets: cachedSnapshot?.meta.pendingTargets || null,
          hasCompletedOnboarding: resolution.hasCompletedOnboarding,
          hydrationState: resolution.hydrationState,
          onboardingData: onboardingDataRef.current,
        });

        try {
          await supabase.from('profiles').insert({ user_id: userId }).select();
        } catch (_insertError) {
          // Best-effort bootstrap row creation only.
        }
        return;
      }

      const fallbackProfile = cachedSnapshot?.profile
        ? createHydratedProfile(cachedSnapshot.profile, initialProfile)
        : initialProfile;
      const preserveExisting = Boolean(cachedSnapshot?.meta.hasCompletedOnboarding) || Boolean(profileData.onboarding_completed);

      const serverProfile = createHydratedProfile({
        name: profileData.name ?? fallbackProfile.name,
        weight: preserveExisting && profileData.weight == null ? fallbackProfile.weight : profileData.weight,
        height: preserveExisting && profileData.height == null ? fallbackProfile.height : profileData.height,
        age: preserveExisting && profileData.age == null ? fallbackProfile.age : profileData.age,
        gender: preserveExisting && profileData.gender == null ? fallbackProfile.gender : profileData.gender || 'male',
        activityLevel: preserveExisting && profileData.activity_level == null ? fallbackProfile.activityLevel : profileData.activity_level || 'moderate',
        goalWeight: preserveExisting && profileData.goal_weight == null ? fallbackProfile.goalWeight : profileData.goal_weight,
        weeklyGoal: preserveExisting && profileData.weekly_goal == null ? fallbackProfile.weeklyGoal : profileData.weekly_goal || 'maintain',
        macroPreset: preserveExisting && profileData.macro_preset == null ? fallbackProfile.macroPreset : profileData.macro_preset || 'balanced',
        customMacros: preserveExisting && profileData.custom_macros == null ? fallbackProfile.customMacros : profileData.custom_macros || { protein: 30, carbs: 40, fat: 30 },
        weightUnit: preserveExisting && profileData.weight_unit == null ? fallbackProfile.weightUnit : profileData.weight_unit || 'lbs',
        injuries: preserveExisting && profileData.injuries == null ? fallbackProfile.injuries : profileData.injuries || '',
        equipment: preserveExisting && profileData.equipment == null ? fallbackProfile.equipment : profileData.equipment || [],
        dietaryRestrictions: preserveExisting && profileData.dietary_restrictions == null ? fallbackProfile.dietaryRestrictions : profileData.dietary_restrictions || [],
      }, fallbackProfile);

      const nextWeightHistory = Array.isArray(profileData.weight_history)
        ? profileData.weight_history as unknown as WeightHistoryEntry[]
        : (cachedSnapshot?.weightHistory || []) as unknown as WeightHistoryEntry[];
      const onboardingData =
        profileData.onboarding_data && typeof profileData.onboarding_data === 'object'
          ? profileData.onboarding_data
          : onboardingDataRef.current;
      const resolution = resolveProfileHydration({
        cachedActivation: cachedSnapshot?.meta.hasCompletedOnboarding || false,
        serverActivation: Boolean(profileData.onboarding_completed),
        profile: serverProfile,
        hasAnyPersistedProfileData: Boolean(cachedSnapshot?.profile) || Boolean(profileData),
      });
      const derivedServerTargets = deriveTargetsFromProfile(serverProfile);
      const resolvedActiveTargets =
        sanitizeMacroSet(onboardingData?.activeTargets) ||
        cachedSnapshot?.meta.activeTargets ||
        (resolution.hasCompletedOnboarding ? derivedServerTargets : null);

      applyResolvedState({
        profile: serverProfile,
        weightHistory: nextWeightHistory,
        activeTargets: resolvedActiveTargets,
        pendingTargets: cachedSnapshot?.meta.pendingTargets || null,
        hasCompletedOnboarding: resolution.hasCompletedOnboarding,
        hydrationState: resolution.hydrationState,
        onboardingData: onboardingData as Record<string, unknown> | null,
      });

      await persistProfileCache({
        profile: serverProfile,
        weightHistory: nextWeightHistory,
        activeTargets: resolvedActiveTargets,
        pendingTargets: cachedSnapshot?.meta.pendingTargets || null,
        hasCompletedOnboarding: resolution.hasCompletedOnboarding,
      });

      if (resolution.hasCompletedOnboarding && resolvedActiveTargets) {
        const serverTargets = derivedServerTargets;
        if (
          !sanitizeMacroSet(onboardingData?.activeTargets) ||
          JSON.stringify(serverTargets) !== JSON.stringify(resolvedActiveTargets)
        ) {
          const nextOnboardingData = {
            ...(onboardingData || {}),
            activeTargets: resolvedActiveTargets,
          };
          onboardingDataRef.current = nextOnboardingData;
          void (async () => {
            try {
              await supabase
                .from('profiles')
                .update({
                  onboarding_completed: true,
                  onboarding_data: nextOnboardingData,
                })
                .eq('user_id', userId);
            } catch (_syncError) {
              // Cache already holds the durable activation state.
            }
          })();
        }
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Failed to load profile:', error.message);
      }
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [applyResolvedState, persistProfileCache, readCachedProfile, userId]);

  useEffect(() => {
    hydrateProfile({ preferCache: true });
  }, [hydrateProfile]);

  const fetchProfile = useCallback(async () => {
    await hydrateProfile({ preferCache: false });
  }, [hydrateProfile]);

  const updateProfile = useCallback(async (
    updates: Partial<Profile>,
    options: ProfileUpdateOptions = {}
  ): Promise<ProfileUpdateResult> => {
    if (!userId) {
      return {
        activeTargets,
        pendingTargets,
        targetAction: 'preserved',
      };
    }

    const today = getTodayString();
    let nextWeightHistory = weightHistory;

    if (updates.weight !== undefined && updates.weight !== null) {
      const filtered = weightHistory.filter((entry) => entry.date !== today);
      nextWeightHistory = [...filtered, { date: today, weight: updates.weight }]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-90);
    }

    const nextProfile = createHydratedProfile({
      ...profile,
      ...updates,
    }, profile);

    let nextActiveTargets = activeTargets;
    let nextPendingTargets = pendingTargets;
    let targetAction: ProfileUpdateResult['targetAction'] = 'preserved';
    const committedTargets = options.commitTargets || null;

    if (committedTargets) {
      nextActiveTargets = committedTargets;
      nextPendingTargets = null;
      targetAction = 'committed';
    } else if (options.targetBehavior === 'commit_generated') {
      nextActiveTargets = deriveTargetsFromProfile(nextProfile);
      nextPendingTargets = null;
      targetAction = 'committed';
    } else if (shouldRegenerateTargets(updates as Record<string, unknown>)) {
      nextPendingTargets = deriveTargetsFromProfile(nextProfile);
      targetAction = 'pending';
    } else if (!nextActiveTargets) {
      nextActiveTargets = deriveTargetsFromProfile(nextProfile);
    }

    const nextResolution = resolveProfileHydration({
      cachedActivation: hasCompletedOnboarding || Boolean(options.onboardingCompleted),
      serverActivation: Boolean(options.onboardingCompleted),
      profile: nextProfile,
      hasAnyPersistedProfileData: true,
    });

    setProfile(nextProfile);
    setWeightHistory(nextWeightHistory);
    setActiveTargets(nextActiveTargets);
    setPendingTargets(nextPendingTargets);
    setHasCompletedOnboarding(nextResolution.hasCompletedOnboarding);
    setProfileHydrationState(nextResolution.hydrationState);

    const nextOnboardingData = {
      ...(onboardingDataRef.current || {}),
      ...(options.onboardingData || {}),
      ...(nextActiveTargets ? { activeTargets: nextActiveTargets } : {}),
    };
    onboardingDataRef.current = nextOnboardingData;

    try {
      const supabaseUpdates: Record<string, unknown> = {};

      if (updates.weight !== undefined) supabaseUpdates.weight = updates.weight;
      if (updates.height !== undefined) supabaseUpdates.height = updates.height;
      if (updates.age !== undefined) supabaseUpdates.age = updates.age;
      if (updates.gender !== undefined) supabaseUpdates.gender = updates.gender;
      if (updates.activityLevel !== undefined) supabaseUpdates.activity_level = updates.activityLevel;
      if (updates.goalWeight !== undefined) supabaseUpdates.goal_weight = updates.goalWeight;
      if (updates.weeklyGoal !== undefined) supabaseUpdates.weekly_goal = updates.weeklyGoal;
      if (updates.macroPreset !== undefined) supabaseUpdates.macro_preset = updates.macroPreset;
      if (updates.customMacros !== undefined) supabaseUpdates.custom_macros = updates.customMacros;
      if (updates.weightUnit !== undefined) supabaseUpdates.weight_unit = updates.weightUnit;
      if (updates.injuries !== undefined) supabaseUpdates.injuries = updates.injuries;
      if (updates.equipment !== undefined) supabaseUpdates.equipment = updates.equipment;
      if (updates.dietaryRestrictions !== undefined) supabaseUpdates.dietary_restrictions = updates.dietaryRestrictions;
      if (updates.weight !== undefined) {
        supabaseUpdates.weight_history = nextWeightHistory;
      }

      if (options.onboardingCompleted || hasCompletedOnboarding) {
        supabaseUpdates.onboarding_completed = true;
      }

      if (Object.keys(nextOnboardingData).length > 0) {
        supabaseUpdates.onboarding_data = nextOnboardingData;
      }

      supabaseUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update(supabaseUpdates)
        .eq('user_id', userId)
        .select();

      if (error && __DEV__) {
        console.error('Error updating profile:', error.code);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Failed to save profile to Supabase:', error.message);
      }
    }

    await persistProfileCache({
      profile: nextProfile,
      weightHistory: nextWeightHistory,
      activeTargets: nextActiveTargets,
      pendingTargets: nextPendingTargets,
      hasCompletedOnboarding: nextResolution.hasCompletedOnboarding,
    });

    await hapticSuccess();

    return {
      activeTargets: nextActiveTargets,
      pendingTargets: nextPendingTargets,
      targetAction,
    };
  }, [
    activeTargets,
    hasCompletedOnboarding,
    pendingTargets,
    persistProfileCache,
    profile,
    userId,
    weightHistory,
  ]);

  const applyPendingTargets = useCallback(async () => {
    if (!userId || !pendingTargets) {
      return;
    }

    setActiveTargets(pendingTargets);
    setPendingTargets(null);
    onboardingDataRef.current = {
      ...(onboardingDataRef.current || {}),
      activeTargets: pendingTargets,
    };

    await persistProfileCache({
      profile,
      weightHistory,
      activeTargets: pendingTargets,
      pendingTargets: null,
      hasCompletedOnboarding,
    });

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: hasCompletedOnboarding,
          onboarding_data: onboardingDataRef.current,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select();
    } catch (_applyError) {
      // Local cache already reflects the applied targets.
    }
  }, [hasCompletedOnboarding, pendingTargets, persistProfileCache, profile, userId, weightHistory]);

  const discardPendingTargets = useCallback(async () => {
    setPendingTargets(null);
    await persistProfileCache({
      profile,
      weightHistory,
      activeTargets,
      pendingTargets: null,
      hasCompletedOnboarding,
    });
  }, [activeTargets, hasCompletedOnboarding, persistProfileCache, profile, weightHistory]);

  // Quick switch goal type (Cut/Maintain/Bulk)
  const switchGoalType = useCallback(async (goalType: string) => {
    const goalConfig = GOAL_TYPES[goalType];
    if (!goalConfig) return;

    await updateProfile({
      weeklyGoal: goalConfig.weeklyGoal,
      macroPreset: goalConfig.macroPreset,
    }, { targetBehavior: 'commit_generated' });

    // Heavy haptic for mode switch
    await hapticHeavy();
  }, [updateProfile]);

  // Get current goal type based on weeklyGoal
  const currentGoalType = useMemo<string>(() => {
    const { weeklyGoal } = profile;
    if (weeklyGoal.startsWith('lose')) return 'cut';
    if (weeklyGoal.startsWith('gain')) return 'bulk';
    return 'maintain';
  }, [profile.weeklyGoal]);

  // Computed values
  const calculatedGoals = useMemo<MacroSet>(() => {
    return activeTargets || deriveTargetsFromProfile(profile) || {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    };
  }, [activeTargets, profile]);

  // Get current macro split percentages
  const currentMacroSplit = useMemo<{ protein: number; carbs: number; fat: number; isBodyweightBased?: boolean }>(() => {
    if (profile.macroPreset === 'custom' && profile.customMacros) {
      return profile.customMacros;
    }
    return (MACRO_PRESETS[profile.macroPreset] ?? MACRO_PRESETS.balanced) as { protein: number; carbs: number; fat: number };
  }, [profile.macroPreset, profile.customMacros]);

  // Weekly weight data for charts
  const weeklyWeightData = useMemo<WeeklyWeightDataEntry[]>(() => {
    return getWeeklyWeightData(weightHistory, profile.weight, 7);
  }, [weightHistory, profile.weight]);

  // Smart water goal calculation: weight(lbs) * 35ml / 2.205 ~ weight(kg) * 35ml
  // Or simply: weight(lbs) * 15.87ml for a simpler approximation
  // We'll use weight(kg) * 35ml which is a common recommendation
  const calculatedWaterGoal = useMemo<number>(() => {
    if (!profile.weight) return 2500; // Default 2500ml
    const weightKg = profile.weight * 0.453592;
    const goal = Math.round(weightKg * 35);
    // Round to nearest 50ml and ensure minimum of 1500ml
    return Math.max(1500, Math.round(goal / 50) * 50);
  }, [profile.weight]);

  // Weight stats
  const weightStats = useMemo<WeightStats>(() => {
    if (!profile.weight || weightHistory.length === 0) {
      return {
        currentWeight: profile.weight || null,
        weeklyChange: null,
        startWeight: null,
        totalChange: null,
        goalWeight: profile.goalWeight || null,
        toGoal: null,
      };
    }

    // Find oldest weight in history
    const sortedHistory = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
    const startWeight = sortedHistory[0]?.weight || profile.weight;

    // Find weight from 7 days ago if available
    const weekAgo = getDateString(7);
    const weekAgoEntry = weightHistory.find((e) => e.date <= weekAgo);
    const weeklyChange = weekAgoEntry ? profile.weight - weekAgoEntry.weight : null;

    return {
      currentWeight: profile.weight,
      weeklyChange: weeklyChange !== null ? Math.round(weeklyChange * 10) / 10 : null,
      startWeight,
      totalChange: Math.round((profile.weight - startWeight) * 10) / 10,
      goalWeight: profile.goalWeight || null,
      toGoal: profile.goalWeight ? Math.round((profile.weight - profile.goalWeight) * 10) / 10 : null,
    };
  }, [profile.weight, profile.goalWeight, weightHistory]);

  // Check if essential profile data exists (for onboarding redirect)
  const isProfileComplete = useMemo<boolean>(() => {
    return hasCompletedOnboarding || isEssentialProfileComplete(profile);
  }, [hasCompletedOnboarding, profile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      isLoading,
      isHydrated,
      updateProfile,
      fetchProfile,
      calculatedGoals,
      pendingTargets,
      hasCompletedOnboarding,
      profileHydrationState,
      applyPendingTargets,
      discardPendingTargets,
      activityLevels: ACTIVITY_LEVELS,
      weeklyGoals: WEEKLY_GOALS,
      macroPresets: MACRO_PRESETS,
      goalTypes: GOAL_TYPES,
      currentMacroSplit,
      // Quick goal switching
      switchGoalType,
      currentGoalType,
      // Helper to check if profile is complete (has essential data for calculations)
      isProfileComplete,
      // Weight tracking
      weightHistory,
      weeklyWeightData,
      weightStats,
      // Hydration
      calculatedWaterGoal,
    }),
    [
      profile,
      isLoading,
      isHydrated,
      updateProfile,
      fetchProfile,
      calculatedGoals,
      pendingTargets,
      hasCompletedOnboarding,
      profileHydrationState,
      applyPendingTargets,
      discardPendingTargets,
      currentMacroSplit,
      switchGoalType,
      currentGoalType,
      isProfileComplete,
      weightHistory,
      weeklyWeightData,
      weightStats,
      calculatedWaterGoal,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
