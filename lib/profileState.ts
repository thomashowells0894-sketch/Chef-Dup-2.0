import type { MacroSet } from '../types';

export const LEGACY_PROFILE_CACHE_KEY = '@fueliq_profile_cache';
export const PROFILE_CACHE_PREFIX = '@fueliq_profile_cache_v2:';
export const LEGACY_MEAL_DAY_CACHE_PREFIX = '@fueliq_meals_';
export const MEAL_DAY_CACHE_PREFIX = '@fueliq_meals_v2:';

export type ProfileHydrationState = 'missing' | 'incomplete' | 'complete';

export interface StoredProfileMeta {
  hasCompletedOnboarding: boolean;
  activeTargets: MacroSet | null;
  pendingTargets: MacroSet | null;
  lastHydratedAt: number | null;
}

export interface StoredProfileCache<TProfile = Record<string, unknown>> {
  version: number;
  profile: TProfile | null;
  weightHistory: Array<Record<string, unknown>>;
  meta: StoredProfileMeta;
}

interface ProfileLike {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  activityLevel?: string | null;
  tdee?: number | null;
  weeklyGoal?: string | null;
  macroPreset?: string | null;
  customMacros?: { protein?: number; carbs?: number; fat?: number } | null;
}

interface ResolveProfileHydrationInput {
  cachedActivation: boolean;
  serverActivation: boolean;
  profile: ProfileLike | null | undefined;
  hasAnyPersistedProfileData?: boolean;
}

interface ResolveProfileHydrationResult {
  hasCompletedOnboarding: boolean;
  hydrationState: ProfileHydrationState;
  shouldRouteToOnboarding: boolean;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  extreme: 1.9,
};

const WEEKLY_GOAL_ADJUSTMENTS: Record<string, number> = {
  lose2: -1000,
  lose1: -500,
  lose05: -250,
  maintain: 0,
  gain05: 250,
  gain1: 500,
};

const MACRO_PRESETS: Record<string, { protein: number; carbs: number; fat: number; bodyweight?: boolean }> = {
  bodyweight: { protein: 0, carbs: 0, fat: 0, bodyweight: true },
  balanced: { protein: 30, carbs: 40, fat: 30 },
  highProtein: { protein: 40, carbs: 30, fat: 30 },
  lowCarb: { protein: 35, carbs: 25, fat: 40 },
  keto: { protein: 25, carbs: 5, fat: 70 },
  athletic: { protein: 25, carbs: 50, fat: 25 },
  custom: { protein: 30, carbs: 40, fat: 30 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildProfileCacheKey(userId?: string | null): string {
  return `${PROFILE_CACHE_PREFIX}${userId || 'anonymous'}`;
}

export function getLegacyProfileCacheKeys(): string[] {
  return [LEGACY_PROFILE_CACHE_KEY];
}

export function buildMealCacheKey(userId: string | null | undefined, dateKey: string): string {
  return `${MEAL_DAY_CACHE_PREFIX}${userId || 'anonymous'}:${dateKey}`;
}

export function getLegacyMealCacheKeys(dateKey: string): string[] {
  return [`${LEGACY_MEAL_DAY_CACHE_PREFIX}${dateKey}`];
}

export function sanitizeMacroSet(raw: any): MacroSet | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const calories = Number(raw.calories);
  const protein = Number(raw.protein);
  const carbs = Number(raw.carbs);
  const fat = Number(raw.fat);

  if (
    !Number.isFinite(calories) || calories <= 0 ||
    !Number.isFinite(protein) || protein < 0 ||
    !Number.isFinite(carbs) || carbs < 0 ||
    !Number.isFinite(fat) || fat < 0
  ) {
    return null;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export function createStoredProfileMeta(meta?: Partial<StoredProfileMeta> | null): StoredProfileMeta {
  return {
    hasCompletedOnboarding: Boolean(meta?.hasCompletedOnboarding),
    activeTargets: sanitizeMacroSet(meta?.activeTargets),
    pendingTargets: sanitizeMacroSet(meta?.pendingTargets),
    lastHydratedAt: Number(meta?.lastHydratedAt) || null,
  };
}

export function normalizeStoredProfileCache<TProfile = Record<string, unknown>>(
  raw: any
): StoredProfileCache<TProfile> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const version = Number(raw.version) || 1;
  const profile = raw.profile && typeof raw.profile === 'object'
    ? raw.profile as TProfile
    : null;
  const weightHistory = Array.isArray(raw.weightHistory) ? raw.weightHistory : [];

  return {
    version,
    profile,
    weightHistory,
    meta: createStoredProfileMeta(raw.meta),
  };
}

export function isEssentialProfileComplete(profile: ProfileLike | null | undefined): boolean {
  const weight = Number(profile?.weight);
  const height = Number(profile?.height);
  const age = Number(profile?.age);

  return (
    Number.isFinite(weight) &&
    Number.isFinite(height) &&
    Number.isFinite(age) &&
    weight > 0 &&
    height > 0 &&
    age >= 13
  );
}

export function resolveProfileHydration(
  input: ResolveProfileHydrationInput
): ResolveProfileHydrationResult {
  const essentialsComplete = isEssentialProfileComplete(input.profile);
  const hasCompletedOnboarding =
    Boolean(input.cachedActivation) ||
    Boolean(input.serverActivation) ||
    essentialsComplete;

  let hydrationState: ProfileHydrationState = 'missing';
  if (essentialsComplete) {
    hydrationState = 'complete';
  } else if (input.hasAnyPersistedProfileData || input.profile) {
    hydrationState = 'incomplete';
  }

  return {
    hasCompletedOnboarding,
    hydrationState,
    shouldRouteToOnboarding: !hasCompletedOnboarding,
  };
}

export function shouldRegenerateTargets(updates: Record<string, unknown>): boolean {
  return [
    'weight',
    'height',
    'age',
    'weeklyGoal',
    'macroPreset',
    'customMacros',
    'activityLevel',
    'gender',
    'goalWeight',
  ].some((field) => Object.prototype.hasOwnProperty.call(updates, field));
}

export function deriveTargetsFromProfile(profile: ProfileLike | null | undefined): MacroSet | null {
  if (!profile) {
    return null;
  }

  const existingTdee = Number(profile.tdee);
  let tdee = Number.isFinite(existingTdee) && existingTdee > 0 ? existingTdee : null;

  if (!tdee) {
    const weight = Number(profile.weight);
    const height = Number(profile.height);
    const age = Number(profile.age);
    const weightKg = weight * 0.453592;
    const heightCm = height * 2.54;

    if (
      Number.isFinite(weight) &&
      Number.isFinite(height) &&
      Number.isFinite(age) &&
      weight > 0 &&
      height > 0 &&
      age >= 13
    ) {
      const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
      const bmr = Math.round((profile.gender || 'male') === 'female' ? baseBmr - 161 : baseBmr + 5);
      const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel || 'moderate'] || ACTIVITY_MULTIPLIERS.moderate;
      tdee = Math.round(bmr * multiplier);
    }
  }

  const calorieGoal = clamp(
    Math.round((tdee || 2000) + (WEEKLY_GOAL_ADJUSTMENTS[profile.weeklyGoal || 'maintain'] || 0)),
    1200,
    10000,
  );

  if ((profile.macroPreset || 'balanced') === 'bodyweight') {
    const weight = Number(profile.weight);
    if (Number.isFinite(weight) && weight > 0) {
      const weightKg = weight * 0.453592;
      const protein = Math.round(weightKg * 2);
      const fat = Math.round(weightKg * 0.8);
      const carbs = Math.max(Math.round((calorieGoal - protein * 4 - fat * 9) / 4), 0);
      return { calories: calorieGoal, protein, carbs, fat };
    }
  }

  const preset =
    (profile.macroPreset === 'custom' && profile.customMacros)
      ? {
          protein: Number(profile.customMacros.protein) || 30,
          carbs: Number(profile.customMacros.carbs) || 40,
          fat: Number(profile.customMacros.fat) || 30,
        }
      : MACRO_PRESETS[profile.macroPreset || 'balanced'] || MACRO_PRESETS.balanced;

  return {
    calories: calorieGoal,
    protein: Math.round((calorieGoal * (preset.protein / 100)) / 4),
    carbs: Math.round((calorieGoal * (preset.carbs / 100)) / 4),
    fat: Math.round((calorieGoal * (preset.fat / 100)) / 9),
  };
}
