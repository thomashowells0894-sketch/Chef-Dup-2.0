import {
  buildOnboardingStatePayload,
  buildProfileSupabaseUpdates,
  buildProfileEditorDraft,
  buildMealCacheKey,
  buildProfileCacheKey,
  hasExplicitActivationMarker,
  normalizeManualProfileMeasurements,
  normalizeStoredProfileMeasurements,
  resolveProfileHydration,
  resolvePersistedTargets,
  shouldTrustHydratedProfileSnapshot,
  shouldRegenerateTargets,
  sanitizeMacroSet,
} from '../../lib/profileState';

describe('profileState', () => {
  it('keeps activated users out of onboarding when the server returns partial profile data', () => {
    const result = resolveProfileHydration({
      cachedActivation: true,
      serverActivation: false,
      profile: {
        weight: null,
        height: null,
        age: null,
      },
      hasAnyPersistedProfileData: true,
    });

    expect(result.hasCompletedOnboarding).toBe(true);
    expect(result.hydrationState).toBe('incomplete');
    expect(result.shouldRouteToOnboarding).toBe(false);
  });

  it('routes brand-new users to onboarding when no activation or essentials exist', () => {
    const result = resolveProfileHydration({
      cachedActivation: false,
      serverActivation: false,
      profile: null,
      hasAnyPersistedProfileData: false,
    });

    expect(result.hasCompletedOnboarding).toBe(false);
    expect(result.hydrationState).toBe('missing');
    expect(result.shouldRouteToOnboarding).toBe(true);
  });

  it('does not infer onboarding completion from mutable profile fields alone', () => {
    const result = resolveProfileHydration({
      cachedActivation: false,
      serverActivation: false,
      profile: {
        weight: 182,
        height: 71,
        age: 31,
      },
      hasAnyPersistedProfileData: true,
    });

    expect(result.hasCompletedOnboarding).toBe(false);
    expect(result.hydrationState).toBe('complete');
    expect(result.shouldRouteToOnboarding).toBe(false);
  });

  it('treats body-profile edits as target-affecting changes', () => {
    expect(shouldRegenerateTargets({ weight: 190 })).toBe(true);
    expect(shouldRegenerateTargets({ height: 72 })).toBe(true);
    expect(shouldRegenerateTargets({ age: 31 })).toBe(true);
    expect(shouldRegenerateTargets({ name: 'Thomas' })).toBe(false);
  });

  it('sanitizes persisted active targets before re-use', () => {
    expect(
      sanitizeMacroSet({
        calories: 2401.2,
        protein: 210.4,
        carbs: 190.8,
        fat: 74.1,
      })
    ).toEqual({
      calories: 2401,
      protein: 210,
      carbs: 191,
      fat: 74,
    });

    expect(sanitizeMacroSet({ calories: 0, protein: 20, carbs: 20, fat: 10 })).toBeNull();
  });

  it('scopes cache keys per user', () => {
    expect(buildProfileCacheKey('user-1')).toBe('@fueliq_profile_cache_v2:user-1');
    expect(buildMealCacheKey('user-1', '2026-03-21')).toBe('@fueliq_meals_v2:user-1:2026-03-21');
    expect(buildMealCacheKey(null, '2026-03-21')).toBe('@fueliq_meals_v2:anonymous:2026-03-21');
  });

  it('includes name when building profile row updates', () => {
    expect(
      buildProfileSupabaseUpdates({
        updates: {
          name: '  Thomas  ',
          activityLevel: 'active',
          weeklyGoal: 'lose1',
        },
        nextWeightHistory: [],
        hasCompletedOnboarding: false,
      })
    ).toMatchObject({
      name: 'Thomas',
      activity_level: 'active',
      weekly_goal: 'lose1',
    });
  });

  it('converts manual profile imperial values to canonical storage units', () => {
    expect(
      normalizeManualProfileMeasurements({
        isImperial: true,
        weightLbs: '182.4',
        heightFeet: '5',
        heightInches: '11',
      })
    ).toEqual({
      weightLbs: 182.4,
      heightInches: 71,
    });
  });

  it('converts manual profile metric values back to canonical storage units', () => {
    expect(
      normalizeManualProfileMeasurements({
        isImperial: false,
        weightKg: '82.5',
        heightCm: '180',
      })
    ).toEqual({
      weightLbs: 181.9,
      heightInches: 71,
    });
  });

  it('normalizes legacy metric body stats from stored profiles', () => {
    expect(
      normalizeStoredProfileMeasurements({
        weight: 82.5,
        height: 180,
        age: 31,
      })
    ).toEqual({
      weight: 181.9,
      height: 71,
      age: 31,
    });
  });

  it('trusts activated cached snapshots but not incomplete unactivated ones', () => {
    expect(
      shouldTrustHydratedProfileSnapshot({
        hasCompletedOnboarding: true,
        hydrationState: 'incomplete',
        shouldRouteToOnboarding: false,
      })
    ).toBe(true);

    expect(
      shouldTrustHydratedProfileSnapshot({
        hasCompletedOnboarding: false,
        hydrationState: 'incomplete',
        shouldRouteToOnboarding: true,
      })
    ).toBe(false);
  });

  it('keeps active and draft targets separate when resolving persisted targets', () => {
    expect(
      resolvePersistedTargets({
        cachedActiveTargets: { calories: 2200, protein: 180, carbs: 210, fat: 65 },
        cachedPendingTargets: { calories: 2400, protein: 190, carbs: 240, fat: 70 },
        onboardingData: {
          draftTargets: { calories: 2350, protein: 188, carbs: 230, fat: 68 },
        },
        hasCompletedOnboarding: true,
        derivedTargets: { calories: 2500, protein: 200, carbs: 250, fat: 75 },
      })
    ).toEqual({
      activeTargets: { calories: 2200, protein: 180, carbs: 210, fat: 65 },
      pendingTargets: { calories: 2350, protein: 188, carbs: 230, fat: 68 },
      repairedActiveTargets: false,
    });
  });

  it('repairs missing active targets only for activated users', () => {
    expect(
      resolvePersistedTargets({
        cachedActiveTargets: null,
        cachedPendingTargets: { calories: 2100, protein: 170, carbs: 205, fat: 60 },
        onboardingData: null,
        hasCompletedOnboarding: true,
        derivedTargets: { calories: 2250, protein: 180, carbs: 220, fat: 62 },
      })
    ).toEqual({
      activeTargets: { calories: 2250, protein: 180, carbs: 220, fat: 62 },
      pendingTargets: { calories: 2100, protein: 170, carbs: 205, fat: 60 },
      repairedActiveTargets: true,
    });

    expect(
      resolvePersistedTargets({
        cachedActiveTargets: null,
        cachedPendingTargets: { calories: 2100, protein: 170, carbs: 205, fat: 60 },
        onboardingData: null,
        hasCompletedOnboarding: false,
        derivedTargets: { calories: 2250, protein: 180, carbs: 220, fat: 62 },
      })
    ).toEqual({
      activeTargets: null,
      pendingTargets: { calories: 2100, protein: 170, carbs: 205, fat: 60 },
      repairedActiveTargets: false,
    });
  });

  it('builds onboarding payloads with explicit activation markers and separate draft targets', () => {
    const payload = buildOnboardingStatePayload({
      existingData: { setupVersion: 2 },
      activeTargets: { calories: 2200, protein: 180, carbs: 210, fat: 65 },
      draftTargets: { calories: 2400, protein: 190, carbs: 240, fat: 70 },
      onboardingCompleted: true,
    });

    expect(payload).toMatchObject({
      setupVersion: 2,
      activationState: 'complete',
      activeTargets: { calories: 2200, protein: 180, carbs: 210, fat: 65 },
      draftTargets: { calories: 2400, protein: 190, carbs: 240, fat: 70 },
    });
    expect(hasExplicitActivationMarker(payload)).toBe(true);

    const clearedDraftPayload = buildOnboardingStatePayload({
      existingData: payload,
      activeTargets: { calories: 2200, protein: 180, carbs: 210, fat: 65 },
      draftTargets: null,
      onboardingCompleted: false,
    });

    expect(clearedDraftPayload.activationState).toBe('complete');
    expect(clearedDraftPayload.draftTargets).toBeUndefined();
  });

  it('creates stable profile editor drafts from nullable profile values', () => {
    expect(
      buildProfileEditorDraft({
        name: null,
        weight: null,
        height: 71,
        age: 31,
        gender: '',
        activityLevel: '',
        weeklyGoal: null,
        macroPreset: null,
      })
    ).toEqual({
      name: '',
      weight: '',
      height: '71',
      age: '31',
      gender: 'male',
      activityLevel: 'moderate',
      weeklyGoal: 'maintain',
      macroPreset: 'balanced',
    });
  });
});
