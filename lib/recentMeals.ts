import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sentry } from './sentry';
import type { DateKey, MealType, MacroSet, FoodItem, FoodLogEntry } from '../types';

export interface RecentMealFoodItem extends MacroSet {
  name: string;
  emoji?: string;
  serving?: string;
  servingSize?: number;
  servingUnit?: string;
}

export interface RecentMealSnapshot {
  id: string;
  dateKey: DateKey;
  mealType: MealType;
  updatedAt: string;
  itemCount: number;
  totals: MacroSet;
  items: RecentMealFoodItem[];
}

export interface RepeatMealSuggestion {
  snapshot: RecentMealSnapshot;
  targetMealType: MealType;
  score: number;
  alreadyLoggedToday: boolean;
  daysSinceSource: number;
}

const STORAGE_KEY = '@fueliq_recent_meal_snapshots_v1';
const MAX_STORED_SNAPSHOTS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

let cachedSnapshots: RecentMealSnapshot[] | null = null;
let loadPromise: Promise<RecentMealSnapshot[]> | null = null;
const listeners = new Set<(snapshots: RecentMealSnapshot[]) => void>();

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

function buildSnapshotId(dateKey: DateKey, mealType: MealType) {
  return `${dateKey}:${mealType}`;
}

function cloneSnapshots(snapshots: RecentMealSnapshot[]): RecentMealSnapshot[] {
  return snapshots.map((snapshot) => ({
    ...snapshot,
    totals: { ...snapshot.totals },
    items: snapshot.items.map((item) => ({ ...item })),
  }));
}

function sortSnapshots(snapshots: RecentMealSnapshot[]): RecentMealSnapshot[] {
  return [...snapshots].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function dateKeyToTimestamp(dateKey: DateKey): number {
  const timestamp = new Date(`${dateKey}T12:00:00`).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareSuggestionRecency(a: RepeatMealSuggestion, b: RepeatMealSuggestion): number {
  return new Date(b.snapshot.updatedAt).getTime() - new Date(a.snapshot.updatedAt).getTime();
}

export function buildRepeatMealSuggestions({
  snapshots,
  selectedDateKey,
  currentMeals = {},
  preferredMealType,
  limit = 3,
}: {
  snapshots: RecentMealSnapshot[];
  selectedDateKey: DateKey;
  currentMeals?: Partial<Record<MealType, (FoodItem | FoodLogEntry)[]>>;
  preferredMealType?: MealType;
  limit?: number;
}): RepeatMealSuggestion[] {
  if (!Array.isArray(snapshots) || snapshots.length === 0 || !selectedDateKey) {
    return [];
  }

  const selectedTime = dateKeyToTimestamp(selectedDateKey);
  const bestByMealType = new Map<MealType, RepeatMealSuggestion>();

  sortSnapshots(snapshots).forEach((snapshot) => {
    if (!snapshot || snapshot.dateKey === selectedDateKey) {
      return;
    }

    const targetMealType = snapshot.mealType;
    const alreadyLoggedToday = Boolean(currentMeals[targetMealType]?.length);
    const sourceTime = dateKeyToTimestamp(snapshot.dateKey);
    const rawDaysSince = selectedTime > 0 && sourceTime > 0
      ? Math.round(Math.abs(selectedTime - sourceTime) / DAY_MS)
      : 1;
    const daysSinceSource = Math.max(rawDaysSince, 1);

    let score = 100;
    score += alreadyLoggedToday ? -18 : 28;
    score += preferredMealType === targetMealType ? 18 : 0;
    score += daysSinceSource === 1 ? 16 : Math.max(0, 14 - ((daysSinceSource - 1) * 2));
    score += Math.min(snapshot.itemCount, 5) * 2;

    if ((snapshot.totals.protein || 0) >= 35) {
      score += 12;
    } else if ((snapshot.totals.protein || 0) >= 20) {
      score += 8;
    } else if ((snapshot.totals.protein || 0) >= 10) {
      score += 4;
    }

    if ((snapshot.totals.calories || 0) >= 300 && (snapshot.totals.calories || 0) <= 900) {
      score += 4;
    }

    score -= Math.max(0, daysSinceSource - 5) * 2;

    const suggestion: RepeatMealSuggestion = {
      snapshot,
      targetMealType,
      score,
      alreadyLoggedToday,
      daysSinceSource,
    };

    const existing = bestByMealType.get(targetMealType);
    if (
      !existing ||
      suggestion.score > existing.score ||
      (suggestion.score === existing.score && compareSuggestionRecency(suggestion, existing) < 0)
    ) {
      bestByMealType.set(targetMealType, suggestion);
    }
  });

  return [...bestByMealType.values()]
    .sort((a, b) => {
      if (a.alreadyLoggedToday !== b.alreadyLoggedToday) {
        return Number(a.alreadyLoggedToday) - Number(b.alreadyLoggedToday);
      }

      if (preferredMealType) {
        const aPreferred = a.targetMealType === preferredMealType;
        const bPreferred = b.targetMealType === preferredMealType;
        if (aPreferred !== bPreferred) {
          return Number(bPreferred) - Number(aPreferred);
        }
      }

      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return compareSuggestionRecency(a, b);
    })
    .slice(0, limit);
}

function normalizeMealItems(items: (FoodItem | FoodLogEntry)[]): RecentMealFoodItem[] {
  return items.map((item) => ({
    name: item.name,
    emoji: item.emoji,
    calories: item.calories || 0,
    protein: item.protein || 0,
    carbs: item.carbs || 0,
    fat: item.fat || 0,
    serving: item.serving || '1 serving',
    servingSize: item.servingSize,
    servingUnit: item.servingUnit,
  }));
}

function toSnapshot(
  dateKey: DateKey,
  mealType: MealType,
  items: (FoodItem | FoodLogEntry)[],
  updatedAt?: string
): RecentMealSnapshot | null {
  const normalizedItems = normalizeMealItems(items).filter((item) => item.name);
  if (normalizedItems.length === 0) {
    return null;
  }
  const derivedUpdatedAt =
    updatedAt ||
    items.reduce<string | null>((latest, item) => {
      if (!('loggedAt' in item) || !item.loggedAt) {
        return latest;
      }
      if (!latest) {
        return item.loggedAt;
      }
      return new Date(item.loggedAt).getTime() > new Date(latest).getTime()
        ? item.loggedAt
        : latest;
    }, null) ||
    new Date().toISOString();

  const totals = normalizedItems.reduce<MacroSet>(
    (accumulator, item) => ({
      calories: accumulator.calories + (item.calories || 0),
      protein: accumulator.protein + (item.protein || 0),
      carbs: accumulator.carbs + (item.carbs || 0),
      fat: accumulator.fat + (item.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    id: buildSnapshotId(dateKey, mealType),
    dateKey,
    mealType,
    updatedAt: derivedUpdatedAt,
    itemCount: normalizedItems.length,
    totals,
    items: normalizedItems,
  };
}

function notifyListeners() {
  const snapshot = cloneSnapshots(cachedSnapshots || []);
  listeners.forEach((listener) => listener(snapshot));
}

async function persistSnapshots(snapshots: RecentMealSnapshot[]) {
  cachedSnapshots = sortSnapshots(snapshots).slice(0, MAX_STORED_SNAPSHOTS);
  notifyListeners();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSnapshots));
  } catch (error) {
    Sentry.captureException(error);
  }
}

export function getRecentMealSnapshotsSnapshot(limit: number = 7): RecentMealSnapshot[] {
  return cloneSnapshots((cachedSnapshots || []).slice(0, limit));
}

export async function loadRecentMealSnapshots(): Promise<RecentMealSnapshot[]> {
  if (cachedSnapshots) {
    return cloneSnapshots(cachedSnapshots);
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!saved) {
          cachedSnapshots = [];
          return [];
        }
        const parsed = JSON.parse(saved);
        cachedSnapshots = Array.isArray(parsed) ? sortSnapshots(parsed) : [];
      } catch (error) {
        Sentry.captureException(error);
        cachedSnapshots = [];
      }
      return cloneSnapshots(cachedSnapshots || []);
    })();
  }

  const snapshots = await loadPromise;
  loadPromise = null;
  notifyListeners();
  return snapshots;
}

export function subscribeRecentMealSnapshots(
  listener: (snapshots: RecentMealSnapshot[]) => void
): () => void {
  listeners.add(listener);
  if (cachedSnapshots) {
    listener(cloneSnapshots(cachedSnapshots));
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function replaceRecentMealSnapshot({
  dateKey,
  mealType,
  items,
  updatedAt,
}: {
  dateKey: DateKey;
  mealType: MealType;
  items: (FoodItem | FoodLogEntry)[];
  updatedAt?: string;
}): Promise<void> {
  const existing = await loadRecentMealSnapshots();
  const snapshotId = buildSnapshotId(dateKey, mealType);
  const next = existing.filter((snapshot) => snapshot.id !== snapshotId);
  const replacement = toSnapshot(dateKey, mealType, items, updatedAt);
  if (replacement) {
    next.unshift(replacement);
  }
  await persistSnapshots(next);
}

export async function syncRecentMealsForDate(
  dateKey: DateKey,
  meals: Record<MealType, (FoodItem | FoodLogEntry)[]>
): Promise<void> {
  const existing = await loadRecentMealSnapshots();
  const next = existing.filter((snapshot) => snapshot.dateKey !== dateKey);

  MEAL_TYPES.forEach((mealType) => {
    const snapshot = toSnapshot(dateKey, mealType, meals[mealType] || []);
    if (snapshot) {
      next.push(snapshot);
    }
  });

  await persistSnapshots(next);
}

export function useRecentMealSnapshots(limit: number = 7) {
  const [recentMeals, setRecentMeals] = useState<RecentMealSnapshot[]>(
    getRecentMealSnapshotsSnapshot(limit)
  );
  const [isLoading, setIsLoading] = useState<boolean>(recentMeals.length === 0);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const snapshots = await loadRecentMealSnapshots();
    setRecentMeals(snapshots.slice(0, limit));
    setIsLoading(false);
  }, [limit]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeRecentMealSnapshots((snapshots) => {
      if (!isMounted) return;
      setRecentMeals(snapshots.slice(0, limit));
      setIsLoading(false);
    });

    loadRecentMealSnapshots()
      .then((snapshots) => {
        if (!isMounted) return;
        setRecentMeals(snapshots.slice(0, limit));
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
  }, [limit]);

  return { recentMeals, isLoading, refresh };
}
