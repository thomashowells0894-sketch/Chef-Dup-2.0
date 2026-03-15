import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  clearFrequentFoodsStore,
  getFrequentFoodsSnapshot,
  getRecentFrequentFoods,
  getTopFrequentFoods,
  loadFrequentFoods,
  recordFrequentFood,
  removeFrequentFoodById,
  subscribeFrequentFoods,
  toggleFrequentFoodPinned,
} from '../lib/frequentFoodsStore';

/**
 * useFrequentFoods - Tracks frequently and recently logged foods.
 *
 * Food shape stored:
 * { id, name, emoji, calories, protein, carbs, fat, serving, servingUnit, count, lastUsed }
 */
export function useFrequentFoods() {
  const [frequentFoods, setFrequentFoods] = useState(() => getFrequentFoodsSnapshot());
  const [isLoading, setIsLoading] = useState(frequentFoods.length === 0);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeFrequentFoods((foods) => {
      if (!isMounted) return;
      setFrequentFoods(foods);
      setIsLoading(false);
    });

    loadFrequentFoods()
      .then((foods) => {
        if (!isMounted) return;
        setFrequentFoods(foods);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  /**
   * recordFood - Called when any food is logged.
   * If the food already exists (matched by name, case-insensitive),
   * increment its count and update lastUsed. Otherwise, add it new.
   */
  const recordFood = useCallback((food) => {
    if (!food || !food.name) return;
    recordFrequentFood(food);
  }, []);

  /**
   * getTopFoods - Returns top N foods sorted by count (descending).
   */
  const getTopFoods = useCallback(
    (limit = 10) => {
      return getTopFrequentFoods(limit);
    },
    [frequentFoods]
  );

  /**
   * getRecentFoods - Returns most recent N foods sorted by lastUsed (descending).
   */
  const getRecentFoods = useCallback(
    (limit = 10) => {
      return getRecentFrequentFoods(limit);
    },
    [frequentFoods]
  );

  /**
   * removeFood - Remove a food from the frequent list by id.
   */
  const removeFood = useCallback((id) => {
    removeFrequentFoodById(id);
  }, []);

  /**
   * clearAll - Reset the frequent foods list.
   */
  const clearAll = useCallback(() => {
    clearFrequentFoodsStore();
  }, []);

  // Backward-compatible aliases
  const trackFood = recordFood;
  const foods = frequentFoods;
  const pinnedFoods = useMemo(
    () => frequentFoods.filter((f) => f.pinned),
    [frequentFoods]
  );
  const togglePin = useCallback((foodName) => {
    toggleFrequentFoodPinned(foodName);
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
