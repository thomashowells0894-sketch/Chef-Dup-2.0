import type { MacroSet } from '../types';

export const LEGACY_PROFILE_CACHE_KEY = '@fueliq_profile_cache';
export const PROFILE_CACHE_PREFIX = '@fueliq_profile_cache_v2:';
export const LEGACY_MEAL_DAY_CACHE_PREFIX = '@fueliq_meals_';
export const MEAL_DAY_CACHE_PREFIX = '@fueliq_meals_v2:';

export type ProfileHydrationState = 'missing' | 'incomplete' | 'complete';

export interface StoredProfileMeta {
  hasCompletedOnboarding: boolean;
  activationCompletedAt: number | null;
  activeTargets: MacroSet | null;
  pendingTargets: MacroSet | null;
  lastHydratedAt: number | null;
}

export interface StoredProfileCache<TProfile = Record<string, unknown>> {
  version: number;
  profile: TProfile | null;
  weightHistory: Record<string, unknown>[];
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

interface OnboardingStateLike {
  activationState?: unknown;
  activationCompletedAt?: unknown;
  activeTargets?: unknown;
  draftTargets?: unknown;
}

interface ResolvePersistedTargetsInput {
  cachedActiveTargets?: MacroSet | null;
  cachedPendingTargets?: MacroSet | null;
  onboardingData?: OnboardingStateLike | Record<string, unknown> | null;
  hasCompletedOnboarding: boolean;
  derivedTargets?: MacroSet | null;
}

interface ResolvePersistedTargetsResult {
  activeTargets: MacroSet | null;
  pendingTargets: MacroSet | null;
  repairedActiveTargets: boolean;
}

interface BuildOnboardingStatePayloadInput {
  existingData?: Record<string, unknown> | null;
  activeTargets?: MacroSet | null;
  draftTargets?: MacroSet | null;
  onboardingCompleted?: boolean;
}

interface ProfileEditorLike extends ProfileLike {
  name?: string | null;
  weeklyGoal?: string | null;
  macroPreset?: string | null;
}

export interface ProfileEditorDraft {
  name: string;
  weight: string;
  height: string;
  age: string;
  gender: string;
  activityLevel: string;
  weeklyGoal: string;
  macroPreset: string;
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

interface BuildProfileSupabaseUpdatesInput {
  updates: Record<string, unknown>;
  nextWeightHistory: Record<string, unknown>[];
  hasCompletedOnboarding: boolean;
  onboardingCompleted?: boolean;
  onboardingData?: Record<string, unknown> | null;
  updatedAt?: string;
}

interface ManualProfileMeasurementsInput {
  isImperial: boolean;
  weightLbs?: string | number | null;
  heightFeet?: string | number | null;
  heightInches?: string | number | null;
  weightKg?: string | number | null;
  heightCm?: string | number | null;
}

function toRoundedNumber(value: string | number | null | undefined, decimals = 0): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const multiplier = 10 ** decimals;
  return Math.round(parsed * multiplier) / multiplier;
}

export function buildProfileSupabaseUpdates({
  updates,
  nextWeightHistory,
  hasCompletedOnboarding,
  onboardingCompleted = false,
  onboardingData = null,
  updatedAt = new Date().toISOString(),
}: BuildProfileSupabaseUpdatesInput): Record<string, unknown> {
  const supabaseUpdates: Record<string, unknown> = {};

  if (updates.name !== undefined) supabaseUpdates.name = String(updates.name ?? '').trim();
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
  if (updates.dietaryRestrictions !== undefined) {
    supabaseUpdates.dietary_restrictions = updates.dietaryRestrictions;
  }
  if (updates.weight !== undefined) {
    supabaseUpdates.weight_history = nextWeightHistory;
  }

  if (onboardingCompleted || hasCompletedOnboarding) {
    supabaseUpdates.onboarding_completed = true;
  }

  if (onboardingData && Object.keys(onboardingData).length > 0) {
    supabaseUpdates.onboarding_data = onboardingData;
  }

  supabaseUpdates.updated_at = updatedAt;

  return supabaseUpdates;
}

export function normalizeManualProfileMeasurements(
  input: ManualProfileMeasurementsInput
): { weightLbs: number | null; heightInches: number | null } {
  if (input.isImperial) {
    return {
      weightLbs: toRoundedNumber(input.weightLbs, 1),
      heightInches: toRoundedNumber((Number(input.heightFeet) * 12) + Number(input.heightInches || 0), 0),
    };
  }

  const weightKg = toRoundedNumber(input.weightKg, 1);
  const heightCm = toRoundedNumber(input.heightCm, 0);

  return {
    weightLbs: weightKg === null ? null : Math.round(weightKg * 2.20462 * 10) / 10,
    heightInches: heightCm === null ? null : Math.round(heightCm / 2.54),
  };
}

export function normalizeStoredProfileMeasurements<TProfile extends ProfileLike>(
  profile: TProfile | null | undefined
): TProfile | null | undefined {
  if (!profile) {
    return profile;
  }

  const rawHeight = Number(profile.height);
  if (!Number.isFinite(rawHeight) || rawHeight <= 96) {
    return profile;
  }

  const rawWeight = Number(profile.weight);

  return {
    ...profile,
    weight: Number.isFinite(rawWeight) ? Math.round(rawWeight * 2.20462 * 10) / 10 : profile.weight,
    height: Math.round(rawHeight / 2.54),
  };
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

export function hasExplicitActivationMarker(onboardingData: unknown): boolean {
  if (!onboardingData || typeof onboardingData !== 'object') {
    return false;
  }

  const typedData = onboardingData as OnboardingStateLike;
  return (
    typedData.activationState === 'complete' ||
    Number.isFinite(Number(typedData.activationCompletedAt)) ||
    Boolean(sanitizeMacroSet(typedData.activeTargets))
  );
}

export function createStoredProfileMeta(meta?: Partial<StoredProfileMeta> | null): StoredProfileMeta {
  return {
    hasCompletedOnboarding: Boolean(meta?.hasCompletedOnboarding),
    activationCompletedAt: Number(meta?.activationCompletedAt) || null,
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
    Boolean(input.serverActivation);

  let hydrationState: ProfileHydrationState = 'missing';
  if (essentialsComplete) {
    hydrationState = 'complete';
  } else if (input.hasAnyPersistedProfileData || input.profile) {
    hydrationState = 'incomplete';
  }

  return {
    hasCompletedOnboarding,
    hydrationState,
    shouldRouteToOnboarding: !hasCompletedOnboarding && hydrationState !== 'complete',
  };
}

export function shouldTrustHydratedProfileSnapshot(
  result: ResolveProfileHydrationResult
): boolean {
  return result.hasCompletedOnboarding || result.hydrationState === 'complete';
}

export function resolvePersistedTargets({
  cachedActiveTargets = null,
  cachedPendingTargets = null,
  onboardingData = null,
  hasCompletedOnboarding,
  derivedTargets = null,
}: ResolvePersistedTargetsInput): ResolvePersistedTargetsResult {
  const onboardingState = (onboardingData && typeof onboardingData === 'object')
    ? onboardingData as OnboardingStateLike
    : null;
  const activeFromOnboarding = sanitizeMacroSet(onboardingState?.activeTargets);
  const draftFromOnboarding = sanitizeMacroSet(onboardingState?.draftTargets);

  let activeTargets = hasCompletedOnboarding
    ? activeFromOnboarding || cachedActiveTargets || null
    : null;
  let pendingTargets = draftFromOnboarding || cachedPendingTargets || null;
  let repairedActiveTargets = false;

  if (hasCompletedOnboarding && !activeTargets && derivedTargets) {
    activeTargets = derivedTargets;
    repairedActiveTargets = true;
  }

  if (
    activeTargets &&
    pendingTargets &&
    JSON.stringify(activeTargets) === JSON.stringify(pendingTargets)
  ) {
    pendingTargets = null;
  }

  return {
    activeTargets,
    pendingTargets,
    repairedActiveTargets,
  };
}

export function buildOnboardingStatePayload({
  existingData = null,
  activeTargets = null,
  draftTargets = null,
  onboardingCompleted = false,
}: BuildOnboardingStatePayloadInput): Record<string, unknown> {
  const nextState: Record<string, unknown> = {
    ...(existingData || {}),
  };

  if (activeTargets) {
    nextState.activeTargets = activeTargets;
  } else {
    delete nextState.activeTargets;
  }

  if (draftTargets) {
    nextState.draftTargets = draftTargets;
  } else {
    delete nextState.draftTargets;
  }

  if (onboardingCompleted || hasExplicitActivationMarker(nextState)) {
    nextState.activationState = 'complete';
    if (!Number.isFinite(Number(nextState.activationCompletedAt))) {
      nextState.activationCompletedAt = Date.now();
    }
  }

  return nextState;
}

export function buildProfileEditorDraft(profile: ProfileEditorLike | null | undefined): ProfileEditorDraft {
  return {
    name: profile?.name || '',
    weight: profile?.weight ? String(profile.weight) : '',
    height: profile?.height ? String(profile.height) : '',
    age: profile?.age ? String(profile.age) : '',
    gender: profile?.gender || 'male',
    activityLevel: profile?.activityLevel || 'moderate',
    weeklyGoal: profile?.weeklyGoal || 'maintain',
    macroPreset: profile?.macroPreset || 'balanced',
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
