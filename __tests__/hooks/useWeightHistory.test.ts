/**
 * Tests for useWeightHistory hook.
 *
 * The hook depends on:
 * - ProfileContext (useProfile) — mocked via jest.setup.ts and locally
 * - lib/encryptedStorage (getEncryptedItem, setEncryptedItem, removeEncryptedItem)
 * - lib/validation (isValidArray) — real implementation
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock the encrypted storage module
const mockGetEncryptedItem = jest.fn();
const mockSetEncryptedItem = jest.fn();
const mockRemoveEncryptedItem = jest.fn();

jest.mock('../../lib/encryptedStorage', () => ({
  getEncryptedItem: (...args: any[]) => mockGetEncryptedItem(...args),
  setEncryptedItem: (...args: any[]) => mockSetEncryptedItem(...args),
  removeEncryptedItem: (...args: any[]) => mockRemoveEncryptedItem(...args),
}));

// Mock ProfileContext
jest.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({
    updateProfile: jest.fn(),
  }),
}));

import { useWeightHistory } from '../../hooks/useWeightHistory';

const WAIT_OPTIONS = { timeout: 5000 };

/**
 * Render the hook and wait for async useEffect initialization to complete.
 */
async function renderAndInit(setupMocks?: () => void) {
  if (setupMocks) setupMocks();
  const hookResult = renderHook(() => useWeightHistory());
  await waitFor(() => {
    expect(hookResult.result.current.isLoading).toBe(false);
  });
  return hookResult;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEncryptedItem.mockResolvedValue([]);
  mockSetEncryptedItem.mockResolvedValue(true);
  mockRemoveEncryptedItem.mockResolvedValue(true);
});

// =============================================================================
// Initial state
// =============================================================================

describe('initial state', () => {
  it('starts with empty entries and loading true', () => {
    // Synchronous check before the async useEffect fires
    const { result } = renderHook(() => useWeightHistory());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.entries).toEqual([]);
  });

  it('sets loading to false after data loads', async () => {
    const { result } = await renderAndInit();
    expect(result.current.isLoading).toBe(false);
  });

  it('loads existing entries from storage', async () => {
    const storedEntries = [
      { weight: 180, date: '2026-02-13T10:00:00Z', note: '' },
      { weight: 181, date: '2026-02-12T10:00:00Z', note: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(storedEntries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(2);
    // Sorted newest-first
    expect(result.current.entries[0].weight).toBe(180);
  });

  it('loads goal from storage', async () => {
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_goal') return Promise.resolve(170);
        return Promise.resolve([]);
      });
    });

    expect(result.current.goal).toBe(170);
  });

  it('filters out malformed entries on load', async () => {
    const mixedEntries = [
      { weight: 180, date: '2026-02-13T10:00:00Z', note: '' },
      { weight: NaN, date: '2026-02-12T10:00:00Z', note: '' },
      { date: '2026-02-11T10:00:00Z', note: '' }, // missing weight
      null,
      'string',
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(mixedEntries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].weight).toBe(180);
  });
});

// =============================================================================
// addEntry
// =============================================================================

describe('addEntry', () => {
  it('adds a new weight entry', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry(180);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].weight).toBe(180);
  });

  it('accepts string weight', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry('175.5');
    });

    expect(result.current.entries[0].weight).toBe(175.5);
  });

  it('replaces existing entry for same day', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry(180);
    });
    act(() => {
      result.current.addEntry(179);
    });

    // Should only have 1 entry (today's was replaced)
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].weight).toBe(179);
  });

  it('stores note with entry', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry(180, 'After breakfast');
    });

    expect(result.current.entries[0].note).toBe('After breakfast');
  });

  it('updates currentWeight after adding', async () => {
    const { result } = await renderAndInit();

    expect(result.current.currentWeight).toBeNull();

    act(() => {
      result.current.addEntry(180);
    });

    expect(result.current.currentWeight).toBe(180);
  });
});

// =============================================================================
// deleteEntry
// =============================================================================

describe('deleteEntry', () => {
  it('removes an entry by date', async () => {
    const storedEntries = [
      { weight: 180, date: '2026-02-13T10:00:00Z', note: '' },
      { weight: 181, date: '2026-02-12T10:00:00Z', note: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(storedEntries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(2);

    act(() => {
      result.current.deleteEntry('2026-02-13T10:00:00Z');
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].weight).toBe(181);
  });

  it('does nothing when date does not match any entry', async () => {
    const storedEntries = [
      { weight: 180, date: '2026-02-13T10:00:00Z', note: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(storedEntries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.deleteEntry('2020-01-01T00:00:00Z');
    });

    expect(result.current.entries).toHaveLength(1);
  });
});

// =============================================================================
// setGoal
// =============================================================================

describe('setGoal', () => {
  it('sets a goal weight', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.setGoal(170);
    });

    expect(result.current.goal).toBe(170);
  });

  it('clears goal when set to null', async () => {
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_goal') return Promise.resolve(170);
        return Promise.resolve([]);
      });
    });

    expect(result.current.goal).toBe(170);

    act(() => {
      result.current.setGoal(null);
    });

    expect(result.current.goal).toBeNull();
  });

  it('clears goal when set to undefined', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.setGoal(170);
    });
    act(() => {
      result.current.setGoal(undefined);
    });

    expect(result.current.goal).toBeNull();
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

  it('calculates average of entries within last 7 days', async () => {
    const now = new Date();
    const recentEntries = [
      { weight: 180, date: new Date(now.getTime() - 1 * 86400000).toISOString(), note: '' },
      { weight: 182, date: new Date(now.getTime() - 2 * 86400000).toISOString(), note: '' },
      { weight: 178, date: new Date(now.getTime() - 3 * 86400000).toISOString(), note: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(recentEntries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(3);
    const avg = result.current.getWeeklyAverage();
    expect(avg).toBe(180); // (180+182+178)/3 = 180
  });

  it('ignores entries older than 7 days', async () => {
    const now = new Date();
    const entries = [
      { weight: 180, date: new Date(now.getTime() - 1 * 86400000).toISOString(), note: '' },
      { weight: 200, date: new Date(now.getTime() - 14 * 86400000).toISOString(), note: '' },
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(entries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(2);
    const avg = result.current.getWeeklyAverage();
    expect(avg).toBe(180); // Only the recent entry
  });
});

// =============================================================================
// getMonthlyTrend
// =============================================================================

describe('getMonthlyTrend', () => {
  it('returns empty for no entries', async () => {
    const { result } = await renderAndInit();
    expect(result.current.getMonthlyTrend()).toEqual([]);
  });

  it('returns 4 weeks of data', async () => {
    const now = new Date();
    const entries = Array.from({ length: 28 }, (_, i) => ({
      weight: 180 - i * 0.1,
      date: new Date(now.getTime() - i * 86400000).toISOString(),
      note: '',
    }));
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(entries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries.length).toBeGreaterThan(0);
    const trend = result.current.getMonthlyTrend();
    expect(trend).toHaveLength(4);
    expect(trend[0].week).toBe(1);
    expect(trend[3].week).toBe(4);
  });
});

// =============================================================================
// getTotalChange
// =============================================================================

describe('getTotalChange', () => {
  it('returns no change for empty entries', async () => {
    const { result } = await renderAndInit();

    const total = result.current.getTotalChange();
    expect(total.change).toBe(0);
    expect(total.direction).toBe('none');
    expect(total.startWeight).toBeNull();
    expect(total.currentWeight).toBeNull();
  });

  it('returns no change for single entry', async () => {
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history')
          return Promise.resolve([{ weight: 180, date: '2026-02-13T10:00:00Z', note: '' }]);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(1);
    const total = result.current.getTotalChange();
    expect(total.change).toBe(0);
    expect(total.direction).toBe('none');
    expect(total.startWeight).toBe(180);
    expect(total.currentWeight).toBe(180);
  });

  it('detects downward change', async () => {
    const entries = [
      { weight: 175, date: '2026-02-13T10:00:00Z', note: '' }, // newest
      { weight: 180, date: '2026-02-01T10:00:00Z', note: '' }, // oldest
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(entries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(2);
    const total = result.current.getTotalChange();
    expect(total.change).toBe(5);
    expect(total.direction).toBe('down');
    expect(total.startWeight).toBe(180);
    expect(total.currentWeight).toBe(175);
  });

  it('detects upward change', async () => {
    const entries = [
      { weight: 185, date: '2026-02-13T10:00:00Z', note: '' }, // newest
      { weight: 180, date: '2026-02-01T10:00:00Z', note: '' }, // oldest
    ];
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_history') return Promise.resolve(entries);
        return Promise.resolve(null);
      });
    });

    expect(result.current.entries).toHaveLength(2);
    const total = result.current.getTotalChange();
    expect(total.change).toBe(5);
    expect(total.direction).toBe('up');
  });
});

// =============================================================================
// Data persistence
// =============================================================================

describe('data persistence', () => {
  it('calls setEncryptedItem when entries change', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.addEntry(180);
    });

    await waitFor(() => {
      expect(mockSetEncryptedItem).toHaveBeenCalledWith(
        '@vibefit_weight_history',
        expect.any(Array),
      );
    }, WAIT_OPTIONS);
  });

  it('calls setEncryptedItem when goal changes', async () => {
    const { result } = await renderAndInit();

    act(() => {
      result.current.setGoal(170);
    });

    await waitFor(() => {
      expect(mockSetEncryptedItem).toHaveBeenCalledWith('@vibefit_weight_goal', 170);
    }, WAIT_OPTIONS);
  });

  it('calls removeEncryptedItem when goal is cleared', async () => {
    const { result } = await renderAndInit(() => {
      mockGetEncryptedItem.mockImplementation((key: string) => {
        if (key === '@vibefit_weight_goal') return Promise.resolve(170);
        return Promise.resolve([]);
      });
    });

    expect(result.current.goal).toBe(170);

    act(() => {
      result.current.setGoal(null);
    });

    await waitFor(() => {
      expect(mockRemoveEncryptedItem).toHaveBeenCalledWith('@vibefit_weight_goal');
    }, WAIT_OPTIONS);
  });
});
