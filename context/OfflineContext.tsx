import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const MAX_RETRIES = 5;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const BASE_BACKOFF_MS = 1000; // 1 second initial backoff
const MAX_BACKOFF_MS = 60 * 1000; // 60 seconds max backoff

interface QueuedOperation {
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  where?: Record<string, unknown>;
  tempId?: string;
  queuedAt: string;
  retryCount?: number;
}

interface FlushResult {
  flushed: number;
  failed: number;
  dropped: number;
}

interface OfflineContextValue {
  isOnline: boolean;
  queueLength: number;
  queueOperation: (op: Omit<QueuedOperation, 'queuedAt' | 'retryCount'>) => Promise<void>;
  flushQueue: () => Promise<FlushResult>;
  checkOnline: () => Promise<boolean>;
  showOfflineAlert: (action?: string) => void;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

const QUEUE_KEY = '@fueliq_offline_queue';

/**
 * Calculate exponential backoff delay with jitter.
 */
function getBackoffDelay(retryCount: number): number {
  const exponential = BASE_BACKOFF_MS * Math.pow(2, retryCount);
  const jitter = Math.random() * BASE_BACKOFF_MS;
  return Math.min(exponential + jitter, MAX_BACKOFF_MS);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * OfflineContext provides:
 * - Real-time connectivity state
 * - A persistent operation queue (AsyncStorage-backed)
 * - Auto-flush when connectivity returns
 * - Exponential backoff on failed flushes
 * - Max retry count per operation (dropped after MAX_RETRIES)
 * - Conflict resolution for stale operations (skip items older than 24 hours)
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueLength, setQueueLength] = useState<number>(0);
  const flushingRef = useRef<boolean>(false);
  const flushLockRef = useRef<Promise<FlushResult> | null>(null);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(!!online);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
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

  const loadQueueLength = async (): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue: QueuedOperation[] = raw ? JSON.parse(raw) : [];
      setQueueLength(queue.length);
    } catch {
      setQueueLength(0);
    }
  };

  /**
   * Queue an operation for later sync.
   */
  const queueOperation = useCallback(async (op: Omit<QueuedOperation, 'queuedAt' | 'retryCount'>): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue: QueuedOperation[] = raw ? JSON.parse(raw) : [];
      queue.push({ ...op, queuedAt: new Date().toISOString(), retryCount: 0 } as QueuedOperation);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      setQueueLength(queue.length);
    } catch (error: any) {
      if (__DEV__) console.error('[Offline] Failed to queue operation:', error.message);
    }
  }, []);

  /**
   * Flush all queued operations to Supabase in order.
   * Implements exponential backoff, retry limits, and stale operation pruning.
   * Returns { flushed: number, failed: number, dropped: number }
   */
  const flushQueue = useCallback(async (): Promise<FlushResult> => {
    if (flushLockRef.current) {
      return flushLockRef.current;
    }

    const promise = (async (): Promise<FlushResult> => {
      flushingRef.current = true;

      let flushed = 0;
      let failed = 0;
      let dropped = 0;

      try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        const queue: QueuedOperation[] = raw ? JSON.parse(raw) : [];
        if (queue.length === 0) {
          return { flushed: 0, failed: 0, dropped: 0 };
        }

        const remaining: QueuedOperation[] = [];
        const now = Date.now();

        for (const op of queue) {
          // Skip and drop stale operations older than MAX_AGE_MS
          const opAge = now - new Date(op.queuedAt).getTime();
          if (opAge > MAX_AGE_MS) {
            dropped++;
            if (__DEV__) console.log(`[Offline] Dropping stale operation (${Math.round(opAge / 3600000)}h old):`, op.table, op.type);
            continue;
          }

          // Drop operations that have exceeded max retries
          const retryCount = op.retryCount ?? 0;
          if (retryCount >= MAX_RETRIES) {
            dropped++;
            if (__DEV__) console.log(`[Offline] Dropping operation after ${MAX_RETRIES} retries:`, op.table, op.type);
            continue;
          }

          // Apply exponential backoff delay between retries
          if (retryCount > 0) {
            const delay = getBackoffDelay(retryCount);
            if (__DEV__) console.log(`[Offline] Backoff ${delay}ms for retry #${retryCount}`);
            await sleep(delay);
          }

          try {
            let success = false;

            if (op.type === 'INSERT') {
              const { error } = await supabase.from(op.table).insert(op.payload);
              if (error) {
                if (__DEV__) console.error('[Offline] Flush INSERT failed:', error.message);
              } else {
                success = true;
              }
            } else if (op.type === 'UPDATE') {
              if (op.where) {
                let query = supabase.from(op.table).update(op.payload);
                for (const [col, val] of Object.entries(op.where)) {
                  query = query.eq(col, val);
                }
                const { error } = await query;
                if (error) {
                  if (__DEV__) console.error('[Offline] Flush UPDATE failed:', error.message);
                } else {
                  success = true;
                }
              } else {
                if (__DEV__) console.error('[Offline] UPDATE operation missing where clause');
              }
            } else if (op.type === 'DELETE') {
              if (op.where) {
                let query = supabase.from(op.table).delete();
                for (const [col, val] of Object.entries(op.where)) {
                  query = query.eq(col, val);
                }
                const { error } = await query;
                if (error) {
                  if (__DEV__) console.error('[Offline] Flush DELETE failed:', error.message);
                } else {
                  success = true;
                }
              }
            }

            if (success) {
              flushed++;
            } else {
              failed++;
              remaining.push({ ...op, retryCount: retryCount + 1 });
            }
          } catch {
            failed++;
            remaining.push({ ...op, retryCount: (op.retryCount ?? 0) + 1 });
          }
        }

        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
        setQueueLength(remaining.length);

        if (__DEV__ && (flushed > 0 || dropped > 0)) {
          console.log(`[Offline] Flushed ${flushed}, failed ${failed}, dropped ${dropped}`);
        }
      } catch (error: any) {
        if (__DEV__) console.error('[Offline] Flush error:', error.message);
      } finally {
        flushingRef.current = false;
      }

      return { flushed, failed, dropped };
    })();

    flushLockRef.current = promise;
    try {
      return await promise;
    } finally {
      flushLockRef.current = null;
    }
  }, []);

  /**
   * Check connectivity (instant, reactive state).
   * For one-off checks, use checkOnline().
   */
  const checkOnline = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      return !!(state.isConnected && state.isInternetReachable !== false);
    } catch {
      return true;
    }
  }, []);

  const showOfflineAlert = useCallback((action: string = 'save') => {
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

  const value = React.useMemo<OfflineContextValue>(
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

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
