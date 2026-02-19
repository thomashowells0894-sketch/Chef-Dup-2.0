import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const AUDIT_QUEUE_KEY = '@vibefit_audit_queue';
const FLUSH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_BATCH_SIZE = 50;

interface AuditEntry {
  action: string;
  details?: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
}

let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Queue an audit log entry for async upload to Supabase.
 */
export async function queueAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_QUEUE_KEY);
    const queue: AuditEntry[] = raw ? JSON.parse(raw) : [];
    queue.push(entry);

    // Cap queue size to prevent storage bloat
    if (queue.length > 500) {
      queue.splice(0, queue.length - 500);
    }

    await AsyncStorage.setItem(AUDIT_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

/**
 * Flush queued audit logs to Supabase.
 */
export async function flushAuditLogs(): Promise<{ flushed: number; failed: number }> {
  let flushed = 0;
  let failed = 0;

  try {
    const raw = await AsyncStorage.getItem(AUDIT_QUEUE_KEY);
    if (!raw) return { flushed: 0, failed: 0 };

    const queue: AuditEntry[] = JSON.parse(raw);
    if (queue.length === 0) return { flushed: 0, failed: 0 };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { flushed: 0, failed: 0 };

    // Process in batches
    const batch = queue.slice(0, MAX_BATCH_SIZE);
    const remaining = queue.slice(MAX_BATCH_SIZE);

    const rows = batch.map(entry => ({
      user_id: user.id,
      action: entry.action,
      details: entry.details || {},
      created_at: entry.timestamp,
    }));

    const { error } = await supabase.from('audit_logs').insert(rows);

    if (error) {
      failed = batch.length;
      if (__DEV__) console.error('[AuditSync] Flush failed:', error.message);
    } else {
      flushed = batch.length;
    }

    // Save remaining items
    await AsyncStorage.setItem(AUDIT_QUEUE_KEY, JSON.stringify(
      error ? queue : remaining // Keep all if failed, remove flushed if success
    ));
  } catch (error) {
    if (__DEV__) console.error('[AuditSync] Error:', error);
  }

  return { flushed, failed };
}

/**
 * Start periodic audit log flushing.
 */
export function startAuditSync(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushAuditLogs, FLUSH_INTERVAL);
  // Also flush immediately on start
  flushAuditLogs();
}

/**
 * Stop periodic audit log flushing.
 */
export function stopAuditSync(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}
