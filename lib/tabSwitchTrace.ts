import { InteractionManager } from 'react-native';
import { trackEvent } from './analytics';

interface PendingTabSwitch {
  routeName: string;
  startedAt: number;
}

let pendingTabSwitch: PendingTabSwitch | null = null;

export function startTabSwitchTrace(routeName: string): void {
  pendingTabSwitch = {
    routeName,
    startedAt: Date.now(),
  };
}

export function recordTabScreenReady(
  routeName: string,
  metadata: Record<string, unknown> = {}
): number | null {
  if (!pendingTabSwitch || pendingTabSwitch.routeName !== routeName) {
    return null;
  }

  const duration = Date.now() - pendingTabSwitch.startedAt;
  pendingTabSwitch = null;

  trackEvent('performance', 'tab_switch_ready', {
    value: duration,
    label: routeName,
    metadata: {
      routeName,
      durationMs: duration,
      ...metadata,
    },
  });

  return duration;
}

export function scheduleTabScreenReady(
  routeName: string,
  metadata: Record<string, unknown> = {}
): void {
  InteractionManager.runAfterInteractions(() => {
    recordTabScreenReady(routeName, metadata);
  });
}

export function resetTabSwitchTraceForTests(): void {
  pendingTabSwitch = null;
}
