import {
  buildMealCacheKey,
  buildProfileCacheKey,
  resolveProfileHydration,
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
});
