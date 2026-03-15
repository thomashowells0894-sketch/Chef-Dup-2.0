import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sentry } from './sentry';

export interface FrequentFoodStoreItem {
  id: string | number;
  name: string;
  emoji?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  serving?: string;
  servingUnit?: string;
  count?: number;
  lastUsed?: string;
  pinned?: boolean;
  clientRequestId?: string;
}

export interface FrequentFoodSeedItem extends Partial<FrequentFoodStoreItem> {
  name: string;
  count?: number;
  lastUsed?: string;
}

const STORAGE_KEY = '@fueliq_frequent_foods';
const MAX_ITEMS = 100;

let cachedFoods: FrequentFoodStoreItem[] | null = null;
let loadPromise: Promise<FrequentFoodStoreItem[]> | null = null;
const listeners = new Set<(foods: FrequentFoodStoreItem[]) => void>();

function cloneFoods(foods: FrequentFoodStoreItem[]): FrequentFoodStoreItem[] {
  return foods.map((food) => ({ ...food }));
}

function sortByTopRank(foods: FrequentFoodStoreItem[]): FrequentFoodStoreItem[] {
  return [...foods].sort((a, b) => {
    const countDiff = (b.count || 0) - (a.count || 0);
    if (countDiff !== 0) return countDiff;
    return new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime();
  });
}

function sortByRecency(foods: FrequentFoodStoreItem[]): FrequentFoodStoreItem[] {
  return [...foods].sort(
    (a, b) => new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime()
  );
}

function notifyListeners() {
  const snapshot = cloneFoods(cachedFoods || []);
  listeners.forEach((listener) => listener(snapshot));
}

async function persistFoods(foods: FrequentFoodStoreItem[]) {
  cachedFoods = foods;
  notifyListeners();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
  } catch (error) {
    Sentry.captureException(error);
  }
}

export function getFrequentFoodsSnapshot(): FrequentFoodStoreItem[] {
  return cloneFoods(cachedFoods || []);
}

export async function loadFrequentFoods(): Promise<FrequentFoodStoreItem[]> {
  if (cachedFoods) {
    return cloneFoods(cachedFoods);
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!saved) {
          cachedFoods = [];
          return [];
        }
        const parsed = JSON.parse(saved);
        cachedFoods = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        Sentry.captureException(error);
        cachedFoods = [];
      }
      return cloneFoods(cachedFoods || []);
    })();
  }

  const foods = await loadPromise;
  loadPromise = null;
  notifyListeners();
  return foods;
}

export function subscribeFrequentFoods(
  listener: (foods: FrequentFoodStoreItem[]) => void
): () => void {
  listeners.add(listener);
  if (cachedFoods) {
    listener(cloneFoods(cachedFoods));
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function recordFrequentFood(
  food: Partial<FrequentFoodStoreItem> & { name: string }
): Promise<void> {
  if (!food?.name) return;

  const foods = await loadFrequentFoods();
  const normalizedName = food.name.toLowerCase().trim();
  const now = new Date().toISOString();
  const existingIndex = foods.findIndex(
    (entry) => entry.name && entry.name.toLowerCase().trim() === normalizedName
  );

  let nextFoods: FrequentFoodStoreItem[];
  if (existingIndex >= 0) {
    const existing = foods[existingIndex];
    const updated = {
      ...existing,
      count: (existing.count || 1) + 1,
      lastUsed: now,
      calories: food.calories ?? existing.calories ?? 0,
      protein: food.protein ?? existing.protein ?? 0,
      carbs: food.carbs ?? existing.carbs ?? 0,
      fat: food.fat ?? existing.fat ?? 0,
      emoji: food.emoji || existing.emoji,
      serving: food.serving || existing.serving || '1 serving',
      servingUnit: food.servingUnit || existing.servingUnit || 'serving',
    };
    nextFoods = [updated, ...foods.filter((_, index) => index !== existingIndex)];
  } else {
    nextFoods = [
      {
        id: String(food.id || `freq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        name: food.name,
        emoji: food.emoji || food.name.charAt(0) || '?',
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        serving: food.serving || '1 serving',
        servingUnit: food.servingUnit || 'serving',
        count: 1,
        lastUsed: now,
        pinned: false,
      },
      ...foods,
    ];
  }

  if (nextFoods.length > MAX_ITEMS) {
    nextFoods = sortByTopRank(nextFoods).slice(0, MAX_ITEMS);
  }

  await persistFoods(nextFoods);
}

export async function mergeFrequentFoods(
  foodsToMerge: FrequentFoodSeedItem[]
): Promise<void> {
  if (!Array.isArray(foodsToMerge) || foodsToMerge.length === 0) {
    return;
  }

  const foods = await loadFrequentFoods();
  const mergedByName = new Map<string, FrequentFoodStoreItem>();

  foods.forEach((food) => {
    const normalizedName = food.name?.toLowerCase().trim();
    if (!normalizedName) return;
    mergedByName.set(normalizedName, { ...food });
  });

  foodsToMerge.forEach((food) => {
    const normalizedName = food.name?.toLowerCase().trim();
    if (!normalizedName) return;

    const existing = mergedByName.get(normalizedName);
    const incomingCount = Math.max(1, Math.round(food.count || 1));
    const incomingLastUsed = food.lastUsed || new Date().toISOString();

    if (existing) {
      mergedByName.set(normalizedName, {
        ...existing,
        count: (existing.count || 0) + incomingCount,
        lastUsed:
          new Date(incomingLastUsed).getTime() > new Date(existing.lastUsed || 0).getTime()
            ? incomingLastUsed
            : existing.lastUsed,
        calories: food.calories ?? existing.calories ?? 0,
        protein: food.protein ?? existing.protein ?? 0,
        carbs: food.carbs ?? existing.carbs ?? 0,
        fat: food.fat ?? existing.fat ?? 0,
        emoji: food.emoji || existing.emoji,
        serving: food.serving || existing.serving || '1 serving',
        servingUnit: food.servingUnit || existing.servingUnit || 'serving',
        pinned: existing.pinned || false,
      });
      return;
    }

    mergedByName.set(normalizedName, {
      id: String(food.id || `freq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      name: food.name,
      emoji: food.emoji || food.name.charAt(0) || '?',
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      serving: food.serving || '1 serving',
      servingUnit: food.servingUnit || 'serving',
      count: incomingCount,
      lastUsed: incomingLastUsed,
      pinned: false,
    });
  });

  await persistFoods(sortByTopRank([...mergedByName.values()]).slice(0, MAX_ITEMS));
}

export async function removeFrequentFoodById(id: string): Promise<void> {
  const foods = await loadFrequentFoods();
  await persistFoods(foods.filter((food) => food.id !== id));
}

export async function clearFrequentFoodsStore(): Promise<void> {
  await persistFoods([]);
}

export async function toggleFrequentFoodPinned(foodName: string): Promise<void> {
  const foods = await loadFrequentFoods();
  await persistFoods(
    foods.map((food) =>
      food.name === foodName ? { ...food, pinned: !food.pinned } : food
    )
  );
}

export function getTopFrequentFoods(limit: number = 10): FrequentFoodStoreItem[] {
  return sortByTopRank(cachedFoods || []).slice(0, limit);
}

export function getRecentFrequentFoods(limit: number = 10): FrequentFoodStoreItem[] {
  return sortByRecency(cachedFoods || []).slice(0, limit);
}
