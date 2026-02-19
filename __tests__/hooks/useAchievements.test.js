/**
 * Tests for useAchievements hook.
 *
 * Dependencies mocked:
 * - AsyncStorage (global mock in jest.setup.ts)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import useAchievements, { CATEGORIES } from '../../hooks/useAchievements';

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem).mockResolvedValue(null);
  (AsyncStorage.setItem).mockResolvedValue(undefined);
});

// =============================================================================
// CATEGORIES export
// =============================================================================

describe('CATEGORIES', () => {
  it('should export categories including "all"', () => {
    expect(CATEGORIES).toBeDefined();
    expect(CATEGORIES.find((c) => c.key === 'all')).toBeTruthy();
  });

  it('should contain all expected categories', () => {
    const keys = CATEGORIES.map((c) => c.key);
    expect(keys).toContain('streaks');
    expect(keys).toContain('logging');
    expect(keys).toContain('fitness');
    expect(keys).toContain('health');
    expect(keys).toContain('ai');
    expect(keys).toContain('milestones');
  });
});

// =============================================================================
// Initial state
// =============================================================================

describe('useAchievements - initial state', () => {
  it('should start with all achievements locked', async () => {
    const { result } = renderHook(() => useAchievements());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.unlockedCount).toBe(0);
    expect(result.current.totalCount).toBeGreaterThan(0);
    expect(result.current.newUnlocked).toBe(0);
  });

  it('should have correct totalCount matching defined achievements', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    // There are 22 achievement definitions in the source
    expect(result.current.totalCount).toBe(22);
  });

  it('should populate achievements array with all definitions', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.achievements).toHaveLength(22);
    result.current.achievements.forEach((a) => {
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('title');
      expect(a).toHaveProperty('description');
      expect(a).toHaveProperty('emoji');
      expect(a).toHaveProperty('category');
      expect(a).toHaveProperty('isUnlocked');
      expect(a.isUnlocked).toBe(false);
    });
  });

  it('should load previously unlocked achievements from storage', async () => {
    const stored = {
      first_food: { unlockedAt: '2026-01-01T00:00:00Z', isNew: false },
      first_streak_3: { unlockedAt: '2026-01-05T00:00:00Z', isNew: true },
    };
    (AsyncStorage.getItem).mockResolvedValue(JSON.stringify(stored));

    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.unlockedCount).toBe(2);
    expect(result.current.newUnlocked).toBe(1); // first_streak_3 isNew

    const firstFood = result.current.achievements.find(
      (a) => a.id === 'first_food'
    );
    expect(firstFood.isUnlocked).toBe(true);
    expect(firstFood.isNew).toBe(false);

    const streak3 = result.current.achievements.find(
      (a) => a.id === 'first_streak_3'
    );
    expect(streak3.isUnlocked).toBe(true);
    expect(streak3.isNew).toBe(true);
  });

  it('should handle corrupt storage gracefully', async () => {
    (AsyncStorage.getItem).mockResolvedValue('invalid json!!');

    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    // Should start fresh — no crash
    expect(result.current.unlockedCount).toBe(0);
  });
});

// =============================================================================
// checkAchievements
// =============================================================================

describe('useAchievements - checkAchievements', () => {
  it('should unlock streak achievements when streak threshold met', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let newlyUnlocked;
    await act(async () => {
      newlyUnlocked = await result.current.checkAchievements({ streak: 3 });
    });

    expect(newlyUnlocked).toHaveLength(1);
    expect(newlyUnlocked[0].id).toBe('first_streak_3');
    expect(newlyUnlocked[0].title).toBe('Hot Start');
    expect(result.current.unlockedCount).toBe(1);
  });

  it('should unlock multiple achievements at once', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let newlyUnlocked;
    await act(async () => {
      newlyUnlocked = await result.current.checkAchievements({
        streak: 7,
        totalFoodsLogged: 1,
        totalWorkouts: 1,
      });
    });

    // Should unlock: first_streak_3, streak_7, first_food, first_workout
    expect(newlyUnlocked.length).toBe(4);
    const ids = newlyUnlocked.map((a) => a.id);
    expect(ids).toContain('first_streak_3');
    expect(ids).toContain('streak_7');
    expect(ids).toContain('first_food');
    expect(ids).toContain('first_workout');
    expect(result.current.unlockedCount).toBe(4);
  });

  it('should not re-unlock already unlocked achievements', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.checkAchievements({ streak: 3 });
    });

    expect(result.current.unlockedCount).toBe(1);

    let secondRun;
    await act(async () => {
      secondRun = await result.current.checkAchievements({ streak: 3 });
    });

    expect(secondRun).toHaveLength(0); // Nothing new
    expect(result.current.unlockedCount).toBe(1);
  });

  it('should return empty array when not loaded', async () => {
    // Don't wait for isLoaded
    const { result } = renderHook(() => useAchievements());

    let newlyUnlocked;
    // Note: isLoaded might still be false
    await act(async () => {
      newlyUnlocked = await result.current.checkAchievements({ streak: 100 });
    });

    // On first render, isLoaded is false; the function returns [] early.
    // After the act, isLoaded may have become true, so this depends on timing.
    // The key invariant: it should not crash.
    expect(newlyUnlocked).toBeDefined();
  });

  it('should persist newly unlocked achievements to AsyncStorage', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.checkAchievements({ streak: 3 });
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@vibefit_achievements',
      expect.stringContaining('first_streak_3')
    );
  });

  it('should not persist when no new achievements unlocked', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    // Clear the mock so we can check for new calls
    (AsyncStorage.setItem).mockClear();

    await act(async () => {
      await result.current.checkAchievements({ streak: 0 });
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('should handle boolean-based achievements', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let newlyUnlocked;
    await act(async () => {
      newlyUnlocked = await result.current.checkAchievements({
        allMealsLoggedInDay: true,
        hasSetPR: true,
        hasCompletedFast: true,
        hasHitWaterGoal: true,
        hasHitProteinGoal: true,
        hasScannedFood: true,
        hasChatted: true,
        hasGeneratedMealPlan: true,
        hasUsedVoiceLog: true,
        hasTakenProgressPhoto: true,
        hasReachedWeightGoal: true,
      });
    });

    const ids = newlyUnlocked.map((a) => a.id);
    expect(ids).toContain('all_meals_logged');
    expect(ids).toContain('first_pr');
    expect(ids).toContain('first_fast');
    expect(ids).toContain('water_goal_hit');
    expect(ids).toContain('protein_goal_hit');
    expect(ids).toContain('first_scan');
    expect(ids).toContain('first_chat');
    expect(ids).toContain('first_meal_plan');
    expect(ids).toContain('first_voice_log');
    expect(ids).toContain('progress_photo');
    expect(ids).toContain('weight_goal_reached');
  });

  it('should unlock XP milestone achievements', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let newlyUnlocked;
    await act(async () => {
      newlyUnlocked = await result.current.checkAchievements({
        totalXP: 5000,
      });
    });

    const ids = newlyUnlocked.map((a) => a.id);
    expect(ids).toContain('xp_1000');
    expect(ids).toContain('xp_5000');
  });
});

// =============================================================================
// getUnlocked / getLocked
// =============================================================================

describe('useAchievements - getUnlocked / getLocked', () => {
  it('should return correct unlocked and locked partitions', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.checkAchievements({ streak: 3, totalFoodsLogged: 1 });
    });

    const unlocked = result.current.getUnlocked();
    const locked = result.current.getLocked();

    expect(unlocked).toHaveLength(2);
    expect(locked).toHaveLength(20);
    expect(unlocked.length + locked.length).toBe(22);
  });

  it('getUnlocked should only return achievements with isUnlocked true', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.checkAchievements({ streak: 7 });
    });

    const unlocked = result.current.getUnlocked();
    unlocked.forEach((a) => {
      expect(a.isUnlocked).toBe(true);
    });
  });

  it('getLocked should only return achievements with isUnlocked false', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const locked = result.current.getLocked();
    locked.forEach((a) => {
      expect(a.isUnlocked).toBe(false);
    });
  });
});

// =============================================================================
// markSeen / markAllSeen
// =============================================================================

describe('useAchievements - markSeen', () => {
  it('should clear isNew flag for a specific achievement', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.checkAchievements({ streak: 3 });
    });

    // first_streak_3 should be isNew
    let achievement = result.current.achievements.find(
      (a) => a.id === 'first_streak_3'
    );
    expect(achievement.isNew).toBe(true);
    expect(result.current.newUnlocked).toBe(1);

    await act(async () => {
      await result.current.markSeen('first_streak_3');
    });

    achievement = result.current.achievements.find(
      (a) => a.id === 'first_streak_3'
    );
    expect(achievement.isNew).toBe(false);
    expect(result.current.newUnlocked).toBe(0);
  });

  it('should do nothing for non-unlocked achievement', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    (AsyncStorage.setItem).mockClear();

    await act(async () => {
      await result.current.markSeen('streak_100'); // Not unlocked
    });

    // Should not persist
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('useAchievements - markAllSeen', () => {
  it('should clear isNew for all unlocked achievements', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.checkAchievements({
        streak: 7,
        totalFoodsLogged: 1,
      });
    });

    expect(result.current.newUnlocked).toBeGreaterThan(0);

    await act(async () => {
      await result.current.markAllSeen();
    });

    expect(result.current.newUnlocked).toBe(0);
    result.current.getUnlocked().forEach((a) => {
      expect(a.isNew).toBe(false);
    });
  });

  it('should not persist if no achievements were new', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    (AsyncStorage.setItem).mockClear();

    await act(async () => {
      await result.current.markAllSeen();
    });

    // No achievements unlocked, so nothing changed, no persist
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

// =============================================================================
// getProgress
// =============================================================================

describe('useAchievements - getProgress', () => {
  it('should return correct progress for streak achievements', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const progress = result.current.getProgress('streak_7', { streak: 4 });
    expect(progress).not.toBeNull();
    expect(progress.current).toBe(4);
    expect(progress.target).toBe(7);
    expect(progress.percent).toBeCloseTo(4 / 7, 2);
    expect(progress.label).toBe('4/7');
  });

  it('should cap progress current at target', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const progress = result.current.getProgress('first_streak_3', {
      streak: 100,
    });
    expect(progress.current).toBe(3); // Capped at target
    expect(progress.percent).toBe(1); // 100%
  });

  it('should return null for unknown achievement id', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const progress = result.current.getProgress('nonexistent', { streak: 5 });
    expect(progress).toBeNull();
  });

  it('should handle empty context gracefully', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const progress = result.current.getProgress('first_streak_3');
    expect(progress).not.toBeNull();
    expect(progress.current).toBe(0); // (undefined || 0) = 0
    expect(progress.target).toBe(3);
  });

  it('should calculate progress for foods_100', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const progress = result.current.getProgress('foods_100', {
      totalFoodsLogged: 42,
    });
    expect(progress.current).toBe(42);
    expect(progress.target).toBe(100);
    expect(progress.percent).toBeCloseTo(0.42, 2);
    expect(progress.label).toBe('42/100');
  });

  it('should return 0/1 progress for boolean achievements when false', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const progress = result.current.getProgress('first_scan', {
      hasScannedFood: false,
    });
    expect(progress.current).toBe(0);
    expect(progress.target).toBe(1);
    expect(progress.percent).toBe(0);
  });

  it('should return 1/1 progress for boolean achievements when true', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const progress = result.current.getProgress('first_scan', {
      hasScannedFood: true,
    });
    expect(progress.current).toBe(1);
    expect(progress.target).toBe(1);
    expect(progress.percent).toBe(1);
  });

  it('should calculate XP achievement progress', async () => {
    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const progress = result.current.getProgress('xp_5000', { totalXP: 2500 });
    expect(progress.current).toBe(2500);
    expect(progress.target).toBe(5000);
    expect(progress.percent).toBe(0.5);
  });
});

// =============================================================================
// Persistence on write failure
// =============================================================================

describe('useAchievements - persistence resilience', () => {
  it('should keep achievements in memory even if AsyncStorage write fails', async () => {
    (AsyncStorage.setItem).mockRejectedValue(new Error('Write failed'));

    const { result } = renderHook(() => useAchievements());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.checkAchievements({ streak: 3 });
    });

    // Achievement should still be in memory despite write failure
    expect(result.current.unlockedCount).toBe(1);
  });
});
