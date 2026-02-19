import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vibefit_tours_seen';

export default function useTour() {
  const [seenTours, setSeenTours] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setSeenTours(JSON.parse(saved));
      } catch (e) {}
      setIsLoading(false);
    })();
  }, []);

  const markSeen = useCallback(async (tourId) => {
    const updated = { ...seenTours, [tourId]: new Date().toISOString() };
    setSeenTours(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, [seenTours]);

  const hasSeen = useCallback((tourId) => {
    return !!seenTours[tourId];
  }, [seenTours]);

  const resetTours = useCallback(async () => {
    setSeenTours({});
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return { hasSeen, markSeen, resetTours, isLoading };
}
