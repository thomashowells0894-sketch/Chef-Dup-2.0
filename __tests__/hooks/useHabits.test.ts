/**
 * Tests for useHabits hook.
 *
 * The hook uses:
 * - AsyncStorage (mocked in jest.setup.ts)
 * - date-fns (format, subDays)
 * - lib/validation (safeJSONParse, isValidArray, isValidObject)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';

import useHabits from '../../hooks/useHabits';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

// =============================================================================
// Initial state
// =============================================================================

describe('initial state', () => {
  it('starts with empty habits and loading true', () => {
    const { result } = renderHook(() => useHabits());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.habits).toEqual([]);
  });

  it('sets loading false after initialization', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('loads existing habits from AsyncStorage', async () => {
    const storedHabits = [
      {
        id: 'abc123',
        name: 'Drink Water',
        emoji: '\u2705',
        color: '#00D4FF',
        frequency: 'daily',
        customDays: [],
        targetPerDay: 1,
        createdAt: '2026-02-01T00:00:00Z',
        archived: false,
      },
    ];
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@vibefit_habits') return Promise.resolve(JSON.stringify(storedHabits));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useHabits());
    await waitFor(() => {
      expect(result.current.habits).toHaveLength(1);
      expect(result.current.habits[0].name).toBe('Drink Water');
    });
  });
});

// =============================================================================
// addHabit
// =============================================================================

describe('addHabit', () => {
  it('adds a habit with default values', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success: boolean = false;
    act(() => {
      success = result.current.addHabit({ name: 'Meditate' });
    });

    expect(success).toBe(true);
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].name).toBe('Meditate');
    expect(result.current.habits[0].frequency).toBe('daily');
    expect(result.current.habits[0].targetPerDay).toBe(1);
    expect(result.current.habits[0].archived).toBe(false);
  });

  it('adds a habit with custom frequency and target', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({
        name: 'Gym',
        frequency: 'weekdays',
        targetPerDay: 1,
        emoji: '\uD83D\uDCAA',
        color: '#FF0000',
      });
    });

    expect(result.current.habits[0].frequency).toBe('weekdays');
    expect(result.current.habits[0].emoji).toBe('\uD83D\uDCAA');
    expect(result.current.habits[0].color).toBe('#FF0000');
  });

  it('adds habit with custom days', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({
        name: 'Piano',
        frequency: 'custom',
        customDays: [1, 3, 5],
      });
    });

    expect(result.current.habits[0].customDays).toEqual([1, 3, 5]);
  });

  it('returns false when limit of 20 habits reached', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Add 20 habits
    for (let i = 0; i < 20; i++) {
      act(() => {
        result.current.addHabit({ name: `Habit ${i}` });
      });
    }
    expect(result.current.habits).toHaveLength(20);

    // 21st should fail
    let success: boolean = true;
    act(() => {
      success = result.current.addHabit({ name: 'One too many' });
    });
    expect(success).toBe(false);
    expect(result.current.habits).toHaveLength(20);
  });

  it('generates a unique ID for each habit', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'A' });
    });
    act(() => {
      result.current.addHabit({ name: 'B' });
    });

    expect(result.current.habits[0].id).not.toBe(result.current.habits[1].id);
  });
});

// =============================================================================
// editHabit
// =============================================================================

describe('editHabit', () => {
  it('edits an existing habit', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Run' });
    });

    const id = result.current.habits[0].id;

    act(() => {
      result.current.editHabit(id, { name: 'Sprint' });
    });

    expect(result.current.habits[0].name).toBe('Sprint');
  });
});

// =============================================================================
// deleteHabit
// =============================================================================

describe('deleteHabit', () => {
  it('removes a habit by ID', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'A' });
    });
    act(() => {
      result.current.addHabit({ name: 'B' });
    });

    const idToDelete = result.current.habits[0].id;

    act(() => {
      result.current.deleteHabit(idToDelete);
    });

    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].name).toBe('B');
  });
});

// =============================================================================
// archiveHabit
// =============================================================================

describe('archiveHabit', () => {
  it('toggles archived status', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Walk' });
    });

    const id = result.current.habits[0].id;
    expect(result.current.habits[0].archived).toBe(false);

    act(() => {
      result.current.archiveHabit(id);
    });
    expect(result.current.habits[0].archived).toBe(true);

    act(() => {
      result.current.archiveHabit(id);
    });
    expect(result.current.habits[0].archived).toBe(false);
  });
});

// =============================================================================
// toggleCompletion
// =============================================================================

describe('toggleCompletion', () => {
  it('increments completion count', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Read' });
    });
    const id = result.current.habits[0].id;

    act(() => {
      result.current.toggleCompletion(id);
    });

    const today = format(new Date(), 'yyyy-MM-dd');
    expect(result.current.getCompletionForDate(id, today)).toBe(1);
  });

  it('resets to 0 when toggled past target', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Read', targetPerDay: 1 });
    });
    const id = result.current.habits[0].id;

    // Toggle to 1
    act(() => { result.current.toggleCompletion(id); });
    // Toggle again should reset to 0
    act(() => { result.current.toggleCompletion(id); });

    const today = format(new Date(), 'yyyy-MM-dd');
    expect(result.current.getCompletionForDate(id, today)).toBe(0);
  });

  it('supports multi-target habits', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Water', targetPerDay: 3 });
    });
    const id = result.current.habits[0].id;

    act(() => { result.current.toggleCompletion(id); }); // 1
    act(() => { result.current.toggleCompletion(id); }); // 2

    const today = format(new Date(), 'yyyy-MM-dd');
    expect(result.current.getCompletionForDate(id, today)).toBe(2);
  });

  it('does nothing for unknown habit ID', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should not throw
    act(() => {
      result.current.toggleCompletion('nonexistent');
    });
  });

  it('allows setting completion for specific date', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Log' });
    });
    const id = result.current.habits[0].id;

    act(() => {
      result.current.toggleCompletion(id, '2026-02-10');
    });

    expect(result.current.getCompletionForDate(id, '2026-02-10')).toBe(1);
  });
});

// =============================================================================
// getStreak
// =============================================================================

describe('getStreak', () => {
  it('returns 0 for unknown habit', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getStreak('unknown')).toBe(0);
  });

  it('counts consecutive completed days', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Run' });
    });
    const id = result.current.habits[0].id;

    // Complete today and yesterday
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    act(() => { result.current.toggleCompletion(id, today); });
    act(() => { result.current.toggleCompletion(id, yesterday); });

    expect(result.current.getStreak(id)).toBe(2);
  });

  it('breaks streak on missed day', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Run' });
    });
    const id = result.current.habits[0].id;

    // Complete today and 2 days ago (skip yesterday)
    const today = format(new Date(), 'yyyy-MM-dd');
    const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');

    act(() => { result.current.toggleCompletion(id, today); });
    act(() => { result.current.toggleCompletion(id, twoDaysAgo); });

    expect(result.current.getStreak(id)).toBe(1); // only today
  });

  it('allows streak to start from yesterday if today is not completed', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Run' });
    });
    const id = result.current.habits[0].id;

    // Only yesterday completed, not today
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    act(() => { result.current.toggleCompletion(id, yesterday); });

    // Streak should be 0 because today (day 0) is not completed and i>0 breaks
    // Actually looking at the code: i=0 (today) is not completed, count=0, doesn't break because i>0 is false
    // i=1 (yesterday) is completed, count=1, then... wait, the code says:
    // if count >= target: streak++; else if i > 0: break;
    // For i=0: count=0, target=1, not >= so else: i>0 is false, continue
    // For i=1: count=1, target=1, yes >= so streak=1
    // But then the streak continues checking...
    // Actually that's right: streak=1 if yesterday complete and today incomplete
    expect(result.current.getStreak(id)).toBe(1);
  });
});

// =============================================================================
// getBestStreak
// =============================================================================

describe('getBestStreak', () => {
  it('returns 0 for unknown habit', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getBestStreak('unknown')).toBe(0);
  });

  it('tracks best streak across history', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Read' });
    });
    const id = result.current.habits[0].id;

    // Complete 3 consecutive days ago
    for (let i = 3; i <= 5; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
      act(() => { result.current.toggleCompletion(id, day); });
    }

    // Then today only
    const today = format(new Date(), 'yyyy-MM-dd');
    act(() => { result.current.toggleCompletion(id, today); });

    // Best streak should be 3 (days 3,4,5)
    expect(result.current.getBestStreak(id)).toBe(3);
  });
});

// =============================================================================
// getActiveHabitsForDay
// =============================================================================

describe('getActiveHabitsForDay', () => {
  it('returns daily habits every day', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Daily', frequency: 'daily' });
    });

    // Check a Monday
    const active = result.current.getActiveHabitsForDay('2026-02-09'); // Monday
    expect(active).toHaveLength(1);
  });

  it('returns weekday habits only on weekdays', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Work', frequency: 'weekdays' });
    });

    // Monday
    const monday = result.current.getActiveHabitsForDay('2026-02-09');
    expect(monday).toHaveLength(1);

    // Saturday
    const saturday = result.current.getActiveHabitsForDay('2026-02-14');
    expect(saturday).toHaveLength(0);
  });

  it('returns weekend habits only on weekends', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Relax', frequency: 'weekends' });
    });

    const saturday = result.current.getActiveHabitsForDay('2026-02-14');
    expect(saturday).toHaveLength(1);

    const monday = result.current.getActiveHabitsForDay('2026-02-09');
    expect(monday).toHaveLength(0);
  });

  it('filters out archived habits', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Active' });
    });
    act(() => {
      result.current.addHabit({ name: 'Archived' });
    });

    const archivedId = result.current.habits[1].id;
    act(() => {
      result.current.archiveHabit(archivedId);
    });

    const active = result.current.getActiveHabitsForDay();
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('Active');
  });

  it('filters custom day habits to matching days', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({
        name: 'Custom',
        frequency: 'custom',
        customDays: [1, 3, 5], // Mon, Wed, Fri
      });
    });

    const monday = result.current.getActiveHabitsForDay('2026-02-09'); // Monday
    expect(monday).toHaveLength(1);

    const tuesday = result.current.getActiveHabitsForDay('2026-02-10'); // Tuesday
    expect(tuesday).toHaveLength(0);
  });
});

// =============================================================================
// getTodayProgress
// =============================================================================

describe('getTodayProgress', () => {
  it('returns 0 when no habits exist', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const progress = result.current.getTodayProgress();
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(0);
    expect(progress.percentage).toBe(0);
  });

  it('calculates correct progress', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'A' });
    });
    act(() => {
      result.current.addHabit({ name: 'B' });
    });

    const idA = result.current.habits[0].id;

    // Complete only habit A
    act(() => { result.current.toggleCompletion(idA); });

    const progress = result.current.getTodayProgress();
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.percentage).toBe(50);
  });
});

// =============================================================================
// getWeeklyGrid
// =============================================================================

describe('getWeeklyGrid', () => {
  it('returns 7 entries for the last week', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Read' });
    });

    const id = result.current.habits[0].id;
    const grid = result.current.getWeeklyGrid(id);

    expect(grid).toHaveLength(7);
    expect(grid[0].dayLabel).toBeDefined();
    expect(grid[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('shows completions in grid data', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Read', targetPerDay: 2 });
    });

    const id = result.current.habits[0].id;
    const today = format(new Date(), 'yyyy-MM-dd');

    act(() => { result.current.toggleCompletion(id, today); });

    const grid = result.current.getWeeklyGrid(id);
    const todayEntry = grid.find(g => g.date === today);
    expect(todayEntry!.completed).toBe(1);
    expect(todayEntry!.target).toBe(2);
  });
});

// =============================================================================
// Persistence
// =============================================================================

describe('persistence', () => {
  it('saves habits to AsyncStorage on change', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Save Test' });
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@vibefit_habits',
        expect.any(String),
      );
    });
  });

  it('saves completions to AsyncStorage on toggle', async () => {
    const { result } = renderHook(() => useHabits());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addHabit({ name: 'Log' });
    });

    const id = result.current.habits[0].id;
    act(() => { result.current.toggleCompletion(id); });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@vibefit_habits_log',
        expect.any(String),
      );
    });
  });
});
