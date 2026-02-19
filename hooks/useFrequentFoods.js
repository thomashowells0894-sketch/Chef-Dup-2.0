import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vibefit_frequent_foods';
const MAX_ITEMS = 100;

/**
 * useFrequentFoods - Tracks frequently and recently logged foods.
 *
 * Food shape stored:
 * { id, name, emoji, calories, protein, carbs, fat, serving, servingUnit, count, lastUsed }
 */
export function useFrequentFoods() {
  const [frequentFoods, setFrequentFoods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const isLoaded = useRef(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setFrequentFoods(parsed);
          }
        }
      } catch {
        // Silently fail - start with empty list
      }
      isLoaded.current = true;
      setIsLoading(false);
    })();
  }, []);

  // Auto-persist whenever frequentFoods changes (skip the initial empty state)
  useEffect(() => {
    if (!isLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(frequentFoods)).catch(() => {});
  }, [frequentFoods]);

  /**
   * recordFood - Called when any food is logged.
   * If the food already exists (matched by name, case-insensitive),
   * increment its count and update lastUsed. Otherwise, add it new.
   */
  const recordFood = useCallback((food) => {
    if (!food || !food.name) return;

    setFrequentFoods((prev) => {
      const normalizedName = food.name.toLowerCase().trim();
      const existingIndex = prev.findIndex(
        (f) => f.name.toLowerCase().trim() === normalizedName
      );

      let updated;

      if (existingIndex >= 0) {
        // Food already tracked - increment count and update lastUsed + nutritional data
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          count: (updated[existingIndex].count || 1) + 1,
          lastUsed: new Date().toISOString(),
          calories: food.calories ?? updated[existingIndex].calories,
          protein: food.protein ?? updated[existingIndex].protein,
          carbs: food.carbs ?? updated[existingIndex].carbs,
          fat: food.fat ?? updated[existingIndex].fat,
          emoji: food.emoji || updated[existingIndex].emoji,
          serving: food.serving || updated[existingIndex].serving,
          servingUnit: food.servingUnit || updated[existingIndex].servingUnit,
        };
      } else {
        // New food - add to list
        const newEntry = {
          id: food.id || `freq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: food.name,
          emoji: food.emoji || food.name?.charAt(0) || '?',
          calories: food.calories || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
          serving: food.serving || '1 serving',
          servingUnit: food.servingUnit || 'serving',
          count: 1,
          lastUsed: new Date().toISOString(),
        };
        updated = [newEntry, ...prev];
      }

      // Enforce max limit - keep top items by count, then recency
      if (updated.length > MAX_ITEMS) {
        updated.sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return new Date(b.lastUsed) - new Date(a.lastUsed);
        });
        updated = updated.slice(0, MAX_ITEMS);
      }

      return updated;
    });
  }, []);

  /**
   * getTopFoods - Returns top N foods sorted by count (descending).
   */
  const getTopFoods = useCallback(
    (limit = 10) => {
      return [...frequentFoods]
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return new Date(b.lastUsed) - new Date(a.lastUsed);
        })
        .slice(0, limit);
    },
    [frequentFoods]
  );

  /**
   * getRecentFoods - Returns most recent N foods sorted by lastUsed (descending).
   */
  const getRecentFoods = useCallback(
    (limit = 10) => {
      return [...frequentFoods]
        .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
        .slice(0, limit);
    },
    [frequentFoods]
  );

  /**
   * removeFood - Remove a food from the frequent list by id.
   */
  const removeFood = useCallback((id) => {
    setFrequentFoods((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /**
   * clearAll - Reset the frequent foods list.
   */
  const clearAll = useCallback(() => {
    setFrequentFoods([]);
  }, []);

  // Backward-compatible aliases
  const trackFood = recordFood;
  const foods = frequentFoods;
  const pinnedFoods = useMemo(
    () => frequentFoods.filter((f) => f.pinned),
    [frequentFoods]
  );
  const togglePin = useCallback((foodName) => {
    setFrequentFoods((prev) =>
      prev.map((f) =>
        f.name === foodName ? { ...f, pinned: !f.pinned } : f
      )
    );
  }, []);

  return {
    frequentFoods,
    foods,
    isLoading,
    recordFood,
    trackFood,
    getTopFoods,
    getRecentFoods,
    removeFood,
    clearAll,
    // Backward-compatible
    togglePin,
    pinnedFoods,
  };
}

// Default export for backward compatibility
export default useFrequentFoods;
