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
  buildOnboardingStatePayload,
  buildProfileSupabaseUpdates,
  buildProfileCacheKey,
  createStoredProfileMeta,
  deriveTargetsFromProfile,
  hasExplicitActivationMarker,
  isEssentialProfileComplete,
  getLegacyProfileCacheKeys,
  normalizeStoredProfileMeasurements,
  normalizeStoredProfileCache,
  resolveProfileHydration,
  resolvePersistedTargets,
  sanitizeMacroSet,
  shouldTrustHydratedProfileSnapshot,
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
  const normalizedRawProfile = normalizeStoredProfileMeasurements(rawProfile);
  const mergedProfile: Profile = {
    ...fallbackProfile,
    ...normalizedRawProfile,
    customMacros: {
      ...fallbackProfile.customMacros,
      ...(normalizedRawProfile?.customMacros || {}),
    },
    equipment: Array.isArray(normalizedRawProfile?.equipment) ? normalizedRawProfile.equipment : fallbackProfile.equipment,
    dietaryRestrictions: Array.isArray(normalizedRawProfile?.dietaryRestrictions)
      ? normalizedRawProfile.dietaryRestrictions
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

function preferPersistedValue<T>(incomingValue: T | null | undefined, fallbackValue: T): T {
  return incomingValue ?? fallbackValue;
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
  const hydrationRequestIdRef = useRef(0);
  const profileRef = useRef<Profile>(initialProfile);
  const weightHistoryRef = useRef<WeightHistoryEntry[]>([]);
  const activeTargetsRef = useRef<MacroSet | null>(null);
  const pendingTargetsRef = useRef<MacroSet | null>(null);
  const hasCompletedOnboardingRef = useRef<boolean>(false);
  const isHydratedRef = useRef<boolean>(false);

  const profileCacheKey = useMemo(() => buildProfileCacheKey(userId), [userId]);

  useEffect(() => {
    profileRef.current = profile;
    weightHistoryRef.current = weightHistory;
    activeTargetsRef.current = activeTargets;
    pendingTargetsRef.current = pendingTargets;
    hasCompletedOnboardingRef.current = hasCompletedOnboarding;
    isHydratedRef.current = isHydrated;
  }, [activeTargets, hasCompletedOnboarding, isHydrated, pendingTargets, profile, weightHistory]);

  const applyResolvedState = useCallback((nextState: {
    profile: Profile;
    weightHistory: WeightHistoryEntry[];
    activeTargets: MacroSet | null;
    pendingTargets: MacroSet | null;
    hasCompletedOnboarding: boolean;
    hydrationState: ProfileHydrationState;
    onboardingData?: Record<string, unknown> | null;
  }) => {
    profileRef.current = nextState.profile;
    weightHistoryRef.current = nextState.weightHistory;
    activeTargetsRef.current = nextState.activeTargets;
    pendingTargetsRef.current = nextState.pendingTargets;
    hasCompletedOnboardingRef.current = nextState.hasCompletedOnboarding;
    setProfile(nextState.profile);
    setWeightHistory(nextState.weightHistory);
    setActiveTargets(nextState.activeTargets);
    setPendingTargets(nextState.pendingTargets);
    setHasCompletedOnboarding(nextState.hasCompletedOnboarding);
    setProfileHydrationState(nextState.hydrationState);
    if (nextState.onboardingData !== undefined) {
      onboardingDataRef.current = nextState.onboardingData || null;
    }
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
            activationCompletedAt: Number(onboardingDataRef.current?.activationCompletedAt) || null,
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
            weightHistory: cachedWeightHistory as unknown as Record<string, unknown>[],
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
    const requestId = hydrationRequestIdRef.current + 1;
    hydrationRequestIdRef.current = requestId;
    const isCurrentRequest = () => hydrationRequestIdRef.current === requestId;

    if (!userId) {
      if (isCurrentRequest()) {
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
        isHydratedRef.current = true;
      }
      return;
    }

    const preferCache = options.preferCache !== false;
    if (!isHydratedRef.current) {
      setIsLoading(true);
      setIsHydrated(false);
      isHydratedRef.current = false;
    }

    const cachedSnapshot = preferCache ? await readCachedProfile() : null;
    if (!isCurrentRequest()) {
      return;
    }

    const inMemoryProfile = isHydratedRef.current
      ? createHydratedProfile(profileRef.current, initialProfile)
      : initialProfile;
    const inMemoryWeightHistory = isHydratedRef.current ? weightHistoryRef.current : [];
    const persistedActivation =
      Boolean(cachedSnapshot?.meta.hasCompletedOnboarding) ||
      Boolean(cachedSnapshot?.meta.activationCompletedAt) ||
      hasCompletedOnboardingRef.current ||
      hasExplicitActivationMarker(onboardingDataRef.current);
    const persistedActiveTargets = cachedSnapshot?.meta.activeTargets || activeTargetsRef.current || null;
    const persistedPendingTargets = cachedSnapshot?.meta.pendingTargets || pendingTargetsRef.current || null;

    if (cachedSnapshot?.profile) {
      const cachedProfile = createHydratedProfile(cachedSnapshot.profile, inMemoryProfile);
      const cachedResolution = resolveProfileHydration({
        cachedActivation: persistedActivation,
        serverActivation: false,
        profile: cachedProfile,
        hasAnyPersistedProfileData: true,
      });
      const cachedTargets = resolvePersistedTargets({
        cachedActiveTargets: persistedActiveTargets,
        cachedPendingTargets: persistedPendingTargets,
        onboardingData: onboardingDataRef.current,
        hasCompletedOnboarding: cachedResolution.hasCompletedOnboarding,
        derivedTargets: cachedResolution.hasCompletedOnboarding
          ? deriveTargetsFromProfile(cachedProfile)
          : null,
      });

      applyResolvedState({
        profile: cachedProfile,
        weightHistory: (cachedSnapshot.weightHistory || []) as unknown as WeightHistoryEntry[],
        activeTargets: cachedTargets.activeTargets,
        pendingTargets: cachedTargets.pendingTargets,
        hasCompletedOnboarding: cachedResolution.hasCompletedOnboarding,
        hydrationState: cachedResolution.hydrationState,
      });

      if (shouldTrustHydratedProfileSnapshot(cachedResolution)) {
        setIsLoading(false);
        setIsHydrated(true);
        isHydratedRef.current = true;
      }
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
          ? createHydratedProfile(cachedSnapshot.profile, inMemoryProfile)
          : inMemoryProfile;
        const resolution = resolveProfileHydration({
          cachedActivation: persistedActivation,
          serverActivation: false,
          profile: fallbackProfile,
          hasAnyPersistedProfileData: Boolean(cachedSnapshot?.profile) || isHydratedRef.current,
        });
        const targetResolution = resolvePersistedTargets({
          cachedActiveTargets: persistedActiveTargets,
          cachedPendingTargets: persistedPendingTargets,
          onboardingData: onboardingDataRef.current,
          hasCompletedOnboarding: resolution.hasCompletedOnboarding,
          derivedTargets: resolution.hasCompletedOnboarding
            ? deriveTargetsFromProfile(fallbackProfile)
            : null,
        });
        const nextOnboardingData = buildOnboardingStatePayload({
          existingData: onboardingDataRef.current,
          activeTargets: targetResolution.activeTargets,
          draftTargets: targetResolution.pendingTargets,
          onboardingCompleted: resolution.hasCompletedOnboarding,
        });

        applyResolvedState({
          profile: fallbackProfile,
          weightHistory: (cachedSnapshot?.weightHistory || inMemoryWeightHistory) as unknown as WeightHistoryEntry[],
          activeTargets: targetResolution.activeTargets,
          pendingTargets: targetResolution.pendingTargets,
          hasCompletedOnboarding: resolution.hasCompletedOnboarding,
          hydrationState: resolution.hydrationState,
          onboardingData: nextOnboardingData,
        });

        try {
          await supabase.from('profiles').insert({ user_id: userId }).select();
        } catch {
          // Best-effort bootstrap row creation only.
        }
        return;
      }
      if (!isCurrentRequest()) {
        return;
      }

      const fallbackProfile = cachedSnapshot?.profile
        ? createHydratedProfile(cachedSnapshot.profile, inMemoryProfile)
        : inMemoryProfile;
      const serverOnboardingData =
        profileData.onboarding_data && typeof profileData.onboarding_data === 'object'
          ? profileData.onboarding_data
          : null;
      const serverActivation =
        Boolean(profileData.onboarding_completed) ||
        hasExplicitActivationMarker(serverOnboardingData);

      const serverProfile = createHydratedProfile({
        name: preferPersistedValue(profileData.name, fallbackProfile.name),
        weight: preferPersistedValue(profileData.weight, fallbackProfile.weight),
        height: preferPersistedValue(profileData.height, fallbackProfile.height),
        age: preferPersistedValue(profileData.age, fallbackProfile.age),
        gender: preferPersistedValue(profileData.gender, fallbackProfile.gender) || 'male',
        activityLevel: preferPersistedValue(profileData.activity_level, fallbackProfile.activityLevel) || 'moderate',
        goalWeight: preferPersistedValue(profileData.goal_weight, fallbackProfile.goalWeight),
        weeklyGoal: preferPersistedValue(profileData.weekly_goal, fallbackProfile.weeklyGoal) || 'maintain',
        macroPreset: preferPersistedValue(profileData.macro_preset, fallbackProfile.macroPreset) || 'balanced',
        customMacros: preferPersistedValue(profileData.custom_macros, fallbackProfile.customMacros) || { protein: 30, carbs: 40, fat: 30 },
        weightUnit: preferPersistedValue(profileData.weight_unit, fallbackProfile.weightUnit) || 'lbs',
        injuries: preferPersistedValue(profileData.injuries, fallbackProfile.injuries) || '',
        equipment: preferPersistedValue(profileData.equipment, fallbackProfile.equipment) || [],
        dietaryRestrictions: preferPersistedValue(profileData.dietary_restrictions, fallbackProfile.dietaryRestrictions) || [],
      }, fallbackProfile);

      const nextWeightHistory = Array.isArray(profileData.weight_history)
        ? profileData.weight_history as unknown as WeightHistoryEntry[]
        : (cachedSnapshot?.weightHistory || inMemoryWeightHistory) as unknown as WeightHistoryEntry[];
      const resolution = resolveProfileHydration({
        cachedActivation: persistedActivation,
        serverActivation,
        profile: serverProfile,
        hasAnyPersistedProfileData: Boolean(cachedSnapshot?.profile) || isHydratedRef.current || Boolean(profileData),
      });
      const derivedServerTargets = deriveTargetsFromProfile(serverProfile);
      const targetResolution = resolvePersistedTargets({
        cachedActiveTargets: persistedActiveTargets,
        cachedPendingTargets: persistedPendingTargets,
        onboardingData: serverOnboardingData || onboardingDataRef.current,
        hasCompletedOnboarding: resolution.hasCompletedOnboarding,
        derivedTargets: resolution.hasCompletedOnboarding ? derivedServerTargets : null,
      });
      const nextOnboardingData = buildOnboardingStatePayload({
        existingData: (serverOnboardingData as Record<string, unknown> | null) || onboardingDataRef.current,
        activeTargets: targetResolution.activeTargets,
        draftTargets: targetResolution.pendingTargets,
        onboardingCompleted: resolution.hasCompletedOnboarding,
      });

      applyResolvedState({
        profile: serverProfile,
        weightHistory: nextWeightHistory,
        activeTargets: targetResolution.activeTargets,
        pendingTargets: targetResolution.pendingTargets,
        hasCompletedOnboarding: resolution.hasCompletedOnboarding,
        hydrationState: resolution.hydrationState,
        onboardingData: nextOnboardingData,
      });

      await persistProfileCache({
        profile: serverProfile,
        weightHistory: nextWeightHistory,
        activeTargets: targetResolution.activeTargets,
        pendingTargets: targetResolution.pendingTargets,
        hasCompletedOnboarding: resolution.hasCompletedOnboarding,
      });

      if (
        JSON.stringify(nextOnboardingData || {}) !== JSON.stringify(serverOnboardingData || {}) ||
        Boolean(profileData.onboarding_completed) !== resolution.hasCompletedOnboarding ||
        targetResolution.repairedActiveTargets
      ) {
        onboardingDataRef.current = nextOnboardingData;
        void (async () => {
          try {
            await supabase
              .from('profiles')
              .update({
                onboarding_completed: resolution.hasCompletedOnboarding,
                onboarding_data: nextOnboardingData,
              })
              .eq('user_id', userId);
          } catch {
            // Cache already holds the durable state.
          }
        })();
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Failed to load profile:', error.message);
      }
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
        setIsHydrated(true);
        isHydratedRef.current = true;
      }
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
    const committedTargets = sanitizeMacroSet(options.commitTargets);
    const shouldUpdateTargets = shouldRegenerateTargets(updates as Record<string, unknown>);
    const generatedTargets = shouldUpdateTargets ? deriveTargetsFromProfile(nextProfile) : null;
    const hasExplicitActivation =
      hasCompletedOnboarding ||
      Boolean(options.onboardingCompleted) ||
      hasExplicitActivationMarker(onboardingDataRef.current) ||
      hasExplicitActivationMarker(options.onboardingData);
    const sameTargets = (left: MacroSet | null, right: MacroSet | null): boolean =>
      JSON.stringify(left || null) === JSON.stringify(right || null);

    if (committedTargets) {
      nextActiveTargets = committedTargets;
      nextPendingTargets = null;
      targetAction = 'committed';
    } else if (options.targetBehavior === 'commit_generated') {
      if (generatedTargets) {
        nextActiveTargets = generatedTargets;
        nextPendingTargets = null;
        targetAction = 'committed';
      }
    } else if (shouldUpdateTargets && hasExplicitActivation && generatedTargets) {
      if (sameTargets(generatedTargets, nextActiveTargets)) {
        nextPendingTargets = null;
      } else {
        nextPendingTargets = generatedTargets;
        targetAction = 'pending';
      }
    }

    const nextResolution = resolveProfileHydration({
      cachedActivation: hasExplicitActivation,
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
    profileRef.current = nextProfile;
    weightHistoryRef.current = nextWeightHistory;
    activeTargetsRef.current = nextActiveTargets;
    pendingTargetsRef.current = nextPendingTargets;
    hasCompletedOnboardingRef.current = nextResolution.hasCompletedOnboarding;

    const nextOnboardingData = buildOnboardingStatePayload({
      existingData: {
        ...(onboardingDataRef.current || {}),
        ...(options.onboardingData || {}),
      },
      activeTargets: nextActiveTargets,
      draftTargets: nextPendingTargets,
      onboardingCompleted: nextResolution.hasCompletedOnboarding,
    });
    onboardingDataRef.current = nextOnboardingData;

    await persistProfileCache({
      profile: nextProfile,
      weightHistory: nextWeightHistory,
      activeTargets: nextActiveTargets,
      pendingTargets: nextPendingTargets,
      hasCompletedOnboarding: nextResolution.hasCompletedOnboarding,
    });

    try {
      const supabaseUpdates = buildProfileSupabaseUpdates({
        updates: updates as Record<string, unknown>,
        nextWeightHistory: nextWeightHistory as unknown as Record<string, unknown>[],
        hasCompletedOnboarding: nextResolution.hasCompletedOnboarding,
        onboardingCompleted: options.onboardingCompleted,
        onboardingData: nextOnboardingData,
      });

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
    activeTargetsRef.current = pendingTargets;
    pendingTargetsRef.current = null;
    const nextOnboardingData = buildOnboardingStatePayload({
      existingData: onboardingDataRef.current,
      activeTargets: pendingTargets,
      draftTargets: null,
      onboardingCompleted: hasCompletedOnboarding,
    });
    onboardingDataRef.current = nextOnboardingData;

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
          onboarding_data: nextOnboardingData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select();
    } catch {
      // Local cache already reflects the applied targets.
    }
  }, [hasCompletedOnboarding, pendingTargets, persistProfileCache, profile, userId, weightHistory]);

  const discardPendingTargets = useCallback(async () => {
    setPendingTargets(null);
    pendingTargetsRef.current = null;
    const nextOnboardingData = buildOnboardingStatePayload({
      existingData: onboardingDataRef.current,
      activeTargets,
      draftTargets: null,
      onboardingCompleted: hasCompletedOnboarding,
    });
    onboardingDataRef.current = nextOnboardingData;
    await persistProfileCache({
      profile,
      weightHistory,
      activeTargets,
      pendingTargets: null,
      hasCompletedOnboarding,
    });

    if (!userId) {
      return;
    }

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: hasCompletedOnboarding,
          onboarding_data: nextOnboardingData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select();
    } catch {
      // Local cache already reflects the discarded draft.
    }
  }, [activeTargets, hasCompletedOnboarding, persistProfileCache, profile, userId, weightHistory]);

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
    if (profile.weeklyGoal.startsWith('lose')) return 'cut';
    if (profile.weeklyGoal.startsWith('gain')) return 'bulk';
    return 'maintain';
  }, [profile.weeklyGoal]);

  // Computed values
  const calculatedGoals = useMemo<MacroSet>(() => {
    const draftTargets = !hasCompletedOnboarding
      ? pendingTargets || deriveTargetsFromProfile(profile)
      : null;

    return activeTargets || draftTargets || {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    };
  }, [activeTargets, hasCompletedOnboarding, pendingTargets, profile]);

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
