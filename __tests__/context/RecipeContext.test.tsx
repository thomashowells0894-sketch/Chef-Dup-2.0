import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { RecipeProvider, useRecipes } from '../../context/RecipeContext';

jest.setTimeout(20000);

const mockCheckOnline = jest.fn(async () => true);
const mockShowOfflineAlert = jest.fn();
const mockFoodLogsResponse = jest.fn();
let consoleErrorSpy: jest.SpyInstance;
const mockUser = { id: 'user-1' };

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

jest.mock('../../context/OfflineContext', () => ({
  useOffline: () => ({
    checkOnline: (...args: any[]) => mockCheckOnline(...args),
    showOfflineAlert: (...args: any[]) => mockShowOfflineAlert(...args),
  }),
}));

jest.mock('../../lib/haptics', () => ({
  hapticSuccess: jest.fn(async () => undefined),
  hapticLight: jest.fn(async () => undefined),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'food_logs') {
        throw new Error(`Unexpected table: ${table}`);
      }

      const builder: any = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        neq: jest.fn(() => builder),
        order: jest.fn(() => builder),
        limit: jest.fn(() => Promise.resolve(mockFoodLogsResponse())),
      };

      return builder;
    },
  },
}));

describe('RecipeContext recent food resilience', () => {
  const storage = new Map<string, string>();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RecipeProvider>{children}</RecipeProvider>
  );

  async function flushState() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    storage.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage.get(key) ?? null);
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      storage.set(key, value);
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      storage.delete(key);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('keeps cached recent foods visible when refresh fails', async () => {
    storage.set('@fueliq_recent_foods:user-1', JSON.stringify([
      {
        id: 'recent-1',
        name: 'Greek Yogurt',
        calories: 150,
        protein: 15,
        carbs: 10,
        fat: 4,
        serving: '170 g',
        servingSize: 170,
        servingUnit: 'g',
        isRecent: true,
      },
    ]));
    mockFoodLogsResponse.mockReturnValue({
      data: null,
      error: { message: 'timeout' },
    });

    const { result } = renderHook(() => useRecipes(), { wrapper });

    await flushState();

    expect(result.current.recentFoods).toHaveLength(1);

    await act(async () => {
      await result.current.fetchRecentFoods();
    });

    expect(result.current.recentFoods).toHaveLength(1);
    expect(result.current.recentFoods[0].name).toBe('Greek Yogurt');
    expect(result.current.recentFoodsError).toBe('Showing saved recent foods until connection improves.');
  });

  it('clears the fallback error after a successful refresh', async () => {
    mockFoodLogsResponse
      .mockReturnValueOnce({
        data: null,
        error: { message: 'timeout' },
      })
      .mockReturnValueOnce({
        data: [
          {
            name: 'Banana',
            calories: 105,
            protein: 1,
            carbs: 27,
            fat: 0,
            serving: '1 banana',
            serving_size: 1,
            serving_unit: 'banana',
            created_at: '2026-03-21T09:00:00.000Z',
          },
        ],
        error: null,
      });

    const { result } = renderHook(() => useRecipes(), { wrapper });

    await flushState();

    await act(async () => {
      await result.current.fetchRecentFoods();
    });

    expect(result.current.recentFoodsError).toBe('Showing saved recent foods until connection improves.');

    await act(async () => {
      await result.current.fetchRecentFoods();
    });

    expect(result.current.recentFoodsError).toBeNull();
    expect(result.current.recentFoods).toHaveLength(1);
    expect(result.current.recentFoods[0]).toMatchObject({
      name: 'Banana',
      calories: 105,
      serving: '1 banana',
    });
    expect(storage.get('@fueliq_recent_foods:user-1')).toContain('Banana');
  });
});
