const startupStartedAt = Date.now();
const checkpoints = new Set<string>();
let interactiveRecorded = false;
let homeUsableRecorded = false;
let firstSearchRecorded = false;
let firstFoodAddRecorded = false;

function trackStartupEvent(
  category: string,
  name: string,
  payload: Record<string, unknown>
): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { trackEvent } = require('./analytics');
  trackEvent(category, name, payload);
}

function trackStartupDuration(duration: number): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { trackStartup } = require('./performanceMonitor');
  trackStartup(duration);
}

export function recordStartupCheckpoint(
  checkpoint: string,
  metadata: Record<string, unknown> = {}
): number | null {
  if (checkpoints.has(checkpoint)) {
    return null;
  }

  checkpoints.add(checkpoint);
  const duration = Date.now() - startupStartedAt;

  trackStartupEvent('performance', 'startup_checkpoint', {
    value: duration,
    metadata: {
      checkpoint,
      durationMs: duration,
      ...metadata,
    },
  });

  return duration;
}

export function recordAppInteractive(
  metadata: Record<string, unknown> = {}
): number | null {
  if (interactiveRecorded) {
    return null;
  }

  interactiveRecorded = true;
  const duration = Date.now() - startupStartedAt;

  trackStartupDuration(duration);
  trackStartupEvent('performance', 'app_interactive', {
    value: duration,
    metadata: {
      durationMs: duration,
      ...metadata,
    },
  });

  return duration;
}

export function recordHomeUsable(
  metadata: Record<string, unknown> = {}
): number | null {
  if (homeUsableRecorded) {
    return null;
  }

  homeUsableRecorded = true;
  const duration = Date.now() - startupStartedAt;

  trackStartupEvent('performance', 'home_usable', {
    value: duration,
    metadata: {
      durationMs: duration,
      ...metadata,
    },
  });

  return duration;
}

export function recordFirstSearchFromStartup(
  metadata: Record<string, unknown> = {}
): number | null {
  if (firstSearchRecorded) {
    return null;
  }

  firstSearchRecorded = true;
  const duration = Date.now() - startupStartedAt;

  trackStartupEvent('performance', 'first_search_from_startup', {
    value: duration,
    metadata: {
      durationMs: duration,
      ...metadata,
    },
  });

  return duration;
}

export function recordFirstFoodAddFromStartup(
  metadata: Record<string, unknown> = {}
): number | null {
  if (firstFoodAddRecorded) {
    return null;
  }

  firstFoodAddRecorded = true;
  const duration = Date.now() - startupStartedAt;

  trackStartupEvent('performance', 'first_food_add_from_startup', {
    value: duration,
    metadata: {
      durationMs: duration,
      ...metadata,
    },
  });

  return duration;
}

export function resetStartupTraceForTests(): void {
  checkpoints.clear();
  interactiveRecorded = false;
  homeUsableRecorded = false;
  firstSearchRecorded = false;
  firstFoodAddRecorded = false;
}
