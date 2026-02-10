import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const OfflineContext = createContext(null);

const QUEUE_KEY = '@vibefit_offline_queue';

/**
 * OfflineContext provides:
 * - Real-time connectivity state
 * - A persistent operation queue (AsyncStorage-backed)
 * - Auto-flush when connectivity returns
 */
export function OfflineProvider({ children }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const flushingRef = useRef(false);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected && state.isInternetReachable !== false);
    });

    return () => unsubscribe();
  }, []);

  // Load queue length on mount
  useEffect(() => {
    loadQueueLength();
  }, []);

  // Auto-flush when we come back online
  useEffect(() => {
    if (isOnline && user && queueLength > 0) {
      flushQueue();
    }
  }, [isOnline, user, queueLength]);

  const loadQueueLength = async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      setQueueLength(queue.length);
    } catch {
      setQueueLength(0);
    }
  };

  /**
   * Queue an operation for later sync.
   * @param {Object} op - { table: string, type: 'INSERT'|'DELETE', payload: object, tempId?: string }
   */
  const queueOperation = useCallback(async (op) => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push({ ...op, queuedAt: new Date().toISOString() });
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      setQueueLength(queue.length);
    } catch (error) {
      if (__DEV__) console.error('[Offline] Failed to queue operation:', error.message);
    }
  }, []);

  /**
   * Flush all queued operations to Supabase in order.
   * Returns { flushed: number, failed: number }
   */
  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return { flushed: 0, failed: 0 };
    flushingRef.current = true;

    let flushed = 0;
    let failed = 0;

    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      if (queue.length === 0) {
        flushingRef.current = false;
        return { flushed: 0, failed: 0 };
      }

      const remaining = [];

      for (const op of queue) {
        try {
          if (op.type === 'INSERT') {
            const { error } = await supabase.from(op.table).insert(op.payload);
            if (error) {
              if (__DEV__) console.error('[Offline] Flush INSERT failed:', error.message);
              failed++;
              remaining.push(op);
            } else {
              flushed++;
            }
          } else if (op.type === 'DELETE') {
            const query = supabase.from(op.table).delete();
            // Apply all where conditions
            if (op.where) {
              let q = query;
              for (const [col, val] of Object.entries(op.where)) {
                q = q.eq(col, val);
              }
              const { error } = await q;
              if (error) {
                if (__DEV__) console.error('[Offline] Flush DELETE failed:', error.message);
                failed++;
                remaining.push(op);
              } else {
                flushed++;
              }
            }
          }
        } catch {
          failed++;
          remaining.push(op);
        }
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      setQueueLength(remaining.length);

      if (flushed > 0 && __DEV__) {
        if (__DEV__) console.log(`[Offline] Flushed ${flushed} operations, ${failed} failed`);
      }
    } catch (error) {
      if (__DEV__) console.error('[Offline] Flush error:', error.message);
    } finally {
      flushingRef.current = false;
    }

    return { flushed, failed };
  }, []);

  /**
   * Check connectivity (instant, reactive state).
   * For one-off checks, use checkOnline().
   */
  const checkOnline = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable !== false;
    } catch {
      return true;
    }
  }, []);

  const showOfflineAlert = useCallback((action = 'save') => {
    Alert.alert(
      'You\'re Offline',
      `Your ${action} has been queued and will sync automatically when you reconnect.`,
      [{ text: 'OK', style: 'default' }]
    );
  }, []);

  // Clear queue on logout
  useEffect(() => {
    if (!user) {
      AsyncStorage.removeItem(QUEUE_KEY).catch(() => {});
      setQueueLength(0);
    }
  }, [user]);

  const value = React.useMemo(
    () => ({
      isOnline,
      queueLength,
      queueOperation,
      flushQueue,
      checkOnline,
      showOfflineAlert,
    }),
    [isOnline, queueLength, queueOperation, flushQueue, checkOnline, showOfflineAlert]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
