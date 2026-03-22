import type { ActivationStage } from './activationTracker';
import type { ProfileHydrationState } from './profileState';

interface DeferredPromptInput {
  hasUser: boolean;
  delayElapsed: boolean;
  activationStage: ActivationStage;
  foodLogCount: number;
  hasCompletedOnboarding: boolean;
  profileHydrationState: ProfileHydrationState;
}

export function shouldAllowDeferredStartupPrompts({
  hasUser,
  delayElapsed,
  activationStage,
  foodLogCount,
  hasCompletedOnboarding,
  profileHydrationState,
}: DeferredPromptInput): boolean {
  if (!hasUser || !delayElapsed) {
    return false;
  }

  const hasReachedFirstValue =
    foodLogCount > 0 ||
    activationStage !== 'first_meal' ||
    (hasCompletedOnboarding && profileHydrationState === 'complete');

  return hasReachedFirstValue;
}
