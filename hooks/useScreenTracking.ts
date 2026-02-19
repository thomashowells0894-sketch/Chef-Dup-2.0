import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { trackScreenView, trackTiming } from '../lib/analytics';

/**
 * Automatic screen tracking hook.
 *
 * - Calls `trackScreenView` on mount (after interactions settle) to avoid
 *   blocking animations.
 * - Measures and reports screen load time via `trackTiming` using the delta
 *   between component mount and `InteractionManager.runAfterInteractions`.
 *
 * Usage:
 * ```ts
 * export default function DiaryScreen() {
 *   useScreenTracking('Diary');
 *   // ...
 * }
 * ```
 */
export function useScreenTracking(screenName: string): void {
  const mountTime = useRef<number>(Date.now());

  useEffect(() => {
    // Reset mount time on each mount (strict mode re-mounts)
    mountTime.current = Date.now();

    const handle = InteractionManager.runAfterInteractions(() => {
      // Track the screen view after animations complete
      trackScreenView(screenName);

      // Report how long the screen took to become interactive
      trackTiming('performance', `screen_load.${screenName}`, mountTime.current);
    });

    return () => {
      handle.cancel();
    };
  }, [screenName]);
}
