import { useState, useEffect, useCallback, useMemo } from 'react';
import { isValidArray } from '../lib/validation';
import { getEncryptedItem, setEncryptedItem } from '../lib/encryptedStorage';

const STORAGE_KEY = '@fueliq_body_measurements';
const UNIT_KEY = '@fueliq_body_measurements_unit';

const BODY_PARTS: string[] = ['chest', 'waist', 'hips', 'leftArm', 'rightArm', 'leftThigh', 'rightThigh', 'neck'];

const CM_TO_IN = 0.393701;
const IN_TO_CM = 2.54;

export { BODY_PARTS };

type MeasurementUnit = 'cm' | 'in';

interface BodyMeasurementValues {
  chest?: number;
  waist?: number;
  hips?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  neck?: number;
  [key: string]: number | undefined;
}

interface BodyMeasurementEntry {
  date: string;
  measurements: BodyMeasurementValues;
  note: string;
}

interface BodyMeasurementChanges {
  [part: string]: number | null;
}

interface UseBodyMeasurementsReturn {
  history: BodyMeasurementEntry[];
  unit: MeasurementUnit;
  addMeasurement: (measurements: BodyMeasurementValues, note?: string) => Promise<BodyMeasurementEntry>;
  deleteMeasurement: (date: string) => Promise<void>;
  getLatest: () => BodyMeasurementEntry | null;
  getChanges: () => BodyMeasurementChanges | null;
  setUnit: (newUnit: MeasurementUnit) => Promise<void>;
  isLoading: boolean;
}

export default function useBodyMeasurements(): UseBodyMeasurementsReturn {
  const [history, setHistory] = useState<BodyMeasurementEntry[]>([]);
  const [unit, setUnitState] = useState<MeasurementUnit>('in');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load from encrypted storage on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedHistory, storedUnit] = await Promise.all([
          getEncryptedItem(STORAGE_KEY, []),
          getEncryptedItem(UNIT_KEY, null),
        ]);
        if (isValidArray(storedHistory)) setHistory(storedHistory as BodyMeasurementEntry[]);
        if (storedUnit) setUnitState(storedUnit as MeasurementUnit);
      } catch {
        // Silently fail - start fresh
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist history helper (encrypted)
  const persistHistory = async (updated: BodyMeasurementEntry[]): Promise<void> => {
    try {
      await setEncryptedItem(STORAGE_KEY, updated);
    } catch {
      // Storage write failed - data is still in memory
    }
  };

  // Persist unit helper (encrypted)
  const persistUnit = async (newUnit: MeasurementUnit): Promise<void> => {
    try {
      await setEncryptedItem(UNIT_KEY, newUnit);
    } catch {
      // Storage write failed
    }
  };

  const addMeasurement = useCallback(
    async (measurements: BodyMeasurementValues, note: string = ''): Promise<BodyMeasurementEntry> => {
      const entry: BodyMeasurementEntry = {
        date: new Date().toISOString(),
        measurements: { ...measurements },
        note,
      };
      const updated = [...history, entry];
      setHistory(updated);
      await persistHistory(updated);
      return entry;
    },
    [history]
  );

  const deleteMeasurement = useCallback(
    async (date: string): Promise<void> => {
      const updated = history.filter((entry: BodyMeasurementEntry) => entry.date !== date);
      setHistory(updated);
      await persistHistory(updated);
    },
    [history]
  );

  const getLatest = useCallback((): BodyMeasurementEntry | null => {
    if (history.length === 0) return null;
    // History is stored in chronological order; last entry is latest
    return history[history.length - 1];
  }, [history]);

  const getChanges = useCallback((): BodyMeasurementChanges | null => {
    if (history.length < 2) return null;
    const first = history[0].measurements;
    const latest = history[history.length - 1].measurements;
    const changes: BodyMeasurementChanges = {};

    for (const part of BODY_PARTS) {
      const firstVal = parseFloat(first[part] as unknown as string);
      const latestVal = parseFloat(latest[part] as unknown as string);
      if (!isNaN(firstVal) && !isNaN(latestVal) && firstVal > 0) {
        changes[part] = parseFloat((latestVal - firstVal).toFixed(2));
      } else {
        changes[part] = null;
      }
    }

    return changes;
  }, [history]);

  const setUnit = useCallback(
    async (newUnit: MeasurementUnit): Promise<void> => {
      if (newUnit !== 'cm' && newUnit !== 'in') return;
      setUnitState(newUnit);
      await persistUnit(newUnit);
    },
    []
  );

  const sortedHistory = useMemo(
    (): BodyMeasurementEntry[] => [...history].sort((a: BodyMeasurementEntry, b: BodyMeasurementEntry) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [history]
  );

  return {
    history: sortedHistory,
    unit,
    addMeasurement,
    deleteMeasurement,
    getLatest,
    getChanges,
    setUnit,
    isLoading,
  };
}
