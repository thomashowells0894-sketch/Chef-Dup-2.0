describe('startupTrace', () => {
  const mockTrackEvent = jest.fn();
  const mockTrackStartup = jest.fn();

  function loadStartupTrace() {
    jest.resetModules();
    jest.doMock('../../lib/analytics', () => ({
      trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    }));
    jest.doMock('../../lib/performanceMonitor', () => ({
      trackStartup: (...args: unknown[]) => mockTrackStartup(...args),
    }));

    return require('../../lib/startupTrace');
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('records app interactive once and tracks startup duration', () => {
    const startupTrace = loadStartupTrace();

    jest.advanceTimersByTime(850);
    expect(startupTrace.recordAppInteractive({ screen: 'dashboard' })).toBe(850);
    expect(startupTrace.recordAppInteractive({ screen: 'dashboard' })).toBeNull();

    expect(mockTrackStartup).toHaveBeenCalledWith(850);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'performance',
      'app_interactive',
      expect.objectContaining({
        value: 850,
        metadata: expect.objectContaining({
          durationMs: 850,
          screen: 'dashboard',
        }),
      })
    );
  });

  it('records home usable, first search, and first add metrics only once', () => {
    const startupTrace = loadStartupTrace();

    jest.advanceTimersByTime(1200);
    expect(startupTrace.recordHomeUsable({ screen: 'dashboard' })).toBe(1200);

    jest.advanceTimersByTime(600);
    expect(startupTrace.recordFirstSearchFromStartup({ meal: 'breakfast' })).toBe(1800);

    jest.advanceTimersByTime(450);
    expect(startupTrace.recordFirstFoodAddFromStartup({ mealType: 'breakfast' })).toBe(2250);

    expect(startupTrace.recordHomeUsable()).toBeNull();
    expect(startupTrace.recordFirstSearchFromStartup()).toBeNull();
    expect(startupTrace.recordFirstFoodAddFromStartup()).toBeNull();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'performance',
      'home_usable',
      expect.objectContaining({
        value: 1200,
      })
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'performance',
      'first_search_from_startup',
      expect.objectContaining({
        value: 1800,
      })
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'performance',
      'first_food_add_from_startup',
      expect.objectContaining({
        value: 2250,
      })
    );
  });

  it('resets all startup markers for subsequent sessions', () => {
    const startupTrace = loadStartupTrace();

    jest.advanceTimersByTime(300);
    startupTrace.recordHomeUsable();
    startupTrace.recordFirstSearchFromStartup();
    startupTrace.recordFirstFoodAddFromStartup();
    startupTrace.recordAppInteractive();

    startupTrace.resetStartupTraceForTests();

    expect(startupTrace.recordHomeUsable()).toBe(300);
    expect(startupTrace.recordFirstSearchFromStartup()).toBe(300);
    expect(startupTrace.recordFirstFoodAddFromStartup()).toBe(300);
    expect(startupTrace.recordAppInteractive()).toBe(300);
  });
});
