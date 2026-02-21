import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJSONParse, isValidArray } from '../lib/validation';

const STORAGE_KEY = '@fueliq_workout_ratings';
const MAX_ENTRIES = 200;

export default function useWorkoutRatings() {
  const [ratings, setRatings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load ratings from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = safeJSONParse(stored, []);
          if (isValidArray(parsed)) setRatings(parsed);
        }
      } catch {
        // Silently fail - start fresh
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist helper
  const persist = async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage write failed - ratings are still in memory
    }
  };

  /**
   * Add a workout rating.
   * @param {object} data - { workoutId, workoutName, workoutType, rating, difficulty, notes, tips }
   * @returns {object} The saved rating entry with id and date
   */
  const addRating = useCallback(
    async (data) => {
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        workoutId: data.workoutId || '',
        workoutName: data.workoutName || 'Workout',
        workoutType: data.workoutType || 'strength',
        rating: data.rating || 3,
        difficulty: data.difficulty || 'expected',
        notes: data.notes || '',
        tips: data.tips || [],
        date: new Date().toISOString(),
      };

      const updated = [entry, ...ratings].slice(0, MAX_ENTRIES);
      setRatings(updated);
      await persist(updated);
      return entry;
    },
    [ratings]
  );

  /**
   * Get the overall average rating across all rated workouts.
   * @returns {number} Average rating (0 if none)
   */
  const getAverageRating = useCallback(() => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  }, [ratings]);

  /**
   * Filter ratings by workout type.
   * @param {string} type - e.g. 'strength', 'hiit', 'yoga'
   * @returns {Array} Filtered rating entries
   */
  const getRatingsByType = useCallback(
    (type) => {
      if (!type || type === 'all') return ratings;
      return ratings.filter(
        (r) => r.workoutType?.toLowerCase() === type.toLowerCase()
      );
    },
    [ratings]
  );

  /**
   * Get the distribution of difficulty responses.
   * @returns {{ easier: number, expected: number, harder: number }}
   */
  const getDifficultyDistribution = useCallback(() => {
    const dist = { easier: 0, expected: 0, harder: 0 };
    ratings.forEach((r) => {
      if (r.difficulty === 'easier') dist.easier++;
      else if (r.difficulty === 'harder') dist.harder++;
      else dist.expected++;
    });
    return dist;
  }, [ratings]);

  /**
   * Generate insights from rating patterns.
   * @returns {string[]} Array of insight strings
   */
  const getInsights = useCallback(() => {
    if (ratings.length < 2) return [];

    const insights = [];

    // Compare ratings by type
    const typeMap = {};
    ratings.forEach((r) => {
      const t = (r.workoutType || 'other').toLowerCase();
      if (!typeMap[t]) typeMap[t] = [];
      typeMap[t].push(r.rating || 0);
    });

    const typeAverages = {};
    Object.entries(typeMap).forEach(([type, vals]) => {
      typeAverages[type] = vals.reduce((a, b) => a + b, 0) / vals.length;
    });

    // Find highest and lowest rated types
    const typeEntries = Object.entries(typeAverages).filter(([, avg]) => avg > 0);
    if (typeEntries.length >= 2) {
      typeEntries.sort((a, b) => b[1] - a[1]);
      const [highType, highAvg] = typeEntries[0];
      const [lowType, lowAvg] = typeEntries[typeEntries.length - 1];
      const diff = Math.round((highAvg - lowAvg) * 10) / 10;
      if (diff >= 0.3) {
        const formatType = (t) => t.charAt(0).toUpperCase() + t.slice(1);
        insights.push(
          `You rate ${formatType(highType)} workouts ${diff} stars higher than ${formatType(lowType)} workouts`
        );
      }
    }

    // Difficulty calibration
    const dist = getDifficultyDistribution();
    const total = dist.easier + dist.expected + dist.harder;
    if (total >= 3) {
      const expectedPct = Math.round((dist.expected / total) * 100);
      if (expectedPct >= 60) {
        insights.push(
          `Your average difficulty is 'as expected' - you're well calibrated!`
        );
      } else if (dist.harder > dist.easier && dist.harder > dist.expected) {
        insights.push(
          `Most workouts feel harder than expected - consider lowering intensity or adding more rest`
        );
      } else if (dist.easier > dist.harder && dist.easier > dist.expected) {
        insights.push(
          `Most workouts feel easier than expected - try increasing weight or intensity`
        );
      }
    }

    // Average rating insight
    const avg = getAverageRating();
    if (avg > 0 && ratings.length >= 3) {
      if (avg >= 4) {
        insights.push(
          `Your average rating is ${avg}/5 - you're crushing your workouts!`
        );
      } else if (avg <= 2) {
        insights.push(
          `Your average rating is ${avg}/5 - consider adjusting workout difficulty`
        );
      }
    }

    // Recent trend
    if (ratings.length >= 4) {
      const recent = ratings.slice(0, 3).reduce((a, r) => a + r.rating, 0) / 3;
      const older = ratings.slice(3, 6);
      if (older.length >= 2) {
        const olderAvg = older.reduce((a, r) => a + r.rating, 0) / older.length;
        const trendDiff = Math.round((recent - olderAvg) * 10) / 10;
        if (trendDiff >= 0.5) {
          insights.push(
            `Your recent workout ratings are trending up by ${trendDiff} stars`
          );
        } else if (trendDiff <= -0.5) {
          insights.push(
            `Your recent workout ratings are trending down - consider taking a recovery day`
          );
        }
      }
    }

    return insights;
  }, [ratings, getDifficultyDistribution, getAverageRating]);

  return {
    ratings,
    isLoading,
    addRating,
    getAverageRating,
    getRatingsByType,
    getDifficultyDistribution,
    getInsights,
  };
}
