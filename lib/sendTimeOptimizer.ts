import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_TIMES_KEY = '@fueliq_log_times';
const MAX_ENTRIES = 100;

interface LogTimeEntry {
  hour: number;
  minute: number;
  day: number; // 0-6
  timestamp: number;
}

/**
 * Record when a user logs food (call this from MealContext on each food log)
 */
export async function recordLogTime(): Promise<void> {
  try {
    const now = new Date();
    const entry: LogTimeEntry = {
      hour: now.getHours(),
      minute: now.getMinutes(),
      day: now.getDay(),
      timestamp: now.getTime(),
    };

    const raw = await AsyncStorage.getItem(LOG_TIMES_KEY);
    const entries: LogTimeEntry[] = raw ? JSON.parse(raw) : [];
    entries.push(entry);

    // Keep only the most recent entries
    if (entries.length > MAX_ENTRIES) {
      entries.splice(0, entries.length - MAX_ENTRIES);
    }

    await AsyncStorage.setItem(LOG_TIMES_KEY, JSON.stringify(entries));
  } catch {
    // Non-critical, silently fail
  }
}

/**
 * Get the optimal notification times based on user's logging patterns.
 * Returns breakfast, lunch, dinner optimal times (30 min before typical log time).
 */
export async function getOptimalNotificationTimes(): Promise<{
  breakfast: { hour: number; minute: number };
  lunch: { hour: number; minute: number };
  dinner: { hour: number; minute: number };
} | null> {
  try {
    const raw = await AsyncStorage.getItem(LOG_TIMES_KEY);
    if (!raw) return null;

    const entries: LogTimeEntry[] = JSON.parse(raw);
    if (entries.length < 14) return null; // Need at least 2 weeks of data

    // Bucket entries into meal windows
    const breakfast: number[] = []; // 5-10
    const lunch: number[] = [];     // 11-14
    const dinner: number[] = [];    // 17-21

    for (const entry of entries) {
      const minutesSinceMidnight = entry.hour * 60 + entry.minute;
      if (entry.hour >= 5 && entry.hour < 10) {
        breakfast.push(minutesSinceMidnight);
      } else if (entry.hour >= 11 && entry.hour < 14) {
        lunch.push(minutesSinceMidnight);
      } else if (entry.hour >= 17 && entry.hour < 21) {
        dinner.push(minutesSinceMidnight);
      }
    }

    const getMedian = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const minutesToTime = (m: number, offset: number = -30) => {
      const adjusted = Math.max(0, m + offset); // Notify 30 min before
      return {
        hour: Math.floor(adjusted / 60),
        minute: Math.round(adjusted % 60),
      };
    };

    return {
      breakfast: breakfast.length >= 3 ? minutesToTime(getMedian(breakfast)) : { hour: 8, minute: 0 },
      lunch: lunch.length >= 3 ? minutesToTime(getMedian(lunch)) : { hour: 12, minute: 30 },
      dinner: dinner.length >= 3 ? minutesToTime(getMedian(dinner)) : { hour: 18, minute: 30 },
    };
  } catch {
    return null;
  }
}
