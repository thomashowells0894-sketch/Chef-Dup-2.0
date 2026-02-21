/**
 * Tests for useSleepTracking hook.
 *
 * Dependencies mocked:
 * - lib/encryptedStorage
 * - services/healthService (getSleepAnalysis)
 * - lib/validation (uses real implementation)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock encrypted storage
const mockGetEncryptedItem = jest.fn();
const mockSetEncryptedItem = jest.fn();

jest.mock('../../lib/encryptedStorage', () => ({
  getEncryptedItem: (...args: any[]) => mockGetEncryptedItem(...args),
  setEncryptedItem: (...args: any[]) => mockSetEncryptedItem(...args),
}));

// Mock healthService
jest.mock('../../services/healthService', () => ({
  getSleepAnalysis: jest.fn(() => Promise.resolve(null)),
}));

import { useSleepTracking } from '../../hooks/useSleepTracking';

const WAIT_OPTIONS = { timeout: 5000 };

/**
 * Render the hook and wait for the async useEffect initialization to complete.
 * renderHook must NOT be called inside act() in newer versions of
 * @testing-library/react-native as it causes unmounted renderer errors.
 */
async function renderAndInit(setupMocks?: () => void) {
  if (setupMocks) setupMocks();
  const hookResult = renderHook(() => useSleepTracking());
  // Wait for the loading useEffect to finish
  await waitFor(() => {
    expect(hookResult.result.current.isLoading).toBe(false);
  }, WAIT_OPTIONS);
  return hookResult;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEncryptedItem.mockResolvedValue([]);
  mockSetEncryptedItem.mockResolvedValue(true);
});

// =============================================================================
// Initial state
// =============================================================================

describe('initial state', () => {
  it('starts with empty entries and loading true', () => {
    const { result } = renderHook(() => useSleepTracking());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.entries).toEqual([]);
  });

  it('finishes loading after initialization', async () => {
    const { result } = await renderAndInit();
    expect(result.current.isLoading).toBe(false);
  });

  it('loads existing entries from storage', async () => {
    const storedEntries = [
      { date: '2026-02-13T10:00:00Z', bedtime: '2026-02-12T23:00:00Z', wakeTime: '2026-02-13T07:00:00Z', duration: 8, quality: 4, notes: '' },
      { date: '2026-02-12T10:00:00Z', bedtime: '2026-02-11T23:00:00Z', wakeTime: '2026-02-12T07:00:00Z', duration: 8, quality: 3, notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(storedEntries);
    });

    expect(result.current.entries).toHaveLength(2);
  });

  it('filters out malformed entries on load', async () => {
    const mixedEntries = [
      { date: '2026-02-13T10:00:00Z', duration: 8, quality: 4 },
      { date: '2026-02-12T10:00:00Z' }, // missing duration
      null,
      'string',
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(mixedEntries);
    });

    expect(result.current.entries).toHaveLength(1);
  });
});

// =============================================================================
// addEntry
// =============================================================================

describe('addEntry', () => {
  it('adds a new sleep entry with calculated duration', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry(
        '2026-02-12T23:00:00Z',
        '2026-02-13T07:00:00Z',
        4,
        'Slept well',
      );
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].duration).toBe(8);
    expect(result.current.entries[0].quality).toBe(4);
    expect(result.current.entries[0].notes).toBe('Slept well');
  });

  it('handles overnight sleep duration correctly', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry(
        '2026-02-12T23:30:00Z', // 11:30 PM
        '2026-02-13T06:30:00Z', // 6:30 AM
        3,
      );
    });

    expect(result.current.entries[0].duration).toBe(7);
  });

  it('clamps quality between 1 and 5', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry('2026-02-12T23:00:00Z', '2026-02-13T07:00:00Z', 10);
    });
    expect(result.current.entries[0].quality).toBe(5);

    act(() => {
      result.current.addEntry('2026-02-11T23:00:00Z', '2026-02-12T07:00:00Z', 0);
    });
    // Quality of 0: parseInt('0', 10) = 0, which is falsy, so || 3 -> 3
    // Math.min(5, Math.max(1, 3)) = 3
    expect(result.current.entries[0].quality).toBe(3);
  });

  it('accepts string quality', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry('2026-02-12T23:00:00Z', '2026-02-13T07:00:00Z', '4');
    });
    expect(result.current.entries[0].quality).toBe(4);
  });

  it('replaces existing entry for same day', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry('2026-02-12T23:00:00Z', '2026-02-13T07:00:00Z', 3);
    });
    act(() => {
      result.current.addEntry('2026-02-12T22:00:00Z', '2026-02-13T06:00:00Z', 5);
    });

    // Should only have 1 entry for today
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].quality).toBe(5);
  });

  it('defaults empty notes', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry('2026-02-12T23:00:00Z', '2026-02-13T07:00:00Z', 3);
    });
    expect(result.current.entries[0].notes).toBe('');
  });
});

// =============================================================================
// deleteEntry
// =============================================================================

describe('deleteEntry', () => {
  it('removes an entry by date', async () => {
    const storedEntries = [
      { date: '2026-02-13T10:00:00Z', duration: 8, quality: 4, bedtime: '', wakeTime: '', notes: '' },
      { date: '2026-02-12T10:00:00Z', duration: 7, quality: 3, bedtime: '', wakeTime: '', notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(storedEntries);
    });

    expect(result.current.entries).toHaveLength(2);

    act(() => {
      result.current.deleteEntry('2026-02-13T10:00:00Z');
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].date).toBe('2026-02-12T10:00:00Z');
  });
});

// =============================================================================
// getWeeklyAverage
// =============================================================================

describe('getWeeklyAverage', () => {
  it('returns null for empty entries', async () => {
    const { result } = await renderAndInit();
    expect(result.current.getWeeklyAverage()).toBeNull();
  });

  it('calculates average duration over last 7 days', async () => {
    const now = new Date();
    const entries = [
      { date: new Date(now.getTime() - 1 * 86400000).toISOString(), duration: 7, quality: 3, bedtime: '', wakeTime: '', notes: '' },
      { date: new Date(now.getTime() - 2 * 86400000).toISOString(), duration: 8, quality: 4, bedtime: '', wakeTime: '', notes: '' },
      { date: new Date(now.getTime() - 3 * 86400000).toISOString(), duration: 6, quality: 2, bedtime: '', wakeTime: '', notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(entries);
    });

    expect(result.current.entries).toHaveLength(3);
    const avg = result.current.getWeeklyAverage();
    expect(avg).toBe(7); // (7+8+6)/3 = 7
  });

  it('ignores entries older than 7 days', async () => {
    const now = new Date();
    const entries = [
      { date: new Date(now.getTime() - 1 * 86400000).toISOString(), duration: 8, quality: 4, bedtime: '', wakeTime: '', notes: '' },
      { date: new Date(now.getTime() - 14 * 86400000).toISOString(), duration: 5, quality: 1, bedtime: '', wakeTime: '', notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(entries);
    });

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.getWeeklyAverage()).toBe(8);
  });
});

// =============================================================================
// getSleepDebt
// =============================================================================

describe('getSleepDebt', () => {
  it('returns null for empty entries', async () => {
    const { result } = await renderAndInit();
    expect(result.current.getSleepDebt()).toBeNull();
  });

  it('calculates positive debt when under-sleeping', async () => {
    const now = new Date();
    const entries = [
      { date: new Date(now.getTime() - 1 * 86400000).toISOString(), duration: 6, quality: 3, bedtime: '', wakeTime: '', notes: '' },
      { date: new Date(now.getTime() - 2 * 86400000).toISOString(), duration: 6, quality: 3, bedtime: '', wakeTime: '', notes: '' },
      { date: new Date(now.getTime() - 3 * 86400000).toISOString(), duration: 6, quality: 3, bedtime: '', wakeTime: '', notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(entries);
    });

    expect(result.current.entries).toHaveLength(3);
    const debt = result.current.getSleepDebt(8);
    // Target: 8 * 3 = 24, Slept: 6 * 3 = 18, Debt: 6
    expect(debt).toBe(6);
  });

  it('calculates negative debt (surplus) when over-sleeping', async () => {
    const now = new Date();
    const entries = [
      { date: new Date(now.getTime() - 1 * 86400000).toISOString(), duration: 10, quality: 5, bedtime: '', wakeTime: '', notes: '' },
      { date: new Date(now.getTime() - 2 * 86400000).toISOString(), duration: 10, quality: 5, bedtime: '', wakeTime: '', notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(entries);
    });

    expect(result.current.entries).toHaveLength(2);
    const debt = result.current.getSleepDebt(8);
    // Target: 8 * 2 = 16, Slept: 10 * 2 = 20, Debt: -4
    expect(debt).toBe(-4);
  });

  it('defaults to 8 hour target', async () => {
    const now = new Date();
    const entries = [
      { date: new Date(now.getTime() - 1 * 86400000).toISOString(), duration: 8, quality: 4, bedtime: '', wakeTime: '', notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(entries);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.getSleepDebt()).toBe(0); // 8 target, 8 slept
  });

  it('accepts custom target hours', async () => {
    const now = new Date();
    const entries = [
      { date: new Date(now.getTime() - 1 * 86400000).toISOString(), duration: 7, quality: 3, bedtime: '', wakeTime: '', notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(entries);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.getSleepDebt(7)).toBe(0);
    expect(result.current.getSleepDebt(9)).toBe(2);
  });
});

// =============================================================================
// getQualityTrend
// =============================================================================

describe('getQualityTrend', () => {
  it('returns null for empty entries', async () => {
    const { result } = await renderAndInit();
    expect(result.current.getQualityTrend()).toBeNull();
  });

  it('calculates average quality over last 7 days', async () => {
    const now = new Date();
    const entries = [
      { date: new Date(now.getTime() - 1 * 86400000).toISOString(), duration: 8, quality: 4, bedtime: '', wakeTime: '', notes: '' },
      { date: new Date(now.getTime() - 2 * 86400000).toISOString(), duration: 7, quality: 3, bedtime: '', wakeTime: '', notes: '' },
      { date: new Date(now.getTime() - 3 * 86400000).toISOString(), duration: 6, quality: 5, bedtime: '', wakeTime: '', notes: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockResolvedValue(entries);
    });

    expect(result.current.entries).toHaveLength(3);
    const trend = result.current.getQualityTrend();
    expect(trend).toBe(4); // (4+3+5)/3 = 4
  });
});

// =============================================================================
// getSleepEfficiency
// =============================================================================

describe('getSleepEfficiency', () => {
  it('returns 0 for null entry', async () => {
    const { result } = await renderAndInit();
    expect(result.current.getSleepEfficiency(null as any)).toBe(0);
  });

  it('returns 0 for entry missing bedtime', async () => {
    const { result } = await renderAndInit();

    expect(result.current.getSleepEfficiency({
      date: '2026-02-13',
      bedtime: '',
      wakeTime: '2026-02-13T07:00:00Z',
      duration: 7,
      quality: 3,
      notes: '',
    })).toBe(0);
  });

  it('calculates 100% efficiency when duration equals time in bed', async () => {
    const { result } = await renderAndInit();

    const efficiency = result.current.getSleepEfficiency({
      date: '2026-02-13',
      bedtime: '2026-02-12T23:00:00Z',
      wakeTime: '2026-02-13T07:00:00Z',
      duration: 8, // 8 hours in bed, 8 hours slept
      quality: 4,
      notes: '',
    });
    expect(efficiency).toBe(100);
  });

  it('calculates reduced efficiency when duration < time in bed', async () => {
    const { result } = await renderAndInit();

    const efficiency = result.current.getSleepEfficiency({
      date: '2026-02-13',
      bedtime: '2026-02-12T22:00:00Z', // 10 PM
      wakeTime: '2026-02-13T08:00:00Z', // 8 AM = 10h in bed
      duration: 8, // only 8h actual sleep
      quality: 3,
      notes: '',
    });
    expect(efficiency).toBe(80); // 8/10 * 100 = 80
  });

  it('caps at 100%', async () => {
    const { result } = await renderAndInit();

    const efficiency = result.current.getSleepEfficiency({
      date: '2026-02-13',
      bedtime: '2026-02-13T00:00:00Z',
      wakeTime: '2026-02-13T06:00:00Z', // 6h in bed
      duration: 7, // somehow 7h actual sleep (greater than time in bed)
      quality: 5,
      notes: '',
    });
    expect(efficiency).toBe(100);
  });
});

// =============================================================================
// Auto sleep & stage percentages
// =============================================================================

describe('auto sleep stages', () => {
  it('hasAutoSleep is false when no HealthKit data', async () => {
    const { result } = await renderAndInit();
    expect(result.current.hasAutoSleep).toBe(false);
    expect(result.current.autoSleepStages).toBeNull();
  });

  it('getStagePercentages returns null when no auto stages', async () => {
    const { result } = await renderAndInit();
    expect(result.current.getStagePercentages()).toBeNull();
  });
});

// =============================================================================
// Data persistence
// =============================================================================

describe('data persistence', () => {
  it('saves entries to encrypted storage on change', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry('2026-02-12T23:00:00Z', '2026-02-13T07:00:00Z', 4);
    });

    await waitFor(() => {
      expect(mockSetEncryptedItem).toHaveBeenCalledWith(
        '@fueliq_sleep_history',
        expect.any(Array),
      );
    }, WAIT_OPTIONS);
  });
});
