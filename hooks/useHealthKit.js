/**
 * useHealthKit Hook
 *
 * Manages health data integration state for FuelIQ.
 * Handles connection, disconnection, data fetching, and
 * automatic refresh while the app is in the foreground.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import {
  isHealthConnected,
  requestHealthPermissions,
  disconnectHealth,
  getStepsToday,
  getWeeklySteps,
  getLatestWeight,
  getActiveCaloriesToday,
  subscribeToStepUpdates,
} from '../services/healthService';

/** Refresh interval: 30 minutes in milliseconds. */
const REFRESH_INTERVAL = 30 * 60 * 1000;

export function useHealthKit() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [steps, setSteps] = useState(0);
  const [weeklySteps, setWeeklySteps] = useState([]);
  const [weight, setWeight] = useState(null);
  const [activeCalories, setActiveCalories] = useState(0);
  const [lastSynced, setLastSynced] = useState(null);

  const refreshTimerRef = useRef(null);
  const unsubStepsRef = useRef(null);
  const isMountedRef = useRef(true);

  // -------------------------------------------------------------------
  // Fetch all health data
  // -------------------------------------------------------------------
  const fetchHealthData = useCallback(async () => {
    try {
      const [stepsVal, weeklyVal, weightVal, calVal] = await Promise.all([
        getStepsToday(),
        getWeeklySteps(),
        getLatestWeight(),
        getActiveCaloriesToday(),
      ]);

      if (!isMountedRef.current) return;

      setSteps(stepsVal);
      setWeeklySteps(weeklyVal);
      setWeight(weightVal);
      setActiveCalories(calVal);
      setLastSynced(new Date());
    } catch (error) {
      if (__DEV__) {
        console.warn('[useHealthKit] Error fetching health data:', error.message);
      }
    }
  }, []);

  // -------------------------------------------------------------------
  // Start periodic refresh + step subscription
  // -------------------------------------------------------------------
  const startRefresh = useCallback(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Refresh every 30 minutes
    refreshTimerRef.current = setInterval(() => {
      fetchHealthData();
    }, REFRESH_INTERVAL);

    // Subscribe to live step updates
    if (!unsubStepsRef.current) {
      unsubStepsRef.current = subscribeToStepUpdates((newSteps) => {
        if (isMountedRef.current) {
          setSteps(newSteps);
        }
      });
    }
  }, [fetchHealthData]);

  const stopRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (unsubStepsRef.current) {
      unsubStepsRef.current();
      unsubStepsRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------
  // Connect to health platform
  // -------------------------------------------------------------------
  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const granted = await requestHealthPermissions();
      if (!isMountedRef.current) return;

      if (granted) {
        setIsConnected(true);
        await fetchHealthData();
        startRefresh();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[useHealthKit] Connection error:', error.message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchHealthData, startRefresh]);

  // -------------------------------------------------------------------
  // Disconnect from health platform
  // -------------------------------------------------------------------
  const disconnect = useCallback(async () => {
    stopRefresh();

    await disconnectHealth();

    if (!isMountedRef.current) return;

    setIsConnected(false);
    setSteps(0);
    setWeeklySteps([]);
    setWeight(null);
    setActiveCalories(0);
    setLastSynced(null);
  }, [stopRefresh]);

  // -------------------------------------------------------------------
  // Initial load: check stored connection state
  // -------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      try {
        const connected = await isHealthConnected();
        if (!isMountedRef.current) return;

        setIsConnected(connected);

        if (connected) {
          await fetchHealthData();
          startRefresh();
        }
      } catch {
        // Ignore initialization errors
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMountedRef.current = false;
      stopRefresh();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------
  // Pause / resume refresh on app state changes
  // -------------------------------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!isConnected) return;

      if (nextState === 'active') {
        // App foregrounded: refresh immediately and restart timer
        fetchHealthData();
        startRefresh();
      } else {
        // App backgrounded: stop polling to save resources
        stopRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isConnected, fetchHealthData, startRefresh, stopRefresh]);

  return {
    isConnected,
    isLoading,
    steps,
    weeklySteps,
    weight,
    activeCalories,
    lastSynced,
    connect,
    disconnect,
  };
}
