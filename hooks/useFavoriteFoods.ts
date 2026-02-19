import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJSONParse, isValidArray } from '../lib/validation';

const STORAGE_KEY = '@vibefit_favorite_foods';
const MAX_FAVORITES = 50;

interface FavoriteFood {
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  addedAt: string;
}

interface FoodInput {
  name: string;
  emoji?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  serving?: string;
}

interface UseFavoriteFoodsReturn {
  favorites: FavoriteFood[];
  addFavorite: (food: FoodInput) => void;
  removeFavorite: (foodName: string) => void;
  isFavorite: (foodName: string) => boolean;
  toggleFavorite: (food: FoodInput) => void;
}

export function useFavoriteFoods(): UseFavoriteFoodsReturn {
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const isLoaded = useRef<boolean>(false);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = safeJSONParse(stored, []);
          if (isValidArray(parsed)) setFavorites(parsed as FavoriteFood[]);
        }
      } catch {
        // Silently fail -- start with empty list
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

  const addFavorite = useCallback((food: FoodInput): void => {
    setFavorites((prev: FavoriteFood[]) => {
      // Dedupe by name (case-insensitive)
      const exists = prev.some(
        (f: FavoriteFood) => f.name.toLowerCase() === food.name.toLowerCase()
      );
      if (exists) return prev;

      const entry: FavoriteFood = {
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

  const removeFavorite = useCallback((foodName: string): void => {
    setFavorites((prev: FavoriteFood[]) =>
      prev.filter((f: FavoriteFood) => f.name.toLowerCase() !== foodName.toLowerCase())
    );
  }, []);

  const isFavorite = useCallback(
    (foodName: string): boolean => {
      if (!foodName) return false;
      return favorites.some(
        (f: FavoriteFood) => f.name.toLowerCase() === foodName.toLowerCase()
      );
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (food: FoodInput): void => {
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
