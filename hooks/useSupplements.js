import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJSONParse, isValidArray, isValidObject } from '../lib/validation';

const STORAGE_KEY = '@fueliq_supplements';
const LOG_KEY = '@fueliq_supplements_log';
const MAX_SUPPLEMENTS = 20;

const DEFAULT_SUPPLEMENTS = [
  {
    id: 'default_vitamin_d',
    name: 'Vitamin D',
    emoji: '\u2600\uFE0F',
    dosage: '5000',
    unit: 'IU',
    frequency: 'daily',
    times: ['08:00'],
    color: '#FFB300',
  },
  {
    id: 'default_omega3',
    name: 'Omega-3',
    emoji: '\uD83D\uDC1F',
    dosage: '1000',
    unit: 'mg',
    frequency: 'daily',
    times: ['08:00'],
    color: '#00D4FF',
  },
  {
    id: 'default_magnesium',
    name: 'Magnesium',
    emoji: '\uD83E\uDDEA',
    dosage: '400',
    unit: 'mg',
    frequency: 'daily',
    times: ['21:00'],
    color: '#BF5AF2',
  },
  {
    id: 'default_creatine',
    name: 'Creatine',
    emoji: '\uD83D\uDCAA',
    dosage: '5',
    unit: 'g',
    frequency: 'daily',
    times: ['07:00'],
    color: '#FF6B35',
  },
  {
    id: 'default_multivitamin',
    name: 'Multivitamin',
    emoji: '\uD83D\uDC8A',
    dosage: '1',
    unit: 'tablet',
    frequency: 'daily',
    times: ['08:00'],
    color: '#00E676',
  },
  {
    id: 'default_protein',
    name: 'Protein',
    emoji: '\uD83E\uDD5B',
    dosage: '30',
    unit: 'g',
    frequency: 'daily',
    times: ['12:00'],
    color: '#FF6B9D',
  },
  {
    id: 'default_zinc',
    name: 'Zinc',
    emoji: '\uD83D\uDEE1\uFE0F',
    dosage: '30',
    unit: 'mg',
    frequency: 'daily',
    times: ['20:00'],
    color: '#64D2FF',
  },
  {
    id: 'default_b12',
    name: 'B12',
    emoji: '\u26A1',
    dosage: '1000',
    unit: 'mcg',
    frequency: 'daily',
    times: ['08:00'],
    color: '#FFD700',
  },
];

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function useSupplements() {
  const [supplements, setSupplements] = useState([]);
  const [todayLog, setTodayLog] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedSupplements, storedLog] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LOG_KEY),
        ]);

        // Load supplements or use defaults
        if (storedSupplements) {
          const parsed = safeJSONParse(storedSupplements, null);
          if (isValidArray(parsed)) {
            setSupplements(parsed);
          } else {
            setSupplements(DEFAULT_SUPPLEMENTS);
          }
        } else {
          setSupplements(DEFAULT_SUPPLEMENTS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUPPLEMENTS));
        }

        // Load today's log, resetting if from a different day
        if (storedLog) {
          const parsed = safeJSONParse(storedLog, null);
          if (isValidObject(parsed) && parsed.date === getTodayKey()) {
            setTodayLog(parsed.entries || {});
          } else {
            // New day or invalid data, reset log
            setTodayLog({});
          }
        }
      } catch {
        setSupplements(DEFAULT_SUPPLEMENTS);
        setTodayLog({});
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist supplements
  const persistSupplements = async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage write failed
    }
  };

  // Persist today log
  const persistTodayLog = async (updated) => {
    try {
      await AsyncStorage.setItem(
        LOG_KEY,
        JSON.stringify({ date: getTodayKey(), entries: updated })
      );
    } catch {
      // Storage write failed
    }
  };

  const addSupplement = useCallback(
    async (data) => {
      if (supplements.length >= MAX_SUPPLEMENTS) return false;
      const newSupplement = {
        id: `supp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: data.name || 'New Supplement',
        emoji: data.emoji || '\uD83D\uDC8A',
        dosage: data.dosage || '1',
        unit: data.unit || 'mg',
        frequency: data.frequency || 'daily',
        times: data.times || ['08:00'],
        color: data.color || '#00D4FF',
      };
      const updated = [...supplements, newSupplement];
      setSupplements(updated);
      await persistSupplements(updated);
      return true;
    },
    [supplements]
  );

  const removeSupplement = useCallback(
    async (id) => {
      const updated = supplements.filter((s) => s.id !== id);
      setSupplements(updated);
      await persistSupplements(updated);

      // Also remove from today's log
      const updatedLog = { ...todayLog };
      delete updatedLog[id];
      setTodayLog(updatedLog);
      await persistTodayLog(updatedLog);
    },
    [supplements, todayLog]
  );

  const editSupplement = useCallback(
    async (id, data) => {
      const updated = supplements.map((s) =>
        s.id === id ? { ...s, ...data } : s
      );
      setSupplements(updated);
      await persistSupplements(updated);
    },
    [supplements]
  );

  const toggleTaken = useCallback(
    async (supplementId) => {
      const current = todayLog[supplementId];
      let updatedLog;
      if (current && current.taken) {
        // Un-take it
        updatedLog = { ...todayLog };
        delete updatedLog[supplementId];
      } else {
        // Mark as taken
        updatedLog = {
          ...todayLog,
          [supplementId]: {
            taken: true,
            takenAt: new Date().toISOString(),
          },
        };
      }
      setTodayLog(updatedLog);
      await persistTodayLog(updatedLog);
    },
    [todayLog]
  );

  const getTodayProgress = useCallback(() => {
    const dailySupplements = supplements.filter(
      (s) => s.frequency === 'daily'
    );
    const total = dailySupplements.length;
    const taken = dailySupplements.filter(
      (s) => todayLog[s.id] && todayLog[s.id].taken
    ).length;
    return { taken, total };
  }, [supplements, todayLog]);

  const getComplianceRate = useCallback(() => {
    const { taken, total } = getTodayProgress();
    if (total === 0) return 100;
    return Math.round((taken / total) * 100);
  }, [getTodayProgress]);

  const getUntakenCount = useCallback(() => {
    const dailySupplements = supplements.filter(
      (s) => s.frequency === 'daily'
    );
    return dailySupplements.filter(
      (s) => !todayLog[s.id] || !todayLog[s.id].taken
    ).length;
  }, [supplements, todayLog]);

  return {
    supplements,
    todayLog,
    isLoading,
    addSupplement,
    removeSupplement,
    editSupplement,
    toggleTaken,
    getComplianceRate,
    getTodayProgress,
    getUntakenCount,
  };
}
