import { trackEvent } from './analytics';
import { trackStartup } from './performanceMonitor';

const startupStartedAt = Date.now();
const checkpoints = new Set<string>();
let interactiveRecorded = false;

export function recordStartupCheckpoint(
  checkpoint: string,
  metadata: Record<string, unknown> = {}
): number | null {
  if (checkpoints.has(checkpoint)) {
    return null;
  }

  checkpoints.add(checkpoint);
  const duration = Date.now() - startupStartedAt;

  trackEvent('performance', 'startup_checkpoint', {
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

  trackStartup(duration);
  trackEvent('performance', 'app_interactive', {
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
}
