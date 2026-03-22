import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileProvider, useProfile } from '../../context/ProfileContext';
import { buildProfileCacheKey } from '../../lib/profileState';
import { supabase } from '../../lib/supabase';

const mockUseAuth = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

type ProfileRow = {
  name: string | null;
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
  goal_weight: number | null;
  weekly_goal: string | null;
  macro_preset: string | null;
  custom_macros: { protein: number; carbs: number; fat: number } | null;
  weight_unit: string | null;
  injuries: string | null;
  equipment: string[] | null;
  dietary_restrictions: string[] | null;
  weight_history: { date: string; weight: number }[] | null;
  onboarding_completed: boolean;
  onboarding_data: Record<string, unknown> | null;
};

const baseProfileRow: ProfileRow = {
  name: 'Alex',
  weight: 180,
  height: 71,
  age: 31,
  gender: 'male',
  activity_level: 'moderate',
  goal_weight: null,
  weekly_goal: 'maintain',
  macro_preset: 'balanced',
  custom_macros: { protein: 30, carbs: 40, fat: 30 },
  weight_unit: 'lbs',
  injuries: '',
  equipment: [],
  dietary_restrictions: [],
  weight_history: [{ date: '2026-03-20', weight: 180 }],
  onboarding_completed: true,
  onboarding_data: {
    activationState: 'complete',
    activationCompletedAt: 1710000000000,
    activeTargets: { calories: 2200, protein: 180, carbs: 210, fat: 65 },
  },
};

function queueProfileResponses(rows: (ProfileRow | null)[]) {
  const singleQueue = [...rows];
  const updateCalls: Record<string, unknown>[] = [];
  const insertCalls: Record<string, unknown>[] = [];

  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table !== 'profiles') {
      throw new Error(`Unexpected table: ${table}`);
    }

    let mode: 'select' | 'update' | 'insert' = 'select';
    const chain: any = {
      select: jest.fn(() => {
        if (mode === 'update') {
          return Promise.resolve({ data: [{}], error: null });
        }
        if (mode === 'insert') {
          return Promise.resolve({ data: [{}], error: null });
        }
        return chain;
      }),
      insert: jest.fn((payload: Record<string, unknown>) => {
        insertCalls.push(payload);
        mode = 'insert';
        return chain;
      }),
      update: jest.fn((payload: Record<string, unknown>) => {
        updateCalls.push(payload);
        mode = 'update';
        return chain;
      }),
      eq: jest.fn(() => chain),
      single: jest.fn(() => {
        const next = singleQueue.length > 0 ? singleQueue.shift() : null;
        return Promise.resolve({ data: next, error: null });
      }),
    };

    return chain;
  });

  return {
    updateCalls,
    insertCalls,
  };
}

describe('ProfileContext trust flows', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProfileProvider>{children}</ProfileProvider>
  );
  const storage = new Map<string, string>();

  beforeEach(() => {
    jest.clearAllMocks();
    storage.clear();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage.get(key) ?? null);
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      storage.set(key, value);
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      storage.delete(key);
    });
  });

  it('keeps activated users stable when hydration receives a partial server row', async () => {
    const cacheKey = buildProfileCacheKey('user-1');
    storage.set(cacheKey, JSON.stringify({
      version: 2,
      profile: {
        name: 'Alex',
        weight: 180,
        height: 71,
        age: 31,
        gender: 'male',
        activityLevel: 'moderate',
        weeklyGoal: 'maintain',
        macroPreset: 'balanced',
        customMacros: { protein: 30, carbs: 40, fat: 30 },
        weightUnit: 'lbs',
        injuries: '',
        equipment: [],
        dietaryRestrictions: [],
      },
      weightHistory: [{ date: '2026-03-20', weight: 180 }],
      meta: {
        hasCompletedOnboarding: true,
        activationCompletedAt: 1710000000000,
        activeTargets: { calories: 2200, protein: 180, carbs: 210, fat: 65 },
        pendingTargets: null,
        lastHydratedAt: 1710000000000,
      },
    }));

    queueProfileResponses([{
      ...baseProfileRow,
      name: null,
      weight: null,
      height: null,
      age: null,
      gender: null,
      activity_level: null,
      weekly_goal: null,
      macro_preset: null,
      custom_macros: null,
      weight_unit: null,
      injuries: null,
      equipment: null,
      dietary_restrictions: null,
      weight_history: null,
      onboarding_completed: false,
      onboarding_data: null,
    }]);

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasCompletedOnboarding).toBe(true);
    expect(result.current.profileHydrationState).toBe('complete');
    expect(result.current.profile.weight).toBe(180);
    expect(result.current.profile.height).toBe(71);
    expect(result.current.profile.age).toBe(31);
    expect(result.current.calculatedGoals).toEqual({
      calories: 2200,
      protein: 180,
      carbs: 210,
      fat: 65,
    });
    expect(result.current.pendingTargets).toBeNull();
  });

  it('keeps active targets stable and preserves draft targets across refreshes', async () => {
    const { updateCalls } = queueProfileResponses([
      baseProfileRow,
      {
        ...baseProfileRow,
        name: null,
        weight: null,
        height: null,
        age: null,
        gender: null,
        activity_level: null,
        weekly_goal: null,
        macro_preset: null,
        custom_macros: null,
        weight_unit: null,
        injuries: null,
        equipment: null,
        dietary_restrictions: null,
        weight_history: null,
        onboarding_completed: false,
        onboarding_data: null,
      },
    ]);

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
      expect(result.current.calculatedGoals.calories).toBe(2200);
    });

    const originalGoals = result.current.calculatedGoals;

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateProfile({ weight: 190 });
    });

    expect(updateResult).toMatchObject({ targetAction: 'pending' });
    expect(result.current.profile.weight).toBe(190);
    expect(result.current.calculatedGoals).toEqual(originalGoals);
    expect(result.current.pendingTargets).not.toBeNull();
    expect(result.current.pendingTargets).not.toEqual(originalGoals);

    await act(async () => {
      await result.current.fetchProfile();
    });

    expect(result.current.hasCompletedOnboarding).toBe(true);
    expect(result.current.profile.weight).toBe(190);
    expect(result.current.calculatedGoals).toEqual(originalGoals);
    expect(result.current.pendingTargets).not.toBeNull();
    const explicitSaveCall = updateCalls.find((payload) => payload.weight === 190);
    expect(explicitSaveCall).toBeDefined();
    expect(explicitSaveCall).toMatchObject({
      weight: 190,
      onboarding_completed: true,
    });
    expect(explicitSaveCall?.onboarding_data).toMatchObject({
      activationState: 'complete',
      activeTargets: originalGoals,
    });
  });
});
