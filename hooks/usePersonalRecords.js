import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vibefit_personal_records';

export default function usePersonalRecords() {
  const [records, setRecords] = useState({});

  // Load records from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setRecords(JSON.parse(stored));
      } catch {
        // Silently fail - start fresh
      }
    })();
  }, []);

  // Persist records helper
  const persist = async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage write failed - records are still in memory
    }
  };

  /**
   * Check if any set beats the current PR for the given exercise.
   * Updates storage if a new PR is found.
   *
   * @param {string} exerciseName
   * @param {Array<{weight: number, reps: number}>} sets
   * @returns {{ isNewPR: boolean, prType: string, oldValue: number, newValue: number } | null}
   */
  const checkAndUpdatePR = useCallback(
    async (exerciseName, sets) => {
      if (!exerciseName || !sets || sets.length === 0) return null;

      const current = records[exerciseName] || {
        maxWeight: 0,
        maxReps: 0,
        maxVolume: 0,
        date: null,
      };

      let prResult = null;
      const newRecord = { ...current };
      const today = new Date().toISOString().split('T')[0];

      // Find max weight in this session
      const sessionMaxWeight = Math.max(...sets.map((s) => s.weight || 0));
      if (sessionMaxWeight > current.maxWeight) {
        prResult = {
          isNewPR: true,
          prType: 'weight',
          oldValue: current.maxWeight,
          newValue: sessionMaxWeight,
        };
        newRecord.maxWeight = sessionMaxWeight;
        newRecord.date = today;
      }

      // Find max reps in a single set
      const sessionMaxReps = Math.max(...sets.map((s) => s.reps || 0));
      if (sessionMaxReps > current.maxReps) {
        // Only override if no weight PR (weight takes priority)
        if (!prResult) {
          prResult = {
            isNewPR: true,
            prType: 'reps',
            oldValue: current.maxReps,
            newValue: sessionMaxReps,
          };
        }
        newRecord.maxReps = sessionMaxReps;
        newRecord.date = today;
      }

      // Check total volume (weight * reps across all sets)
      const sessionVolume = sets.reduce(
        (sum, s) => sum + (s.weight || 0) * (s.reps || 0),
        0
      );
      if (sessionVolume > current.maxVolume) {
        if (!prResult) {
          prResult = {
            isNewPR: true,
            prType: 'volume',
            oldValue: current.maxVolume,
            newValue: sessionVolume,
          };
        }
        newRecord.maxVolume = sessionVolume;
        newRecord.date = today;
      }

      // Persist if anything changed
      if (prResult) {
        const updated = { ...records, [exerciseName]: newRecord };
        setRecords(updated);
        await persist(updated);
      }

      return prResult;
    },
    [records]
  );

  /**
   * Get the PR record for a specific exercise.
   * @param {string} exerciseName
   * @returns {{ maxWeight: number, maxReps: number, maxVolume: number, date: string } | null}
   */
  const getRecord = useCallback(
    (exerciseName) => {
      return records[exerciseName] || null;
    },
    [records]
  );

  return { records, checkAndUpdatePR, getRecord };
}
