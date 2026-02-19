import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionRecord {
  startedAt: number;
  clean: boolean;
}

interface CrashFreeData {
  sessions: SessionRecord[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'crash_free_rate_data';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadData(): Promise<CrashFreeData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Storage read failed — start fresh
  }
  return { sessions: [] };
}

async function saveData(data: CrashFreeData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage write failed — silently ignore
  }
}

/**
 * Prune sessions older than 30 days to keep storage bounded.
 */
function pruneOldSessions(sessions: SessionRecord[]): SessionRecord[] {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return sessions.filter((s) => s.startedAt >= cutoff);
}

// ---------------------------------------------------------------------------
// We track the "current" session index so `recordSessionEnd` knows which
// session to mark. We store this in a module-level variable.
// ---------------------------------------------------------------------------

let currentSessionIndex: number | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record that a new session has started.
 * If the previous session was never ended cleanly, it remains unclean (crash).
 */
export async function recordSessionStart(): Promise<void> {
  const data = await loadData();
  data.sessions = pruneOldSessions(data.sessions);

  // Add a new session record (defaults to unclean)
  const record: SessionRecord = {
    startedAt: Date.now(),
    clean: false,
  };

  data.sessions.push(record);
  currentSessionIndex = data.sessions.length - 1;

  await saveData(data);
}

/**
 * Record that the current session has ended.
 * @param clean - true if the session ended gracefully (no crash).
 */
export async function recordSessionEnd(clean: boolean): Promise<void> {
  const data = await loadData();

  if (currentSessionIndex !== null && currentSessionIndex < data.sessions.length) {
    data.sessions[currentSessionIndex].clean = clean;
  } else {
    // Fallback: mark the last session
    const last = data.sessions[data.sessions.length - 1];
    if (last) {
      last.clean = clean;
    }
  }

  await saveData(data);
  currentSessionIndex = null;
}

/**
 * Get crash-free rate statistics for the last 30 days.
 * A session is "clean" if `recordSessionEnd(true)` was called.
 * Sessions where the app crashed never receive the `clean=true` call.
 */
export async function getCrashFreeRate(): Promise<{
  rate: number;
  totalSessions: number;
  cleanSessions: number;
}> {
  const data = await loadData();
  const recent = pruneOldSessions(data.sessions);

  const totalSessions = recent.length;
  const cleanSessions = recent.filter((s) => s.clean).length;
  const rate = totalSessions > 0 ? cleanSessions / totalSessions : 1;

  return {
    rate,
    totalSessions,
    cleanSessions,
  };
}
