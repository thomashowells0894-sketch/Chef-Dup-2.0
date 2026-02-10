import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vibefit_favorite_foods';
const MAX_FAVORITES = 50;

export function useFavoriteFoods() {
  const [favorites, setFavorites] = useState([]);
  const isLoaded = useRef(false);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch {
        // Silently fail — start with empty list
      }
      isLoaded.current = true;
    }
    load();
  }, []);

  // Auto-save whenever favorites change (skip the initial empty state)
  useEffect(() => {
    if (!isLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(() => {});
  }, [favorites]);

  const addFavorite = useCallback((food) => {
    setFavorites((prev) => {
      // Dedupe by name (case-insensitive)
      const exists = prev.some(
        (f) => f.name.toLowerCase() === food.name.toLowerCase()
      );
      if (exists) return prev;

      const entry = {
        name: food.name,
        emoji: food.emoji || food.name?.charAt(0) || '?',
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        serving: food.serving || '1 serving',
        addedAt: new Date().toISOString(),
      };

      const updated = [entry, ...prev];
      // Enforce max limit
      if (updated.length > MAX_FAVORITES) {
        return updated.slice(0, MAX_FAVORITES);
      }
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((foodName) => {
    setFavorites((prev) =>
      prev.filter((f) => f.name.toLowerCase() !== foodName.toLowerCase())
    );
  }, []);

  const isFavorite = useCallback(
    (foodName) => {
      if (!foodName) return false;
      return favorites.some(
        (f) => f.name.toLowerCase() === foodName.toLowerCase()
      );
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (food) => {
      if (isFavorite(food.name)) {
        removeFavorite(food.name);
      } else {
        addFavorite(food);
      }
    },
    [isFavorite, removeFavorite, addFavorite]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite };
}
